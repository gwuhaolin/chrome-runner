[![Npm Package](https://img.shields.io/npm/v/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)
[![Build Status](https://img.shields.io/travis/gwuhaolin/chrome-runner.svg?style=flat-square)](https://travis-ci.org/gwuhaolin/chrome-runner)
[![Dependency Status](https://david-dm.org/gwuhaolin/chrome-runner.svg?style=flat-square)](https://npmjs.org/package/chrome-runner)
[![Npm Downloads](http://img.shields.io/npm/dm/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)

# chrome-runner 
Run chrome with ease from node.

- Support OSX Linux Windows system
- Handle chrome unexpected exit and restart it
- [Disables many Chrome services](https://github.com/gwuhaolin/chrome-runner/blob/master/flags.js) that add noise to automated scenarios
- Opens up the browser's `remote-debugging-port` on an available port
- Automagically locates a Chrome binary to launch
- Uses a fresh Chrome profile for each launch, and cleans itself up on `kill()`
- Binds `Ctrl-C` (by default) to terminate the Chrome process

## Use
```js
const Runner = require('chrome-runner');

// chrome runner, a runner will launch a chrome
const runner = new Runner({
  // chrome remote debugging port
  port: number,
  // (optional) Additional flags to pass to Chrome, for example: ['--headless', '--disable-gpu']
  // See all flags here: http://peter.sh/experiments/chromium-command-line-switches/
  // Do note, many flags are set by default: https://github.com/gwuhaolin/chrome-runner/blob/master/flags.js
  chromeFlags: Array<string>,

  // (optional) Explicit path of intended Chrome binary
  // By default, any detected Chrome Canary or Chrome (stable) will be launched
  chromePath: string,
});

// launch the chrome app
await runner.launch();

// read chrome remote debugging port
runner.port;

// kill this chrome
await runner.kill();
```

after chrome-runner launch chrome, a dir hold chrome out log and pid file will be create, this dir path will be out in console.

## Install chrome on linux server
chrome-runner required chrome installed on your system, it easy to install on OSX and Windows, Let me tell you how to install on linux server:

install unstable chromium(don't use in production):
1. download chrome by run `wget https://download-chromium.appspot.com/dl/Linux_x64?type=snapshots`
2. unzip chrome.zip by `unzip chrome.zip`
3. chrome executable file is `./chrome/chrome`, add dir `./chrome` to your env path
4. notice run chrome in linux server require chrome with flags `['--headless', '--disable-gpu']`, Otherwise some error will occur

install stable chrome:
see [How to install Chrome browser properly via command line?](https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line)

