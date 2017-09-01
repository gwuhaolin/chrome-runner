import {EventEmitter} from "events";
import {ChildProcess} from "child_process";

interface RunnerOptions {
  /**
   * launch chrome listen on debug port, default will random a free port to use
   */
  port?: number,
  /**
   * chrome executable full path, default will automatic find a path according to your system. If no executable chrome find, a Error('no chrome installations found') will throw
   */
  chromePath?: string,
  /**
   * flags pass to chrome when start chrome, all flags can be find [here](http://peter.sh/experiments/chromium-command-line-switches/)
   */
  chromeFlags?: [string],
  /**
   * open page when chrome start, default is about:blank
   */
  startupPage?: string,
  /**
   * logger to handle log from chrome-runner, interface like console, default use console
   */
  shouldRestartChrome?: boolean,
  /**
   * in ms, monitor chrome is alive interval, default is 500ms
   */
  monitorInterval?: number,
  /**
   * chrome data dir, default will create one in system tmp
   */
  chromeDataDir?: string,
}

export class Runner extends EventEmitter {
  port: number;
  flags: [string];
  chromeProcess: ChildProcess;
  chromeDataDir: string;
  chromeOutFd: number;
  chromeErrorFd: number;
  pidFd: number;

  launch(): Promise<Runner>;

  kill(): Promise<void>;
}

export function launch(opts: RunnerOptions): Promise<Runner>;
export function launchWithoutNoise(opts: RunnerOptions): Promise<Runner>;
export function launchWithHeadless(opts: RunnerOptions): Promise<Runner>;
