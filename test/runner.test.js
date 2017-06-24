'use strict';
const assert = require('assert');
const { delay } = require('../util');
const Runner = require('../index');

process.on('unhandledRejection', console.trace);

describe('Runner', () => {

  it('launch() kill()', async () => {
    const runner = new Runner();
    await runner.launch();
    assert.notEqual(runner.chrome, undefined);
    await runner.kill();
  });

  it('restartUnexpectedChrome', async function () {
    this.timeout(30000);
    const runner = new Runner();
    await runner.launch();
    await delay(20000);
    await runner.kill();
  });

});
