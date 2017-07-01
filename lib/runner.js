'use strict';
const fs = require('fs');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const chromeFinder = require('./chrome-finder');
const { DEFAULT_FLAGS } = require('./flags');
const { getRandomPort, makeTmpDir, delay, isPortOpen } = require('./util');

const { spawn, execSync } = childProcess;
const isWindows = process.platform === 'win32';
const SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32']);

class Runner {

  /**
   * a Runner to launch a chrome
   * @param opts
   * opts.port: {number} launch chrome listen on debug port, default will random a free port to use
   * opts.chromePath: {string} chrome executable full path, default will automatic find a path according to your system. If no executable chrome find, will use env CHROME_PATH as executable full path. If all of the above way can't get a path a Error('no chrome installations found') will throw
   * opts.chromeFlags: {Array<string>} flags pass to chrome when start chrome, all flags can be find [here](http://peter.sh/experiments/chromium-command-line-switches/)
   * opts.startupPage: {string} open page when chrome start, default is about:blank
   * opts.logger: {console} logger to handle log from chrome-runner, interface like console, default use console
   */
  constructor(opts) {
    this.port = opts.port;
    this.chromePath = opts.chromePath;
    this.chromeFlags = opts.chromeFlags || [];
    this.startupPage = opts.startupPage || 'about:blank';
    this.logger = opts.logger || console;

    this.tmpDirandPidFileReady = false;
    this.chromeProcess = undefined;
    this.chromeDataDir = undefined;
    this.chromeOutFile = undefined;
    this.chromeErrorFile = undefined;
    this.pidFile = undefined;
    this.restartUnexpectedChrome = true;
  }

  async launch() {
    if (this.port) {
      if (await this.isDebugReady()) {
        return;
      } else {
        this.logger.warn(`no chrome found on port ${this.port}, launching a new Chrome.`);
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

        this.logger.info('killing all Chrome Instances');
        try {
          if (isWindows) {
            execSync(`taskkill /pid ${this.chromeProcess.pid} /T /F`);
          } else {
            process.kill(-this.chromeProcess.pid);
          }
        } catch (err) {
          this.logger.error(`chrome could not be killed ${err.message}`);
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
    flags.push(this.startupPage);

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

    this.logger.info(`created chrome data dir ${this.chromeDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  async spawn() {
    if (this.chromeProcess) {
      this.logger.info(`chrome already running with pid ${this.chromeProcess.pid}.`);
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
    this.logger.info(`chrome running with pid ${chromeProcess.pid} on port ${this.port}.`);

    await this.waitUntilReady();
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
          delete this.chromeProcess;
          setTimeout(this.spawn.bind(this), 1000);
          this.logger.warn('chrome exit unexpected, restart it');
        }
      })
    }
  }

  async isDebugReady() {
    return await isPortOpen(this.port);
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady() {
    this.logger.info('wait until chrome ready');
    return new Promise((resolve, reject) => {
      let retries = 0;
      const poll = async () => {
        retries++;
        const ready = await this.isDebugReady();
        if (ready) {
          this.logger.info('chrome already now');
          resolve();
        } else {
          if (retries > 10) {
            return reject(`can't connect to chrome`);
          }
          await delay(500);
          poll();
        }
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
