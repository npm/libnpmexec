const { delimiter } = require('path')
const ciDetect = require('@npmcli/ci-detect')
const runScript = require('@npmcli/run-script')
const readPackageJson = require('read-package-json-fast')

const run = async ({
  args,
  call,
  colorize,
  flatOptions,
  locationMsg,
  log,
  output,
  path,
  pathArr,
  runPath,
  shell,
}) => {
  // turn list of args into command string
  const script = call || args.shift() || shell

  // do the fakey runScript dance
  // still should work if no package.json in cwd
  const realPkg = await readPackageJson(`${path}/package.json`)
    .catch(() => ({}))
  const pkg = {
    ...realPkg,
    scripts: {
      ...(realPkg.scripts || {}),
      npx: script,
    },
  }

  if (log && log.disableProgress)
    log.disableProgress()

  try {
    if (script === shell) {
      if (process.stdin.isTTY) {
        if (ciDetect())
          return log.warn('exec', 'Interactive mode disabled in CI environment')

        locationMsg = locationMsg || ` at location:\n${colorize.dim(runPath)}`

        output(`${
          colorize.reset('\nEntering npm script environment')
        }${
          colorize.reset(locationMsg)
        }${
          colorize.bold('\nType \'exit\' or ^D when finished\n')
        }`)
      }
    }
    return await runScript({
      ...flatOptions,
      pkg,
      banner: false,
      // we always run in cwd, not --prefix
      path: runPath,
      stdioString: true,
      event: 'npx',
      args,
      env: {
        PATH: pathArr.join(delimiter),
      },
      stdio: 'inherit',
    })
  } finally {
    if (log && log.enableProgress)
      log.enableProgress()
  }
}

module.exports = run
