'use strict';
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

function readFile(path, transform = input => input) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }
      try {
        return resolve(transform(data));
      } catch (err) {
        return reject(err);
      }
    });
  });
}

function writeFile(filePath, obj, transform = input => input.toString()) {
  return new Promise((resolve, reject) => {
    let content = '';
    try {
      content = transform(obj);
    } catch (err) {
      return reject(err);
    }

    // Make sure the path that we want to write to exists
    mkdirp(path.dirname(filePath), () => {
      fs.writeFile(filePath, content, 'utf8', err => {
        if (err) {
          return reject(err);
        }
        return resolve(content);
      });
    });
  });
}

module.exports = {
  readFile,
  writeFile
};
