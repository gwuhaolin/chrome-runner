'use strict';
const fs = require('fs');
const EventEmitter = require('events');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const findChrome = require('chrome-finder');
const onDeath = require('death');
const { DEFAULT_FLAGS } = require('./flags');
const { getRandomPort, makeTmpDir, isPortOpen } = require('./util');

class Runner extends EventEmitter {

  /**
   * a Runner to launch a chrome
   * @param opts
   * port: {number} launch chrome listen on debug port, default will random a free port to use
   * chromePath: {string} chrome executable full path, default will automatic find a path according to your system. If no executable chrome find, a Error('no chrome installations found') will throw
   * chromeFlags: {Array<string>} flags pass to chrome when start chrome, all flags can be find [here](http://peter.sh/experiments/chromium-command-line-switches/)
   * startupPage: {string} open page when chrome start, default is about:blank
   * shouldRestartChrome: {boole} logger to handle log from chrome-runner, interface like console, default use console
   * monitorInterval: {number} in ms, monitor chrome is alive interval, default is 500ms
   * chromeDataDir: {string} chrome data dir, default will create one in system tmp
   *
   * a Runner will emit some events in it's lifecycle:
   * chromeAlive(port): when monitor detect chrome is alive
   * chromeDead(code, signal): after monitor detect chrome is not alive
   * chromeRestarted(): after chrome unexpected exited then runner restart it
   * chromeDataDirPrepared(chromeDataDir): after runner create data dir for chrome
   * chromeDataDirRemoved(chromeDataDir): after remove successful create data dir for chrome
   */
  constructor(opts) {
    super();
    const {
      port,
      chromePath = findChrome(),
      chromeFlags = [],
      startupPage = 'about:blank',
      shouldRestartChrome = true,
      monitorInterval = 500,
      chromeDataDir = makeTmpDir(),
      disableLogging = false,
    } = opts;
    this.port = port;
    this.chromePath = chromePath;
    this.chromeFlags = chromeFlags;
    this.startupPage = startupPage;
    this.shouldRestartChrome = shouldRestartChrome;
    this.monitorInterval = monitorInterval;
    this.chromeDataDir = chromeDataDir;
    this.disableLogging = disableLogging;

    this.chromeProcess = undefined;
    this.chromeOutFd = undefined;
    this.chromeErrorFd = undefined;
    this.pidFd = undefined;
  }

  async launch() {
    // pidFd is last file create by prepareChromeDataDir()
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
          this.destroyChromeDataDir();
          resolve();
        });

        try {
          this.shouldRestartChrome = false;
          this.chromeProcess.kill();
          delete this.chromeProcess;
          clearInterval(this.monitorTimmer);
          delete this.monitorTimmer;
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
      // https://chromium.googlesource.com/chromium/src/+/master/docs/linux_suid_sandbox_development.md
      // https://github.com/gwuhaolin/chrome-pool/issues/4
      flags.push('--no-sandbox');
    }

    flags.push(...this.chromeFlags);
    flags.push(this.startupPage);

    return flags;
  }

  // exec chrome, resolves when debugger is ready
  async spawn() {
    if (!this.port) {
      this.port = await getRandomPort();
    }
    const chromeProcess = childProcess.spawn(this.chromePath, this.flags, {
      detached: true,
      stdio: this.disableLogging ? ['ignore', 'ignore', 'ignore'] : ['ignore', this.chromeOutFd, this.chromeErrorFd]
    });
    this.chromeProcess = chromeProcess;
    this.monitorChromeIsAlive();
    this.handleProcessEvent();
    fs.writeFileSync(this.pidFd, chromeProcess.pid.toString());
    return new Promise((resolve) => {
      this.once('chromeAlive', resolve);
    });
  }

  monitorChromeIsAlive() {
    clearInterval(this.monitorTimmer);
    this.monitorTimmer = setInterval(async () => {
      const alive = await isPortOpen(this.port);
      if (alive) {
        this.emit('chromeAlive', this.port);
      } else {
        this.emit('chromeDead');
        if (this.shouldRestartChrome) {
          if (this.chromeProcess) {
            this.chromeProcess.kill();
          }
          await this.spawn();
          this.emit('chromeRestarted');
        }
      }
    }, this.monitorInterval);
  }

  handleProcessEvent() {
    if (typeof this.offDeath === 'function') {
      this.offDeath();
    }
    // kill chrome and release resource on main app exit
    this.offDeath = onDeath(async () => {
      await this.kill();
      process.exit();
    });
  }

  prepareChromeDataDir() {
    // support set chromeDataDir option
    if (!fs.existsSync(this.chromeDataDir)) {
      fs.mkdirSync(this.chromeDataDir);
    }
    if (!this.disableLogging) {
      this.chromeOutFd = fs.openSync(`${this.chromeDataDir}/chrome-out.log`, 'a');
      this.chromeErrorFd = fs.openSync(`${this.chromeDataDir}/chrome-err.log`, 'a');
    }
    this.pidFd = fs.openSync(`${this.chromeDataDir}/chrome.pid`, 'w');
    this.emit('chromeDataDirPrepared', this.chromeDataDir);
  }

  destroyChromeDataDir() {
    try {
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

      if (this.chromeDataDir) {
        rimraf.sync(this.chromeDataDir);
        this.emit('chromeDataDirRemoved', this.chromeDataDir);
      }
    } catch (err) {
      // sometimes windows rimraf failed
    }
  }
}

module.exports = Runner;
