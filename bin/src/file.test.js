'use strict';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const {readFile, writeFile} = require('./file');

const TEST_DIR = path.join(process.cwd(), 'file-module-tests');
const TEST_FILE_EXISTING = path.join(TEST_DIR, 'i-am-here.txt');
const TEST_FILE_CREATE = path.join(TEST_DIR, 'create-me.txt');


beforeEach(() => {
  fs.mkdirSync(TEST_DIR);
  fs.writeFile(TEST_FILE_EXISTING, '1');
});

afterEach(done => {
  rimraf(TEST_DIR, done);
});

describe('file', () => {
  describe('readFile', () => {
    it('expect reading missing file to fail', () => {
      readFile(TEST_FILE_CREATE)
        .catch(e => expect(e).toBeTruthY());
    });
  });
});
