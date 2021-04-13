const crypto = require('crypto')
const { delimiter, resolve } = require('path')
const { promisify } = require('util')
const read = promisify(require('read'))
const stat = promisify(require('fs').stat)

const Arborist = require('@npmcli/arborist')
const runScript = require('@npmcli/run-script')
const ciDetect = require('@npmcli/ci-detect')
const chalk = require('chalk')
const mkdirp = require('mkdirp-infer-owner')
const npa = require('npm-package-arg')
const pacote = require('pacote')
const readPackageJson = require('read-package-json-fast')

const nocolor = {
  reset: s => s,
  bold: s => s,
  dim: s => s,
  green: s => s,
}

const fileExists = (file) => stat(file)
  .then((stat) => stat.isFile())
  .catch(() => false)

const PATH = (
  process.env.PATH || process.env.Path || process.env.path
).split(delimiter)

const cacheInstallDir = ({ cache, packages }) => {
  if (!cache)
    throw new Error('Must provide a valid cache path')

  // only packages not found in ${prefix}/node_modules
  return resolve(cache, '_npx', getHash(packages))
}

const getHash = (packages) =>
  crypto.createHash('sha512')
    .update(packages.sort((a, b) => a.localeCompare(b)).join('\n'))
    .digest('hex')
    .slice(0, 16)

const manifestMissing = (tree, mani) => {
  // if the tree doesn't have a child by that name/version, return true
  // true means we need to install it
  const child = tree.children.get(mani.name)
  // if no child, we have to load it
  if (!child)
    return true

  // if no version/tag specified, allow whatever's there
  if (mani._from === `${mani.name}@`)
    return false

  // otherwise the version has to match what we WOULD get
  return child.version !== mani.version
}

const getBinFromManifest = (mani) => {
  // if we have a bin matching (unscoped portion of) packagename, use that
  // otherwise if there's 1 bin or all bin value is the same (alias), use
  // that, otherwise fail
  const bin = mani.bin || {}
  if (new Set(Object.values(bin)).size === 1)
    return Object.keys(bin)[0]

  // XXX probably a util to parse this better?
  const name = mani.name.replace(/^@[^/]+\//, '')
  if (bin[name])
    return name

  // XXX need better error message
  throw Object.assign(new Error('could not determine executable to run'), {
    pkgid: mani._id,
  })
}

const exec = async ({
  args,
  call,
  cache,
  color,
  flatOptions,
  localBin,
  locationMsg,
  log,
  globalBin,
  output,
  packages,
  path,
  runPath,
  shell,
  yes,
}) => {
  // dereferences values because we manipulate it later
  packages = [...packages]
  const pathArr = [...PATH]
  const colorize = color ? chalk : nocolor
  const _run = () => run({
    args,
    call,
    colorize,
    locationMsg,
    log,
    output,
    path,
    pathArr,
    runPath,
    shell,
  })

  // nothing to maybe install, skip the arborist dance
  if (!call && !args.length && !packages.length)
    return await _run()

  const needPackageCommandSwap = args.length && !packages.length
  // if there's an argument and no package has been explicitly asked for
  // check the local and global bin paths for a binary named the same as
  // the argument and run it if it exists, otherwise fall through to
  // the behavior of treating the single argument as a package name
  if (needPackageCommandSwap) {
    let binExists = false
    if (await fileExists(`${localBin}/${args[0]}`)) {
      pathArr.unshift(localBin)
      binExists = true
    } else if (await fileExists(`${globalBin}/${args[0]}`)) {
      pathArr.unshift(globalBin)
      binExists = true
    }

    if (binExists)
      return await _run()

    packages.push(args[0])
  }

  // If we do `npm exec foo`, and have a `foo` locally, then we'll
  // always use that, so we don't really need to fetch the manifest.
  // So: run npa on each packages entry, and if it is a name with a
  // rawSpec==='', then try to readPackageJson at
  // node_modules/${name}/package.json, and only pacote fetch if
  // that fails.
  const manis = await Promise.all(packages.map(async p => {
    const spec = npa(p, path)
    if (spec.type === 'tag' && spec.rawSpec === '') {
      // fall through to the pacote.manifest() approach
      try {
        const pj = resolve(path, 'node_modules', spec.name)
        return await readPackageJson(pj)
      } catch (er) {}
    }
    // Force preferOnline to true so we are making sure to pull in the latest
    // This is especially useful if the user didn't give us a version, and
    // they expect to be running @latest
    return await pacote.manifest(p, {
      ...flatOptions,
      preferOnline: true,
    })
  }))

  if (needPackageCommandSwap)
    args[0] = getBinFromManifest(manis[0])

  // figure out whether we need to install stuff, or if local is fine
  const localArb = new Arborist({
    ...flatOptions,
    path,
  })
  const tree = await localArb.loadActual()

  // do we have all the packages in manifest list?
  const needInstall = manis.some(mani => manifestMissing(tree, mani))

  if (needInstall) {
    const installDir = cacheInstallDir({ cache, packages })
    await mkdirp(installDir)
    const arb = new Arborist({
      ...flatOptions,
      log,
      path: installDir,
    })
    const tree = await arb.loadActual()

    // at this point, we have to ensure that we get the exact same
    // version, because it's something that has only ever been installed
    // by npm exec in the cache install directory
    const add = manis.filter(mani => manifestMissing(tree, {
      ...mani,
      _from: `${mani.name}@${mani.version}`,
    }))
      .map(mani => mani._from)
      .sort((a, b) => a.localeCompare(b))

    // no need to install if already present
    if (add.length) {
      if (!yes) {
        // set -n to always say no
        if (yes === false)
          throw new Error('canceled')

        if (!process.stdin.isTTY || ciDetect()) {
          log.warn('exec', `The following package${
          add.length === 1 ? ' was' : 's were'
        } not found and will be installed: ${
          add.map((pkg) => pkg.replace(/@$/, '')).join(', ')
        }`)
        } else {
          const addList = add.map(a => `  ${a.replace(/@$/, '')}`)
            .join('\n') + '\n'
          const prompt = `Need to install the following packages:\n${
          addList
        }Ok to proceed? `
          const confirm = await read({ prompt, default: 'y' })
          if (confirm.trim().toLowerCase().charAt(0) !== 'y')
            throw new Error('canceled')
        }
      }
      await arb.reify({
        ...flatOptions,
        log,
        add,
      })
    }
    pathArr.unshift(resolve(installDir, 'node_modules/.bin'))
  }

  return await _run()
}

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

module.exports = exec
