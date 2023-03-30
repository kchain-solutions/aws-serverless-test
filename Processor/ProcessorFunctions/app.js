'use strict';

const AWS = require('aws-sdk');
const Papa = require('papaparse');
AWS.config.region = process.env.AWS_REGION;

const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();

const DDB_TABLE = process.env.PRODUCT_TABLE;
const SCHEMA_TYPE = Object.freeze({
  product: 1,
  stock: 2,
});

// The Lambda handler
exports.processorHandler = async (event) => {
  console.log('Processor function running...');
  await Promise.all(event.Records.map(processRecord));
};

const processRecord = async (record) => {
  try {
    console.log('Dynamo table name: ', DDB_TABLE);
    console.log('Bucket name event: ', record.s3.bucket.name);
    console.log('Bucket key event: ', record.s3.object.key);

    const originalText = await s3.getObject({
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    }).promise();

    const parsed = Papa.parse(originalText.Body.toString('utf-8'), {
      header: true,
      delimiter: ',',
      skipEmptyLines: true,
    });

    const fields = parsed.meta.fields.map(str => str.toLowerCase());
    console.log('Fields ', fields);

    if (fields.includes('sku') && fields.includes('name') && fields.includes('price')) {
      await ddbLoader(parsed.data, SCHEMA_TYPE.product);
    } else if (fields.includes('sku') && fields.includes('quantity')) {
      await ddbLoader(parsed.data, SCHEMA_TYPE.stock);
    } else {
      console.error('Invalid CSV format for ', record.s3.object.key);
    }
  } catch (err) {
    console.error(err);
  }
};

const ddbLoader = async (data, schemaType) => {
  const updateRequests = data.map((item) => {
    return schemaType === SCHEMA_TYPE.product
      ? createProductsRequest(item)
      : createStocksRequest(item);
  });
  const promises = updateRequests.map(req => docClient.update(req).promise());
  try {
    await Promise.all(promises.map((promise, index) =>
      promise.catch((error) => {
        error.index = index;
      })
    )).catch((error) => {
      console.error(`Promise at index ${error.index} failed:`, error.message);
    });
    console.log('Success upload for ', schemaType === SCHEMA_TYPE.product ? 'Product' : 'Stock');
  } catch (error) {
    console.error('Error during batch update operation:', error);
  }
};

const createProductsRequest = (item) => {
  return {
    TableName: DDB_TABLE,
    Key: { sku: item.sku },
    UpdateExpression: 'set #name = :name, #price = :price, #updated = :updated',
    ExpressionAttributeNames: {
      '#name': 'name',
      '#price': 'price',
      '#updated': 'updated',
    },
    ExpressionAttributeValues: {
      ':name': item.name,
      ':price': item.price,
      ':updated': Date.now(),
    },
  };
};

const createStocksRequest = (item) => {
  return {
    TableName: DDB_TABLE,
    Key: { sku: item.sku },
    UpdateExpression: 'set #quantity = :quantity, #updated = :updated',
    ExpressionAttributeNames: {
      '#quantity': 'quantity',
      '#updated': 'updated',
    },
    ExpressionAttributeValues: {
      ':quantity': item.quantity,
      ':updated': Date.now(),
    },
  };
};
