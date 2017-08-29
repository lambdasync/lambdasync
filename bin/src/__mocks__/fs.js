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

fs.__setMockFiles = __setMockFiles;
fs.readFileSync = readFileSync;
fs.writeFileSync = writeFileSync;

module.exports = fs;
