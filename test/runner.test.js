'use strict';
const assert = require('assert');
const { delay } = require('../util');
const { launch, launchWithoutNoise, launchWithHeadless } = require('../index');

process.on('unhandledRejection', console.trace);

describe('Runner', function () {
  this.timeout(5000);

  it('launch() then kill()', async function () {
    const runner = await launch({
      port: 4577,
    });
    assert.notEqual(runner.chromeProcess, null);
    assert.equal(runner.port, 4577);
    return await runner.kill();
  });

  it('launchWithoutNoise() then kill()', async function () {
    const runner = await launchWithoutNoise();
    assert.notEqual(runner.chromeProcess, null);
    return await runner.kill();
  });

  it('launchWithHeadless() then kill()', async function () {
    const runner = await launchWithHeadless();
    assert.notEqual(runner.chromeProcess, null);
    return await runner.kill();
  });

  it('restart chrome when chrome exit unexpected', async function () {
    this.timeout(8000);
    const runner = await launch();
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
