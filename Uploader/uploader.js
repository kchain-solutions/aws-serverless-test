const AWS = require("aws-sdk");
const fs = require("fs");
require('dotenv').config();
AWS.config.update({ region: 'eu-west-3' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const productBucketName = process.env.PRODUCTS_BUCKET_NAME;
const stockBucketName = process.env.STOCKS_BUCKET_NAME;
const productPath = './csv/products.csv';
const stockPath = './csv/stocks.csv';
const productKey = "products_" + Date.now() + ".csv";
const stockKey = "stocks_" + Date.now() + ".csv";

const productFile = fs.readFileSync(productPath);
const stockFile = fs.readFileSync(stockPath);

const productParams = {
    Bucket: productBucketName,
    Key: productKey,
    Body: productFile
};
const stockParams = {
    Bucket: stockBucketName,
    Key: stockKey,
    Body: stockFile
};

s3.upload(productParams, function (err, data) {
    if (err) {
        console.log("Error uploading file: ", err);
    } else {
        console.log("Successfully products file uploaded to S3 bucket.");
    }
});
s3.upload(stockParams, function (err, data) {
    if (err) {
        console.log("Error uploading file: ", err);
    } else {
        console.log("Successfully stocks uploaded file to S3 bucket.");
    }
});
