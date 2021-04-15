const t = require('tap')

const cacheInstallDir = require('../lib/cache-install-dir.js')

t.test('invalid cache path', t => {
  t.throws(
    () => cacheInstallDir({}),
    /Must provide a valid cache path/,
    'should throw invalid path error'
  )
  t.end()
})
