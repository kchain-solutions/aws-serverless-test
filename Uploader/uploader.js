const AWS = require('aws-sdk');
const fs = require('fs');
require('dotenv').config();

AWS.config.update({ region: 'eu-west-3' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const storageBucketName = process.env.STORAGE_BUCKET_NAME;
const productPath = './csv/products.csv';
const stockPath = './csv/stocks.csv';

const uploadFileToS3 = async (filePath, keyPrefix) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        const params = {
            Bucket: storageBucketName,
            Key: `${keyPrefix}_${Date.now()}.csv`,
            Body: fileContent,
        };

        await s3.upload(params).promise();
        console.log(`Successfully uploaded ${keyPrefix} file to S3 bucket.`);
    } catch (err) {
        console.error(`Error uploading ${keyPrefix} file: `, err);
    }
};

(async () => {
    await Promise.all([
        uploadFileToS3(productPath, 'products'),
        uploadFileToS3(stockPath, 'stocks'),
    ]);
})();