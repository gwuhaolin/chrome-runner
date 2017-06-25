[![Build Status](https://travis-ci.org/gwuhaolin/chrome-runner.svg?branch=master)](https://travis-ci.org/gwuhaolin/chrome-runner)
[![Dependency Status](https://david-dm.org/gwuhaolin/chrome-runner.svg?style=flat-square)](https://npmjs.org/package/chrome-runner)
[![Npm Downloads](http://img.shields.io/npm/dm/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)

[![NPM](https://nodei.co/npm/chrome-runner.png)](https://nodei.co/npm/chrome-runner/)

# Chrome Runner 
Run Google Chrome with ease from node.

* [Disables many Chrome services](https://github.com/gwuhaolin/chrome-runner/blob/master/flags.js) that add noise to automated scenarios
* Opens up the browser's `remote-debugging-port` on an available port
* Automagically locates a Chrome binary to launch
* Uses a fresh Chrome profile for each launch, and cleans itself up on `kill()`
* Binds `Ctrl-C` (by default) to terminate the Chrome process
* handle chrome unexpected exit and restart it

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
