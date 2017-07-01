interface RunnerOptions {
  port?: number,
  chromePath?: string,
  chromeFlags?: [string],
  startupPage?: string,
  logger?: Console,
}

class Runner<RunnerOptions> {
  port: number;
  flags: [string];
  async launch();
  async kill();
}

export async function launch(opts: RunnerOptions): Runner;
export async function launchWithoutNoise(opts: RunnerOptions): Runner;
export async function launchWithHeadless(opts: RunnerOptions): Runner;
