'use strict';
const { join } = require('path');
const { execSync } = require('child_process');
const { createServer } = require('http');
const net = require('net');
const mkdirp = require('mkdirp');


function makeUnixTmpDir() {
  return execSync('mktemp -d -t chrome_runner.XXXXXXX').toString().trim();
}

function makeWin32TmpDir() {
  const winTmpPath = process.env.TEMP || process.env.TMP ||
    (process.env.SystemRoot || process.env.windir) + '\\temp';
  const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
  const tmpdir = join(winTmpPath, 'chrome_runner.' + randomNumber);

  mkdirp.sync(tmpdir);
  return tmpdir;
}


/**
 * Return a random, unused port.
 */
function getRandomPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0);
    server.once('listening', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.once('error', reject);
  });
}

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function makeTmpDir() {
  switch (process.platform) {
    case 'darwin':
    case 'linux':
      return makeUnixTmpDir();
    case 'win32':
      return makeWin32TmpDir();
    default:
      throw new Error(`Platform ${process.platform} is not supported`);
  }
}

function cleanupNetClient(client) {
  if (client) {
    client.removeAllListeners();
    client.end();
    client.destroy();
    client.unref();
  }
}

function isPortOpen(port) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(port);
    client.once('error', err => {
      cleanupNetClient(client);
      reject(err);
    });
    client.once('connect', () => {
      cleanupNetClient(client);
      resolve();
    });
  });
}

module.exports = {
  delay,
  makeTmpDir,
  getRandomPort,
  isPortOpen,
}
