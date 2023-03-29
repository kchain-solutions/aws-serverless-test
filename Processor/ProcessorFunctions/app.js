'use strict'

const AWS = require('aws-sdk');
const Papa = require('papaparse');
AWS.config.region = process.env.AWS_REGION;

const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();

// The Lambda handler
exports.productHandler = async (event) => {
  const ddbTable = process.env.PRODUCT_TABLE;
  console.log('Product function running...');
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        console.log('Dynamo table name: ', ddbTable);
        console.log('Bucket name event: ', record.s3.bucket.name);
        console.log('Bucket key event: ', record.s3.object.key);
        const originalText = await s3.getObject({
          Bucket: record.s3.bucket.name,
          Key: record.s3.object.key
        }).promise();
        const parsed = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: ",", skipEmptyLines: true });
        const fields = parsed.meta.fields.map(str => str.toLowerCase());
        console.log("Fields ", fields);
        if (fields.indexOf("sku") !== -1 && fields.indexOf("name") !== -1 && fields.indexOf("price") !== -1)
          await ddbLoader(parsed.data, ddbTable);
        else
          console.error("Invalid CSV format for ", record.s3.object.key);
      } catch (err) {
        console.error(err)
      }
    })
  )
}

exports.stockHandler = async (event) => {
  const ddbTable = process.env.STOCK_TABLE;
  console.log('Stock function running...');
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        console.log('Dynamo table name: ', ddbTable);
        console.log('Bucket name event: ', record.s3.bucket.name);
        console.log('Bucket key event: ', record.s3.object.key);
        const originalText = await s3.getObject({
          Bucket: record.s3.bucket.name,
          Key: record.s3.object.key
        }).promise();
        const parsed = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: ",", skipEmptyLines: true });
        const fields = parsed.meta.fields.map(str => str.toLowerCase());
        if (fields.indexOf("sku") !== -1 && fields.indexOf("quantity") !== -1)
          await ddbLoader(parsed.data, ddbTable);
        else
          console.error("Invalid CSV format for ", record.s3.object.key);
      } catch (err) {
        console.error(err)
      }
    })
  )
}

// Load JSON data to DynamoDB table
const ddbLoader = async (data, ddbTable) => {
  // Separate into batches for upload
  let batches = []
  const BATCH_SIZE = 25
  while (data.length > 0) {
    batches.push(data.splice(0, BATCH_SIZE))
  }
  console.log(`Total batches: ${batches.length}`)
  let batchCount = 0

  await Promise.all(
    batches.map(async (item_data) => {
      const params = {
        RequestItems: {}
      }
      params.RequestItems[ddbTable] = []
      item_data.forEach(item => {
        for (let key of Object.keys(item)) {
          if (item[key] === '')
            delete item[key]
        }
        params.RequestItems[ddbTable].push({
          PutRequest: {
            Item: {
              ...item,
              updated: Date.now()
            }
          }
        })
      })
      try {
        batchCount++;
        const result = await docClient.batchWrite(params).promise();
        console.log('Batch: ', batchCount, ' Success: ', result);
      } catch (err) {
        console.error('Batch: ', batchCount, ' Error: ', err)
      }
    })
  )
}
