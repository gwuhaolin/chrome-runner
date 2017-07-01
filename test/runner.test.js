'use strict';
const assert = require('assert');
const fs = require('fs');
const { delay } = require('../lib/util');
const { launch, launchWithoutNoise, launchWithHeadless } = require('../index');

process.on('unhandledRejection', console.trace);

describe('Runner', function () {
  this.timeout(5000);

  it('set and get port', async function () {
    this.timeout(10000);
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

  it('after kill() all tmp file should be removed', async function () {
    const runner = await launch();
    const chromeDataDir = runner.chromeDataDir;
    assert.notEqual(runner.chromeProcess, null);
    await runner.kill();
    assert.equal(fs.existsSync(chromeDataDir), false, `tmp dir ${chromeDataDir} should be removed`);
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
