# Lambdasync

A tool to scaffold, deploy and update [AWS Lambda](https://aws.amazon.com/lambda/details/) functions from the command line.

*This is currently in the "proof of concept"/"useful for me, personally" stage. API and functionality is subject to change.*

## Installation

  `npm install lambdasync`

## Set up
Run `lambdasync init` in the root folder of your project. It will prompt you for:
```
'profileName', // Name of local aws-cli profile to save to, default lambdasync
'lambdaName', // Name of lambda function on AWS
'accessKey', // AWS Access Key ID AKIAIOSFODNN7EXAMPLE
'secretKey', // AWS Secret Access Key  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
'region', // us-east-1
```

Lambdasync will save `profileName`, `lambdaName` and `region` locally in your project directory, and set up an [AWS CLI](https://aws.amazon.com/cli/) compatible profile in your `~/.aws` directory

## Deploy

Run `lambdasync` in the root folder of your project.

That's all you need. Your folder will be zipped and deployed to lambda.
