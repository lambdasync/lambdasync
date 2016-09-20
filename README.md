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

Lambdasync will save `profileName`, `lambdaName` and `region` locally in your project directory.

The `profileName` is used as an alias for your credentials, that are saved in the `~/.aws` directory in a format compatible with official [AWS CLI](https://aws.amazon.com/cli/) profiles. That means no sensitive information is saved in the repository.

 If you only plan to use Lambdasync with one AWS account leave it at the default profile name: `lambdasync`. Otherwise having a `work` profile and a `personal` profile can be a good idea.

## Add a handler function
Lambda is set up to look for your entry function in `index.js`, your file should export a CommonJS module called `handler` like this:

```
exports.handler = (event, context, callback) => {
  callback(null, {
    statusCode: 200,
    message: "Everything is awesome"
  })
};
```

More information on how to write a Lambda handler function can be found in [the official docs](http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html).

## Deploy

Run `lambdasync` in the root folder of your project.

That's all you need. Your folder will be zipped and deployed to lambda.

When the deploy is done, you will get a URL where you can call your API.
