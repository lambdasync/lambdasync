'use strict';
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

const {readFile, writeFile} = require('./file');

const TEST_DIR = path.join(process.cwd(), 'file-module-tests');
const MISSING_DIR = path.join(process.cwd(), 'make-believe');
const TEST_FILE_EXISTING = path.join(TEST_DIR, 'i-am-here.txt');
const TEST_FILE_CREATE = path.join(TEST_DIR, 'create-me.txt');


beforeEach(() => {
  fs.mkdirSync(TEST_DIR);
  fs.writeFile(TEST_FILE_EXISTING, '1');
});

afterEach(done => {
  rimraf(TEST_DIR, () => rimraf(MISSING_DIR, done));

});

describe('file', () => {
  describe('readFile', () => {
    it('expect reading missing file to fail', () => {
      readFile(TEST_FILE_CREATE)
        .catch(err => expect(err).toBeTruthy());
    });
    it('expect reading existing file to work', () => {
      readFile(TEST_FILE_EXISTING)
        .then(res => expect(res).toBe('1'));
    });
    it('expect transforms to be applied', () => {
      readFile(TEST_FILE_EXISTING, Number)
        .then(res => expect(res).toBe(1));
    });
    it('expect failed transforms to reject', () => {
      readFile(TEST_FILE_EXISTING, content => JSON.parse('{'+content))
        .catch(err => expect(err).toBeTruthy());
    });
  });
  describe('writeFile', () => {
    const Ash = {klaatu: 'verata', neck: 'tie'};
    it('expect writing file to succeed', () => {
      writeFile(TEST_FILE_CREATE, Ash)
        .then(res => expect(res).toBeTruthy());
    });
    it('expect transforms to be applied', () => {
      writeFile(TEST_FILE_CREATE, Ash, JSON.stringify)
        .then(res => expect(JSON.parse(res)).toEqual(Ash));
    });
    it('expect writing file to missing directory to succeed', () => {
      writeFile(path.join(MISSING_DIR, 'a-file.json'), Ash, JSON.stringify)
        .then(res => expect(JSON.parse(res)).toEqual(Ash));
    });
    it('expect failed transforms to reject', () => {
      const Williams = Object.assign({}, Ash);
      Williams.Williams = Williams;
      writeFile(TEST_FILE_CREATE, undefined, JSON.stringify)
        .catch(err => expect(err).toBeTruthy());
    });
  });
});
