'use strict';
const fs = require('fs');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const findChrome = require('chrome-finder');
const { DEFAULT_FLAGS } = require('./flags');
const { getRandomPort, makeTmpDir, delay, isPortOpen } = require('./util');

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
    this.chromePath = opts.chromePath || process.env.CHROME_PATH;
    this.chromeFlags = opts.chromeFlags || [];
    this.startupPage = opts.startupPage || 'about:blank';
    this.logger = opts.logger || console;

    this.shouldRestartChrome = true;
    this.chromeProcess = undefined;
    this.chromeDataDir = undefined;
    this.chromeOutFile = undefined;
    this.chromeErrorFile = undefined;
    this.pidFile = undefined;
  }

  async launch() {
    if (!this.pidFile) {
      this.prepareChromeDataDir();
    }

    if (!this.chromePath) {
      this.chromePath = findChrome();
    }

    await this.spawn();
    return this;
  }

  kill() {
    return new Promise((resolve, reject) => {
      if (this.chromeProcess) {
        this.chromeProcess.on('close', () => {
          try {
            this.destroyChromeDataDir();
          } catch (err) {
            this.logger.error(`remove chrome tmp data dir failed: ${err}`);
          }
          resolve();
        });

        this.logger.info('killing all chrome');
        try {
          this.shouldRestartChrome = false;
          this.chromeProcess.kill();
          delete this.chromeProcess;
        } catch (err) {
          reject(err);
        }
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

  // exec chrome
  async spawn() {
    if (this.chromeProcess) {
      this.logger.info(`chrome already running with pid ${this.chromeProcess.pid}.`);
      return;
    }

    if (!this.port) {
      this.port = await getRandomPort();
    }
    const chromeProcess = childProcess.spawn(this.chromePath, this.flags, {
      detached: true,
      stdio: ['ignore', this.chromeOutFile, this.chromeErrorFile]
    });
    this.chromeProcess = chromeProcess;
    this.handleChromeUnexpectedExit();
    fs.writeFileSync(this.pidFile, chromeProcess.pid.toString());
    this.logger.info(`chrome running with pid ${chromeProcess.pid} on port ${this.port}.`);
    await this.waitDebugReady();
  }

  // restart chrome when chrome unexpected exit
  handleChromeUnexpectedExit() {
    if (this.chromeProcess) {
      this.chromeProcess.on('close', async () => {
        if (this.shouldRestartChrome) {
          delete this.chromeProcess;
          setTimeout(this.spawn.bind(this), 1000);
          this.logger.warn('chrome exit unexpected, restart it');
        }
      })
    }
  }

  // resolves when debugger is ready, rejects after retry 10 polls
  async waitDebugReady() {
    this.logger.info('wait until chrome ready');
    let retryTimes = 0;
    while (retryTimes <= 10) {
      retryTimes++;
      if (await isPortOpen(this.port)) {
        return;
      }
      await delay(500);
    }
    throw Error(`can't connect to chrome`);
  }

  prepareChromeDataDir() {
    this.chromeDataDir = makeTmpDir();
    this.chromeOutFile = fs.openSync(`${this.chromeDataDir}/chrome-out.log`, 'a');
    this.chromeErrorFile = fs.openSync(`${this.chromeDataDir}/chrome-err.log`, 'a');
    this.pidFile = fs.openSync(`${this.chromeDataDir}/chrome.pid`, 'a');
    this.logger.info(`created chrome data dir ${this.chromeDataDir}`);
  }

  destroyChromeDataDir() {
    if (this.chromeOutFile) {
      fs.closeSync(this.chromeOutFile);
      delete this.chromeOutFile;
    }

    if (this.chromeErrorFile) {
      fs.closeSync(this.chromeErrorFile);
      delete this.chromeErrorFile;
    }

    if (this.pidFile) {
      fs.closeSync(this.pidFile);
      delete this.pidFile;
    }

    rimraf.sync(this.chromeDataDir);
    delete this.chromeDataDir;
  }
}

module.exports = Runner;
