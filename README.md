# Lambdasync

A tool to scaffold, deploy and update [AWS Lambda](https://aws.amazon.com/lambda/details/) functions from the command line.

## Installation

`npm install lambdasync`


## Add a handler function
To have something to deploy you need to first create an entry function in an `./index.js` file, your file should export a CommonJS module called `handler` like this:

```
exports.handler = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    message: "Everything is awesome"
  })
};
```

More information on how to write a Lambda handler function can be found in [the official docs](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html).


## Setup and deploy
To use Lambdasync you will need an AWS Account, and credentials, check out the [official docs on how to get your credentials](http://goo.gl/aMbXsg) before you start.

Run `lambdasync` in the root folder of your project. If this is the first time you run Lambdasync it will prompt you for:
```
'profileName', // Name of local aws-cli profile to save to, default lambdasync
'lambdaName', // Name of lambda function on AWS
'accessKey', // AWS Access Key ID AKIAIOSFODNN7EXAMPLE
'secretKey', // AWS Secret Access Key  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
'region', // us-east-1
```
The `profileName` is used as an alias for your credentials that are saved in the `~/.aws` directory in a format compatible with official [AWS CLI](https://aws.amazon.com/cli/) profiles. That means no sensitive information is saved in the repository and you can reuse profiles between Lambdasync and AWS CLI.

 If you only plan to use Lambdasync with one AWS account leave it at the default profile name: `lambdasync`. Otherwise having a `work` profile and a `personal` profile can be a good idea.

Next, your project folder will be zipped and deployed to lambda, if this is the first deploy an API Gateway will be setup automatically to add an endpoint to your function.

When the deploy is done, you will get a URL where you can call your API.


## Calling AWS SDK methods
A hidden feature of lambdasync that is at least very useful during development for exploring the AWS SDK is the ability to call any [AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html) method from the command line.

`lambdasync -c AWSClass.methodName arg1=value1 arg2='value2 with spaces'`

or to use a real, working example:

`lambdasync -c Lambda.getFunction FunctionName=lambdaArn`

If a value matches any key in the `lambdasync.json` file (like `lambdaArn` does) that value will be substituted with the value from the json file, otherwise it will be treated as text. If your value contains spaces add single quotes around it.


## Future plans

Lambdasync is currently useful for quick prototyping, but doesn't help you with authentication, or environment variables that you would probably need for production. Both of those are near the top of the todo list.
