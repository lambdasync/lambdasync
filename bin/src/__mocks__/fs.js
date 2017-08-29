const path = require('path');

const fs = jest.genMockFromModule('fs');

let mockFiles = Object.create(null);

function __setMockFiles(newMockFiles = {}) {
  mockFiles = newMockFiles
}

function readFileSync(path) {
  if (mockFiles[path]) {
    return mockFiles[path];
  }
  throw(new Error(`ENOENT: no such file or directory, open ${path}`));
}

function writeFileSync(path, content) {
  mockFiles[path] = content;
  return;
}

function readFile(path, cb) {
  if (mockFiles[path]) {
    return cb(null, mockFiles[path]);
  }
  return cb(new Error(`ENOENT: no such file or directory, open ${path}`))
}

fs.__setMockFiles = __setMockFiles;
fs.readFileSync = readFileSync;
fs.writeFileSync = writeFileSync;
fs.readFile = readFile;

module.exports = fs;
