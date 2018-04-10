'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { Runner, launch, launchWithoutNoise, launchWithHeadless } = require('../index');

process.on('unhandledRejection', console.trace);

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

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

  it('use Runner to launch() then kill() and ensure chromeDataDirPrepared event emit', async function () {
    const runner = new Runner({
      chromeFlags: ['--headless', '--disable-gpu']
    });
    runner.once('chromeDataDirPrepared', console.log);
    await runner.launch();
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

  it('set chromeDataDir option', async function () {
    const chromeDataDir = path.resolve(__dirname, '../chrome_runner_test');
    const runner = await launchWithHeadless({
      chromeDataDir,
    });
    assert.equal(runner.chromeDataDir, chromeDataDir);
    return await runner.kill();
  });

  it('restart chrome when chrome exit unexpected', async function () {
    this.timeout(8000);
    const runner = await launchWithHeadless();
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    process.kill(runner.chromeProcess.pid);
    await delay(2000);
    await runner.kill();
  });


  it('after kill() all tmp file should be removed', async function () {
    const runner = await launchWithHeadless();
    const chromeDataDir = runner.chromeDataDir;
    assert.notEqual(runner.chromeProcess, null);
    await runner.kill();

    // TODO windows removed tmp dir failed
    if (process.platform !== 'win32') {
      assert.equal(fs.existsSync(chromeDataDir), false, `tmp dir ${chromeDataDir} should be removed`);
    }
  });

  it('emit chromeDataDirRemoved after kill', function (done) {
    launchWithHeadless().then(async (runner) => {

      // TODO windows removed tmp dir failed
      if (process.platform !== 'win32') {
        runner.once('chromeDataDirRemoved', (chromeDataDir) => {
          console.log(chromeDataDir);
          done();
        });
      } else {
        done();
      }
      await runner.kill();
    });
  });

  it('should emit chromeAlive event then chromeRestarted event when chrome exit unexpected', function (done) {
    launchWithHeadless().then((runner) => {
      let chromeDead;
      runner.once('chromeDead', async () => {
        chromeDead = true;
      });
      runner.once('chromeRestarted', async () => {
        if (chromeDead) {
          await runner.kill();
          done();
        }
      });
      process.kill(runner.chromeProcess.pid);
    });
  });

  it('set monitorInterval should emit chromeAlive event interval', function (done) {
    this.timeout(7000);
    launchWithHeadless({
      monitorInterval: 1000,
    }).then((runner) => {
      let times = 0;
      runner.on('chromeAlive', async () => {
        times++;
        if (times >= 5) {
          await runner.kill();
          done();
        }
      });
    });
  });

  it('set disableLogging option', async function () {
    const runner = await launchWithHeadless({
      disableLogging: true,
    });
    assert.equal(fs.existsSync(path.join(runner.chromeDataDir, 'chrome-err.log')), false);
    assert.equal(fs.existsSync(path.join(runner.chromeDataDir, 'chrome-out.log')), false);
    return await runner.kill();
  });

});
