'use strict';
const fs = require('fs');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const chromeFinder = require('./chrome-finder');
const DEFAULT_FLAGS = require('./flags');
const { getRandomPort, makeTmpDir, delay, isPortOpen } = require('./util');

if (!global.logger) {
  global.logger = console;
}

const { spawn, execSync } = childProcess;
const isWindows = process.platform === 'win32';
const SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32']);

/**
 * chrome runner, a runner will launch a chrome
 */
class Runner {
  constructor(opts = {}) {
    this.tmpDirandPidFileReady = false;
    this.chromeProcess = undefined;
    this.chromeDataDir = undefined;
    this.chromeOutFile = undefined;
    this.chromeErrorFile = undefined;
    this.pidFile = undefined;
    this.restartUnexpectedChrome = true;

    this.port = opts.port;
    this.chromePath = opts.chromePath;
    this.chromeFlags = opts.chromeFlags || [];
  }

  async launch() {
    if (this.port) {
      try {
        return await this.isDebugReady();
      } catch (err) {
        global.logger.warn(`no chrome found on port ${this.port}, launching a new Chrome.`);
      }
    }

    if (!this.tmpDirandPidFileReady) {
      this.prepare();
    }

    if (!this.chromePath) {
      const installations = await chromeFinder[process.platform]();
      if (installations.length > 0) {
        this.chromePath = installations[0];
      } else {
        throw new Error('no chrome installations found');
      }
    }

    await this.spawn(this.chromePath);
    return this;
  }

  kill() {
    this.restartUnexpectedChrome = false;
    return new Promise(resolve => {
      if (this.chromeProcess) {
        this.chromeProcess.on('close', () => {
          this.destroyTmp();
          resolve();
        });

        global.logger.info('killing all Chrome Instances');
        try {
          if (isWindows) {
            execSync(`taskkill /pid ${this.chromeProcess.pid} /T /F`);
          } else {
            process.kill(-this.chromeProcess.pid);
          }
        } catch (err) {
          global.logger.error(`chrome could not be killed ${err.message}`);
        }

        delete this.chromeProcess;
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
      throw new Error(`platform ${platform} is not supported`);
    }

    this.chromeDataDir = makeTmpDir();
    this.chromeOutFile = fs.openSync(`${this.chromeDataDir}/chrome-out.log`, 'a');
    this.chromeErrorFile = fs.openSync(`${this.chromeDataDir}/chrome-err.log`, 'a');
    this.pidFile = fs.openSync(`${this.chromeDataDir}/chrome.pid`, 'a');

    global.logger.info(`created chrome data dir ${this.chromeDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  async spawn() {
    if (this.chromeProcess) {
      global.logger.info(`chrome already running with pid ${this.chromeProcess.pid}.`);
      return this.chromeProcess.pid;
    }

    if (!this.port) {
      this.port = await getRandomPort();
    }
    const chromeProcess = spawn(this.chromePath, this.flags, {
      detached: true,
      stdio: ['ignore', this.chromeOutFile, this.chromeErrorFile]
    });
    this.chromeProcess = chromeProcess;
    this.handleSIGINT();
    this.handleChromeUnexpectedExit();
    fs.writeFileSync(this.pidFile, chromeProcess.pid.toString());
    global.logger.info(`chrome running with pid ${chromeProcess.pid} on port ${this.port}.`);

    await this.waitUntilReady();
    return chromeProcess.pid;
  }

  handleSIGINT() {
    process.on('SIGINT', async () => {
      await this.kill();
      process.exit(130);
    });
  }

  handleChromeUnexpectedExit() {
    if (this.chromeProcess) {
      this.chromeProcess.on('close', async () => {
        if (this.restartUnexpectedChrome) {
          global.logger.warn('chrome exit unexpected, restart it');
          delete this.chromeProcess;
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
    global.logger.info('wait until chrome ready');
    return new Promise((resolve, reject) => {
      let retries = 0;
      const poll = () => {
        retries++;
        this.isDebugReady().then(() => {
          global.logger.info('chrome already now');
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
