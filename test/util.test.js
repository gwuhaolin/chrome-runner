'use strict';
const assert = require('assert');
const fs = require('fs');
const rimraf = require('rimraf');
const { getRandomPort, isPortOpen, makeTmpDir } = require('../lib/util');

describe('util', () => {

  it('getRandomPort', async () => {
    const port = await getRandomPort();
    assert.ok(Number.isInteger(port) && port > 0 && port <= 0xFFFF, 'Verify generated port number is valid integer');
  });

  it('isPortOpen', async () => {
    const open = await isPortOpen(1111);
    assert.equal(open, false);
  });

  it('makeTmpDir', () => {
    const tmpDirPath = makeTmpDir();
    assert.equal(fs.existsSync(tmpDirPath), true);
    fs.accessSync(tmpDirPath, fs.constants.W_OK);
    rimraf.sync(tmpDirPath);
    assert.equal(fs.existsSync(tmpDirPath), false);
  });
});
