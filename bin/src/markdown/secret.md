## secrets (environment variables)
=====================================
{{vars}}


# Usage:
AWS Lambda lets you set secrets that are available to your Lambda function through `process.env`.

**Set secrets with:**

`lambdasync secret set db=production`

This will then be available as `process.env.db` to your Lambda function.

**Remove secrets with:**

`lambdasync secret remove db`
