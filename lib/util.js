'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const { createServer } = require('http');
const net = require('net');

/**
 * Return a random, unused port in system.
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

/**
 * make a tmp dir in OS tmp dir and return it's path
 * @returns {string} tmp dir path
 */
function makeTmpDir() {
  const tmpDirPath = path.resolve(os.tmpdir(), 'chrome_runner_' + Date.now());
  fs.mkdirSync(tmpDirPath);
  return tmpDirPath;
}

/**
 * check port is listening
 * @param port
 * @returns {Promise}
 */
function isPortOpen(port) {

  const cleanupNetClient = function (client) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  return new Promise((resolve) => {
    const client = net.createConnection(port);
    client.once('error', () => {
      cleanupNetClient(client);
      resolve(false);
    });
    client.once('connect', () => {
      cleanupNetClient(client);
      resolve(true);
    });
  });
}

module.exports = {
  makeTmpDir,
  getRandomPort,
  isPortOpen,
}
