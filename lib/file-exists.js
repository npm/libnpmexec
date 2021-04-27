const { dirname, resolve } = require('path')
const { promisify } = require('util')
const stat = promisify(require('fs').stat)

const fileExists = (file) => stat(file)
  .then((stat) => stat.isFile())
  .catch(() => false)

const localFileExists = async (dir, binName) => {
  const binDir = resolve(dir, 'node_modules', '.bin')

  // return localBin if existing file is found
  if (await fileExists(resolve(binDir, binName)))
    return binDir

  // no more dirs left to walk up, file just does not exist
  if (dir === dirname(dir))
    return false

  return localFileExists(dirname(dir), binName)
}

module.exports = {
  fileExists,
  localFileExists,
}
