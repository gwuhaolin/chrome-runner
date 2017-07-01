'use strict';
const assert = require('assert');
const { delay } = require('../lib/util');
const { launch, launchWithoutNoise, launchWithHeadless } = require('../index');

process.on('unhandledRejection', console.trace);

describe('Runner', function () {

  it('set and get port', async function () {
    const runner = await launchWithHeadless({
      port: 4577,
    });
    assert.notEqual(runner.chromeProcess, null);
    assert.equal(runner.port, 4577);
    return await runner.kill();
  });

  it.skip('launch() then kill()', async function () {
    const runner = await launch();
    assert.notEqual(runner.chromeProcess, null);
    return await runner.kill();
  });

  it.skip('launchWithoutNoise() then kill()', async function () {
    const runner = await launchWithoutNoise();
    assert.notEqual(runner.chromeProcess, null);
    assert.notEqual(runner.port, null);
    return await runner.kill();
  });

  it('launchWithHeadless() then kill()', async function () {
    const runner = await launchWithHeadless();
    assert.notEqual(runner.chromeProcess, null);
    assert.notEqual(runner.port, null);
    return await runner.kill();
  });

  it('restart chrome when chrome exit unexpected', async function () {
    this.timeout(8000);
    const runner = await launchWithHeadless();
    await runner.launch();
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    await runner.kill();
  });

  it('set logger option', async function () {
    const runner = await launchWithHeadless({
      logger: console
    });
    await runner.launch();
    await runner.kill();
  });

});
