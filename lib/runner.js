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
   * opts.shouldRestartChrome: {boole} logger to handle log from chrome-runner, interface like console, default use console
   */
  constructor(opts) {
    const {
      port,
      chromePath = findChrome(),
      chromeFlags = [],
      startupPage = 'about:blank',
      logger = console,
      shouldRestartChrome = true
    } = opts;
    this.port = port;
    this.chromePath = chromePath;
    this.chromeFlags = chromeFlags;
    this.startupPage = startupPage;
    this.logger = logger;
    this.shouldRestartChrome = shouldRestartChrome;

    this.chromeProcess = undefined;
    this.chromeDataDir = undefined;
    this.chromeOutFd = undefined;
    this.chromeErrorFd = undefined;
    this.pidFd = undefined;
  }

  async launch() {
    if (!this.pidFd) {
      this.prepareChromeDataDir();
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
      stdio: ['ignore', this.chromeOutFd, this.chromeErrorFd]
    });
    this.chromeProcess = chromeProcess;
    this.handleChromeUnexpectedExit();
    fs.writeFileSync(this.pidFd, chromeProcess.pid.toString());
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
    this.chromeOutFd = fs.openSync(`${this.chromeDataDir}/chrome-out.log`, 'a');
    this.chromeErrorFd = fs.openSync(`${this.chromeDataDir}/chrome-err.log`, 'a');
    this.pidFd = fs.openSync(`${this.chromeDataDir}/chrome.pid`, 'w');
    this.logger.info(`created chrome data dir ${this.chromeDataDir}`);
  }

  destroyChromeDataDir() {
    if (this.chromeOutFd) {
      fs.closeSync(this.chromeOutFd);
      delete this.chromeOutFd;
    }

    if (this.chromeErrorFd) {
      fs.closeSync(this.chromeErrorFd);
      delete this.chromeErrorFd;
    }

    if (this.pidFd) {
      fs.closeSync(this.pidFd);
      delete this.pidFd;
    }

    rimraf.sync(this.chromeDataDir);
    delete this.chromeDataDir;
  }
}

module.exports = Runner;
