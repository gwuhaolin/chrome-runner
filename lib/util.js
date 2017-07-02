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
  const now = new Date();
  const tmpDirPath = path.resolve(os.tmpdir(), `chrome_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}__${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}__${String(Math.random()).substring(2)}`);
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
