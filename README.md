# ![Lambdasync logo](logo.png?raw=true "Lambdasync logo")

A tool to scaffold, deploy and update JSON APIs on [AWS Lambda](https://aws.amazon.com/lambda/details/) from the command line.

# ![Demo](demo.gif?raw=true "Usage demo")

## Installation

`npm install lambdasync -g`


## Getting started

To use Lambdasync you will need an AWS Account, and credentials, check out the [official docs on how to get your credentials](http://goo.gl/aMbXsg) before you start.

To scaffold a new project run:

`lambdasync new project-name`

This will prompt you for all information needed to talk to the AWS APIs. See [Prompt params](#prompt) for more information.

 The `new` command will create 3 files in a new folder with your project name.

 A `lambdasync.json` that holds lambdasync meta data for your project.

 A basic `package.json` file similar to what you would get from running `npm init`.

 And lastly an `index.js` file that contains your handler function.


## Handler functions

The handler function is what you actually deploy. `lambdasync new` has scaffolded a basic hello world type handler for you, that is ready to deploy:

```
exports.handler = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    message: "Everything is awesome"
  })
};
```

The handler function should always be in the `./index.js` file and export a CommonJS module called `handler` like in the example, anything else you are free to change.

More information on how to write a Lambda handler function can be found in [the official docs](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html).

### Tutorial
A basic REST API handler function can be found in [this tutorial](http://fredrik.anderzon.se/2016/11/25/create-a-rest-api-on-aws-lambda-using-lambdasync/), with [example code here](https://github.com/fanderzon/lambdasync-example).

## Deploy

To deploy your API run:

`lambdasync`

inside your project folder.

Your project folder will be zipped and deployed to lambda, if this is the first deploy an API Gateway will be setup automatically to add an endpoint to your function.

When the deploy is done, you will get a URL where you can call your API.


## Adding secrets
`lambdasync secret DB_HOST=127.0.0.1`

Secrets can be stored to avoid putting sensitive data in your source code. Secrets are stored as AWS Lambda environment variables and can be accessed through `process.env` in your handler functions.
```
exports.handler = function(event, context, callback) {
  const {DB_HOST} = process.env.DB_HOST;
  // ... do something with DB_HOST
};
```

A secret can be removed with:

`lambdasync secret remove DB_HOST`


## Config

`lambdasync config`
Will print out configuration info about your Lambda function, such as function ARN (Amazon Resource Name), Runtime (Node version), when the function was last modified, etc.

Lambdasync will also let you change the config for `description`, `timeout` and `memory` by running the config command with the key and new value:

```
lambdasync config timeout=3
lambdasync config memory=192
lambdasync config description='Example project for lambdasync'
```

## Calling AWS SDK methods
A hidden feature of lambdasync that is at least very useful during development for exploring the AWS SDK is the ability to call any [AWS SDK](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html) method from the command line.

`lambdasync -c AWSClass.methodName arg1=value1 arg2='value2 with spaces'`

or to use a real, working example:

`lambdasync -c Lambda.getFunction FunctionName=lambdaArn`

If a value matches any key in the `lambdasync.json` file (like `lambdaArn` does) that value will be substituted with the value from the json file, otherwise it will be treated as text. If your value contains spaces add single quotes around it.


## <a name="prompt"></a>Prompt params

When setting up a new project lambdasync will prompt you for:

* Profile name
* AWS Credentials
* Function name
* AWS region

The `profileName` is used as an alias for your credentials that are saved in the `~/.aws` directory in a format compatible with official [AWS CLI](https://aws.amazon.com/cli/) profiles. That means no sensitive information is saved in the repository and you can reuse profiles between Lambdasync and AWS CLI.

How to get your access key and secret key is [covered here](http://goo.gl/aMbXsg).

 If you only plan to use Lambdasync with one AWS account leave it at the default profile name: `lambdasync`. Otherwise having a `work` profile and a `personal` profile can be a good idea.

 The function name will be automatically taken from the package.json, but you have a chance to change it.

 AWS region will be saved to your profile as a default preference for future Lambdasync functions.
