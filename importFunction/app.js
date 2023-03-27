/*
  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

'use strict'

const AWS = require('aws-sdk');
const Papa = require('papaparse');
AWS.config.region = process.env.AWS_REGION;
const s3 = new AWS.S3();

const docClient = new AWS.DynamoDB.DocumentClient();


// The Lambda handler
exports.handler = async (event) => {
  const ddbTable = process.env.PRODUCT_TABLE;
  console.log(JSON.stringify(event, null, 2));
  console.log('DDB table: ', ddbTable);

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        console.log('Incoming record: ', record);

        // Get original text from object in incoming event
        const originalText = await s3.getObject({
          Bucket: event.Records[0].s3.bucket.name,
          Key: event.Records[0].s3.object.key
        }).promise();

        // Upload JSON to DynamoDB
        const jsonData = Papa.parse(originalText.Body.toString('utf-8'), { header: true, delimiter: "," }).data;

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
