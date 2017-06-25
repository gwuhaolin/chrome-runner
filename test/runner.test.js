'use strict';
const assert = require('assert');
const { delay } = require('../util');
const Runner = require('../index');

process.on('unhandledRejection', console.trace);

describe('Runner', function () {

  it('launch() then kill()', async function () {
    const runner = new Runner({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
      ]
    });
    await runner.launch();
    assert.notEqual(runner.chromeProcess, null);
    return await runner.kill();
  });

  it('restart chrome when chrome exit unexpected', async function () {
    this.timeout(8000);
    const runner = new Runner({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
      ]
    });
    await runner.launch();
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    await runner.kill();
  });

});
