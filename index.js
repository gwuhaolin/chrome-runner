const { NOISE_FLAGS, HEADLESS_FLAGS } = require('./lib/flags');
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
  return launch(Object.assign(runnerOptions, {
    chromeFlags,
  }));
}

async function launchWithHeadless(runnerOptions = {}) {
  let chromeFlags = NOISE_FLAGS.concat(HEADLESS_FLAGS);
  if (Array.isArray(runnerOptions.chromeFlags)) {
    chromeFlags = chromeFlags.concat(runnerOptions.chromeFlags);
  }
  return launch(Object.assign(runnerOptions, {
    chromeFlags,
  }));
}

module.exports = {
  Runner,
  launch,
  launchWithoutNoise,
  launchWithHeadless
};
