'use strict';
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const newLineRegex = /\r?\n/;

function sort(installations, priorities) {
  const defaultPriority = 10;
  // assign priorities
  return installations
    .map((inst) => {
      for (const pair of priorities) {
        if (pair.regex.test(inst)) {
          return { path: inst, weight: pair.weight };
        }
      }
      return { path: inst, weight: defaultPriority };
    })
    // sort based on priorities
    .sort((a, b) => (b.weight - a.weight))
    // remove priority flag
    .map(pair => pair.path);
}

function canAccess(file) {
  if (!file) {
    return false;
  }

  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

function findChromeExecutables(folder) {
  const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
  const chromeExecRegex = '^Exec=\/.*\/(google|chrome|chromium)-.*';

  let installations = [];
  if (canAccess(folder)) {
    // Output of the grep & print looks like:
    //    /opt/google/chrome/google-chrome --profile-directory
    //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
    let execPaths = execSync(`grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`)
      .toString()
      .split(newLineRegex)
      .map((execPath) => execPath.replace(argumentsRegex, '$1'));

    execPaths.forEach((execPath) => canAccess(execPath) && installations.push(execPath));
  }

  return installations;
}

function darwin() {
  const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];

  const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
    '/Versions/A/Frameworks/LaunchServices.framework' +
    '/Versions/A/Support/lsregister';

  const installations = [];

  execSync(
    `${LSREGISTER} -dump` +
    ' | grep -i \'google chrome\\( canary\\)\\?.app$\'' +
    ' | awk \'{$1=""; print $0}\'')
    .toString()
    .split(newLineRegex)
    .forEach((inst) => {
      suffixes.forEach(suffix => {
        const execPath = path.join(inst.trim(), suffix);
        if (canAccess(execPath)) {
          installations.push(execPath);
        }
      });
    });

  // Retains one per line to maintain readability.
  const priorities = [
    { regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`), weight: 50 },
    { regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome Canary.app`), weight: 51 },
    { regex: /^\/Applications\/.*Chrome.app/, weight: 100 },
    { regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101 },
    { regex: /^\/Volumes\/.*Chrome.app/, weight: -2 },
    { regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1 }
  ];

  return sort(installations, priorities);
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
function linux() {
  let installations = [];

  // 1. Look into CHROME_PATH env variable
  if (canAccess(process.env.CHROME_PATH)) {
    installations.push(process.env.CHROME_PATH);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationFolders = [
    path.join(require('os').homedir(), '.local/share/applications/'),
    '/usr/share/applications/',
  ];
  desktopInstallationFolders.forEach(folder => {
    installations = installations.concat(findChromeExecutables(folder));
  });

  // Look for google-chrome-stable & google-chrome executables by using the which command
  const executables = [
    'google-chrome-stable',
    'google-chrome',
  ];
  executables.forEach((executable) => {
    try {
      const chromePath =
        execFileSync('which', [executable]).toString().split(newLineRegex)[0];
      if (canAccess(chromePath)) {
        installations.push(chromePath);
      }
    } catch (err) {
      // which Not installed.
    }
  });

  if (installations.length === 0) {
    throw new Error(`The environment variable CHROME_PATH must be set to executable of a build of Chromium version 54.0 or later.`);
  }

  const priorities = [
    { regex: /chrome-wrapper$/, weight: 51 }, { regex: /google-chrome-stable$/, weight: 50 },
    { regex: /google-chrome$/, weight: 49 },
    { regex: new RegExp(process.env.CHROME_PATH), weight: 100 }
  ];

  return sort(Array.from(new Set(installations.filter(Boolean))), priorities);
}

function win32() {
  const installations = [];
  const suffixes = [
    '\\Google\\Chrome SxS\\Application\\chrome.exe', '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const prefixes =
    [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];

  if (canAccess(process.env.CHROME_PATH)) {
    installations.push(process.env.CHROME_PATH);
  }

  prefixes.forEach(prefix => suffixes.forEach(suffix => {
    const chromePath = path.join(prefix, suffix);
    if (canAccess(chromePath)) {
      installations.push(chromePath);
    }
  }));
  return installations;
}

module.exports = {
  darwin,
  linux,
  win32,
}
