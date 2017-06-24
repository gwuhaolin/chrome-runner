'use strict';
const fs = require('fs');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const chromeFinder = require('./chrome-finder');
const DEFAULT_FLAGS = require('./flags');
const { getRandomPort, makeTmpDir, delay, isPortOpen } = require('./util');

const { spawn, execSync } = childProcess;
const isWindows = process.platform === 'win32';
const SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32']);

/**
 * chrome runner, a runner will launch a chrome
 */
class Runner {
  constructor(opts = {}) {
    this.tmpDirandPidFileReady = false;
    this.port = undefined;
    this.chrome = undefined;
    this.chromeDataDir = undefined;
    this.chromeOutFile = undefined;
    this.chromeErrorFile = undefined;
    this.pidFile = undefined;
    this.restartUnexpectedChrome = true;

    this.chromePath = opts.chromePath;
    this.chromeFlags = opts.chromeFlags || [];
  }

  async launch() {
    if (this.port) {
      try {
        return await this.isDebugReady();
      } catch (err) {
        console.log('ChromeRunner', `No debugging port found on port ${this.port}, launching a new Chrome.`);
      }
    }

    if (!this.tmpDirandPidFileReady) {
      this.prepare();
    }

    if (!this.chromePath) {
      const installations = await chromeFinder[process.platform]();
      if (installations.length === 0) {
        throw new Error('No Chrome Installations Found');
      }
      this.chromePath = installations[0];
    }

    await this.spawn(this.chromePath);
    return this;
  }

  kill() {
    this.restartUnexpectedChrome = false;
    return new Promise(resolve => {
      if (this.chrome) {
        this.chrome.on('close', () => {
          this.destroyTmp();
          resolve();
        });

        console.log('ChromeRunner', 'Killing all Chrome Instances');
        try {
          if (isWindows) {
            execSync(`taskkill /pid ${this.chrome.pid} /T /F`);
          } else {
            process.kill(-this.chrome.pid);
          }
        } catch (err) {
          console.error('ChromeRunner', `Chrome could not be killed ${err.message}`);
        }

        delete this.chrome;
      } else {
        // fail silently as we did not start chrome
        resolve();
      }
    });
  }

  get flags() {
    const flags = DEFAULT_FLAGS.concat([
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.chromeDataDir}`
    ]);

    if (process.platform === 'linux') {
      flags.push('--disable-setuid-sandbox');
    }

    flags.push(...this.chromeFlags);
    flags.push('about:blank');

    return flags;
  }

  prepare() {
    const platform = process.platform;
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      throw new Error(`Platform ${platform} is not supported`);
    }

    this.chromeDataDir = makeTmpDir();
    this.chromeOutFile = fs.openSync(`${this.chromeDataDir}/chrome-out.log`, 'a');
    this.chromeErrorFile = fs.openSync(`${this.chromeDataDir}/chrome-err.log`, 'a');
    this.pidFile = fs.openSync(`${this.chromeDataDir}/chrome.pid`, 'a');

    console.info('ChromeRunner', `Created chrome data dir ${this.chromeDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  async spawn() {
    if (this.chrome) {
      console.info('ChromeRunner', `Chrome already running with pid ${this.chrome.pid}.`);
      return this.chrome.pid;
    }

    if (!this.port) {
      this.port = await getRandomPort();
    }
    const chrome = spawn(this.chromePath, this.flags, {
      detached: true,
      stdio: ['ignore', this.chromeOutFile, this.chromeErrorFile]
    });
    this.chrome = chrome;
    this.handleSIGINT();
    this.handleChromeUnexpectedExit();
    fs.writeFileSync(this.pidFile, chrome.pid.toString());
    console.info('ChromeRunner', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);

    await this.waitUntilReady();
    return chrome.pid;
  }

  handleSIGINT() {
    process.on('SIGINT', async () => {
      await this.kill();
      process.exit(130);
    });
  }

  handleChromeUnexpectedExit() {
    if (this.chrome) {
      this.chrome.on('close', async () => {
        if (this.restartUnexpectedChrome) {
          console.warn('ChromeRunner', 'Chrome exit unexpected, restart it');
          delete this.chrome;
          await this.spawn();
        }
      })
    }
  }

  async isDebugReady() {
    return await isPortOpen(this.port);
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady() {
    console.info('ChromeRunner', 'Wait until chrome ready');
    return new Promise((resolve, reject) => {
      let retries = 0;
      const poll = () => {
        retries++;
        this.isDebugReady().then(() => {
          console.info('ChromeRunner', 'Chrome already now');
          resolve();
        }).catch(async (err) => {
          if (retries > 10) {
            return reject(err);
          }
          await delay(500);
          poll();
        });
      }
      poll();
    });
  }

  destroyTmp() {
    if (this.chromeOutFile) {
      fs.closeSync(this.chromeOutFile);
      delete this.chromeOutFile;
    }

    if (this.chromeErrorFile) {
      fs.closeSync(this.chromeErrorFile);
      delete this.chromeErrorFile;
    }

    rimraf.sync(this.chromeDataDir);
  }
}

module.exports = Runner;
