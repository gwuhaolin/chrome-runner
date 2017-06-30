const { NOISE_FLAGS } = require('./lib/flags');
const Runner = require('./lib/runner');

async function launch(runnerOptions = {}) {
  const runner = new Runner(runnerOptions);
  await runner.launch();
  return runner;
}

async function launchWithoutNoise(runnerOptions = {}) {
  let chromeFlags = NOISE_FLAGS;
  if (Array.isArray(runnerOptions.chromeFlags)) {
    chromeFlags = chromeFlags.concat(runnerOptions.chromeFlags);
  }
  const runner = new Runner(Object.assign({
    chromeFlags,
  }, runnerOptions));
  await runner.launch();
  return runner;
}

async function launchWithHeadless(runnerOptions = {}) {
  let chromeFlags = NOISE_FLAGS.concat([
    '--headless',
    '--disable-gpu'
  ]);
  if (Array.isArray(runnerOptions.chromeFlags)) {
    chromeFlags = chromeFlags.concat(runnerOptions.chromeFlags);
  }
  const runner = new Runner(Object.assign({
    chromeFlags,
  }, runnerOptions));
  await runner.launch();
  return runner;
}

module.exports = {
  launch,
  launchWithoutNoise,
  launchWithHeadless
};
