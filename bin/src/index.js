#!/usr/bin/env node
const minimist = require('minimist');
const {getSettings} = require('./settings.js');
const init = require('./init.js');
const deploy = require('./deploy.js');
const {version} = require('../../package.json');
const {createApi, addResource, getResources, setupApiGateway, getIntegration} = require('./gateway');
const command = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

function handleCommand(command, settings) {
  if (command._[0] === 'init') {
    return init();
  }

  if (command.version) {
    console.log('lambdasync version: ' + version);
    return;
  }

  return deploy(settings);
}

console.log('lambdasync');
getSettings()
  .then(settings => {
    console.log('settings', settings);
    // getIntegration(settings);
    setupApiGateway({name: 'testing32', description: 'A test api', path: 'api'}, settings)

    // createApi(settings, {name: 'testing4', description: 'A test api'})
    //   .then(data => {
    //     console.log(data);
    //     getResources(settings, {restApiId: data.id})
    //       .then(data => {
    //         console.log('resources', data);
    //       })
    //       .catch(err => console.log(err));
    //   })
    //   .catch(err => console.log(err));

    // handleCommand(command, settings);
    // addResource(settings, {parentId: 'bbr7uhm60l', restApiId: '9pb8dnhivi', pathPart: 'myApi'})
    //   .then(data => console.log(data))
    //   .catch(err => console.log(err));
  });
