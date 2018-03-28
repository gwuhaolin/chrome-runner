[![Npm Package](https://img.shields.io/npm/v/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)
[![Build Status](https://img.shields.io/travis/gwuhaolin/chrome-runner.svg?style=flat-square)](https://travis-ci.org/gwuhaolin/chrome-runner)
[![Build Status](https://img.shields.io/appveyor/ci/gwuhaolin/chrome-runner.svg?style=flat-square)](https://ci.appveyor.com/project/gwuhaolin/chrome-runner)
[![Dependency Status](https://david-dm.org/gwuhaolin/chrome-runner.svg?style=flat-square)](https://npmjs.org/package/chrome-runner)
[![Npm Downloads](http://img.shields.io/npm/dm/chrome-runner.svg?style=flat-square)](https://www.npmjs.com/package/chrome-runner)

# chrome-runner
Run chrome with ease from node.

- Support OSX Linux Windows system
- Handle chrome unexpected exit and restart it
- Opens up the browser's `remote-debugging-port` on an available port
- Automatic locates a Chrome binary to launch
- Uses a fresh Chrome profile for each launch, and cleans itself up on `kill()`
- Support typescript

## Use
```js
const {Runner,launch,launchWithoutNoise,launchWithHeadless} = require('chrome-runner');
// launch a chrome, launch return a Runner instance
const runner = await launch();
// read chrome remote debugging port
runner.port;
// kill this chrome
await runner.kill();
```

### Options
`launch()` method can pass options by `launch({name:value})`. Include:
- `port`: {number} launch chrome listen on debug port, default will random a free port to use
- `chromePath`: {string} chrome executable full path, default will automatic find a path according to your system. If no executable chrome find, will use env CHROME_PATH as executable full path. If all of the above way can't get a path a Error('no chrome installations found') will throw
- `chromeFlags`: {Array<string>} flags pass to chrome when start chrome, all flags can be find [here](http://peter.sh/experiments/chromium-command-line-switches/)
- `startupPage`: {string} open page when chrome start, default is `about:blank`
- `shouldRestartChrome`: {boole} logger to handle log from chrome-runner, interface like console, default use console
- `monitorInterval`: {number} in ms, monitor chrome is alive interval, default is 500ms
- `chromeDataDir`: {string} chrome data dir, default will create one in system tmp
- `disableLogging`: {boolean} Controls if Chome stdout and stderr is logged to file, default is `true`.

### Runner API
- `runner.port`: get chrome remove debug port
- `runner.kill()`: kill chrome and release all resource and remove temp files

#### Events
Runner extends EventEmitter, it will emit some events in it's lifecycle, Include:
- `chromeAlive(port)`: when monitor detect chrome is alive
- `chromeDead(code, signal)`: after monitor detect chrome is not alive
- `chromeRestarted()`: after chrome unexpected exited then runner restart it
- `chromeDataDirPrepared(chromeDataDir)`: after runner create data dir for chrome
- `chromeDataDirRemoved(chromeDataDir)`: after remove successful create data dir for chrome

### launchWithoutNoise
`launchWithoutNoise` same with `launch` but [disables many chrome services](https://github.com/gwuhaolin/chrome-runner/blob/master/lib/flags.js) that add noise to automated scenarios.

### launchWithHeadless
`launchWithHeadless` same with `launch` but [run chrome in headless mode](https://developers.google.com/web/updates/2017/04/headless-chrome) and without noise.

**more use case see [unit test](./test/runner.test.js), API detail see [d.ts](./index.d.ts)**

### Chrome log files
After chrome launched, chrome's log and pid file will be pipe to file in `chromeDataDir`, Include:
- `chrome-out.log` chrome info log
- `chrome-err.log` chrome error log
- `chrome.pid` chrome pid file

## Install chrome on linux server
chrome-runner required chrome installed on your system, it easy to install on OSX and Windows, Linux server see [How to install Chrome browser properly via command line?](https://askubuntu.com/questions/79280/how-to-install-chrome-browser-properly-via-command-line)

## Use Case
chrome-runner has been used in many project, e.g:
- [chrome-render](https://github.com/gwuhaolin/chrome-render) general server render base on chrome
- [chrome-pool](https://github.com/gwuhaolin/chrome-pool) headless chrome tabs manage pool
- [koa-seo](https://github.com/gwuhaolin/koa-seo) SEO middleware for koa base on chrome-render, a substitute for prerender
- [chrome-tester](https://github.com/gwuhaolin/chrome-tester) web page automatic tester
