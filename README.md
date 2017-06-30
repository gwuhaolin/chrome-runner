[![Npm Package](https://img.shields.io/npm/v/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)
[![Build Status](https://img.shields.io/travis/gwuhaolin/chrome-runner.svg?style=flat-square)](https://travis-ci.org/gwuhaolin/chrome-runner)
[![Dependency Status](https://david-dm.org/gwuhaolin/chrome-runner.svg?style=flat-square)](https://npmjs.org/package/chrome-runner)
[![Npm Downloads](http://img.shields.io/npm/dm/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)

# chrome-runner 
Run chrome with ease from node.

- Support OSX Linux Windows system
- Handle chrome unexpected exit and restart it
- Opens up the browser's `remote-debugging-port` on an available port
- Automatic locates a Chrome binary to launch
- Uses a fresh Chrome profile for each launch, and cleans itself up on `kill()`
- Binds `Ctrl-C` to terminate the Chrome process

## Use
```js
const {launch,launchWithoutNoise} = require('chrome-runner');
// launch a chrome
const runner = await launch();
// read chrome remote debugging port
runner.port;
// kill this chrome
await runner.kill();
```

#### launch options
`launch()` method can pass options by `launch({})`, support:
- `port`: {number} launch chrome listen on debug port, default will random a free port to use
- `chromePath`: {string} chrome executable full path, default will automatic find a path according to your system. If no executable chrome find, will use env CHROME_PATH as executable full path. If all of the above way can't get a path a Error('no chrome installations found') will throw
- `chromeFlags`: {Array<string>} flags pass to chrome when start chrome, all flags can be find [here](http://peter.sh/experiments/chromium-command-line-switches/)
-  `startupPage`: {string} open page when chrome start, default is about:blank

#### runner API
- `runner.port`: get chrome remove debug port
- `runner.kill()`: kill chrome and release all resource and remove temp files

after chrome-runner launch chrome, a dir hold chrome out log and pid file will be create, this dir path will be out in console.

## launchWithoutNoise
`launchWithoutNoise` same with `launch` but [disables many chrome services](https://github.com/gwuhaolin/chrome-runner/blob/master/lib/flags.js) that add noise to automated scenarios.

## launchWithHeadless
`launchWithHeadless` same with `launch` but [run chrome in headless mode](https://developers.google.com/web/updates/2017/04/headless-chrome) and without noise.

## Install chrome on linux server
chrome-runner required chrome installed on your system, it easy to install on OSX and Windows, Linux server see [How to install Chrome browser properly via command line?](https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line)
