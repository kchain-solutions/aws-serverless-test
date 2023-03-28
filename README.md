# aws-serverless-test

## Solution design

## How to run the code

### Deploy 

### Upload CSV

### Call API

## Command
DOCKER_HOST=unix://$HOME/.docker/run/docker.sock sam local invoke -e ./lambda/lambda_event.json fileProcessorFunction
DOCKER_HOST=unix://$HOME/.docker/run/docker.sock sam local start-lambda

 sam local generate-event s3 put --bucket product.stock.test --key products.csv --region eu-west-3> lambda_event.json 


sam deploy --guided --capabilities CAPABILITY_NAMED_IAM