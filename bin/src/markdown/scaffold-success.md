A new folder `{{name}}` has been created for your project with these files:

`{{name}}/index.js`
`{{name}}/lambdasync.json`
`{{name}}/package.json`

Your project is ready to deploy by entering the folder and running the lambdasync command:
```
cd {{name}}
lambdasync
```

The `index.js` file contains your handler function. This is where you change how your API will respond to requests.

The `lambdasync.json` file contains your lambdasync settings. You should never have to touch this file manually.

The `package.json` is a base template close to what you would get from running `npm init`.
