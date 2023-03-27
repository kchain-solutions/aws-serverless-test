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
        const jsonData = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: "," }).data;
        await ddbLoader(jsonData, ddbTable)
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
        const jsonData = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: "," }).data;
        await ddbLoader(jsonData, ddbTable)
      } catch (err) {
        console.error(err)
      }
    })
  )
}

const eventHandler = async (event, ddbTable) => {
  await Promise.all(
    event.Records.map(async (record) => {
      try {
        console.log('Dynamo table name: ', ddbTable);
        console.log('Bucket name event: ', record.s3.bucket.name);
        console.log('Bucket key event: ', record.s3.object.key);
        const s3 = new AWS.S3();
        const originalText = await s3.getObject({
          Bucket: record.s3.bucket.name,
          Key: record.s3.object.key
        }).promise();
        console.log("original text ", originalText);
        const jsonData = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: "," }).data;
        console.log("JsonData length ", jsonData.length);
        await ddbLoader(jsonData, ddbTable)
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

  // Save each batch
  await Promise.all(

    batches.map(async (item_data) => {

      // Set up the params object for the DDB call
      const params = {
        RequestItems: {}
      }
      params.RequestItems[ddbTable] = []

      item_data.forEach(item => {
        for (let key of Object.keys(item)) {
          // An AttributeValue may not contain an empty string
          if (item[key] === '')
            delete item[key]
        }

        // Build params
        params.RequestItems[ddbTable].push({
          PutRequest: {
            Item: {
              ...item,
              updated: Date.now()
            }
          }
        })
      })
      // Push to DynamoDB in batches
      try {
        batchCount++
        console.log('Trying batch: ', batchCount)
        const result = await docClient.batchWrite(params).promise()
        console.log('Success: ', result)
      } catch (err) {
        console.error('Error: ', err)
      }
    })
  )
}
