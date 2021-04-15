const fs = require('fs')
const { resolve } = require('path')
const t = require('tap')
const binLinks = require('bin-links')

const libexec = require('../lib/index.js')

// setup server
const registryServer = require('./registry/server.js')
const { registry } = registryServer
t.test('setup server', { bail: true, buffered: false }, registryServer)

const baseOpts = {
  audit: false,
  cache: '',
  call: '',
  color: false,
  localBin: '',
  globalBin: '',
  packages: [],
  path: '',
  registry,
  runPath: '',
  shell: process.platform === 'win32'
    ? process.env.ComSpec || 'cmd'
    : process.env.SHELL || 'sh',
  yes: true,
}

t.test('local pkg', async t => {
  const pkg = {
    name: 'pkg',
    bin: {
      a: 'index.js',
    },
  }
  const path = t.testdir({
    cache: {},
    node_modules: {
      '.bin': {},
      a: {
        'index.js': `#!/usr/bin/env node
require('fs').writeFileSync(process.argv.slice(2)[0], 'LOCAL PKG')`,
      },
    },
    'package.json': JSON.stringify(pkg),
  })
  const localBin = resolve(path, 'node_modules/.bin')
  const runPath = path

  const executable = resolve(path, 'node_modules/a')
  fs.chmodSync(executable, 0o775)

  await binLinks({
    path: resolve(path, 'node_modules/a'),
    pkg,
  })

  await libexec({
    ...baseOpts,
    args: ['a', 'resfile'],
    localBin,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'LOCAL PKG', 'should run local pkg bin script')
})

t.test('local pkg, must not fetch manifest for avail pkg', async t => {
  const pkg = {
    name: '@ruyadorno/create-index',
    version: '2.0.0',
    bin: {
      'create-index': './index.js',
    },
  }
  const path = t.testdir({
    cache: {},
    node_modules: {
      '.bin': {},
      '@ruyadorno': {
        'create-index': {
          'package.json': JSON.stringify(pkg),
          'index.js': `#!/usr/bin/env node
  require('fs').writeFileSync(process.argv.slice(2)[0], 'LOCAL PKG')`,
        },
      },
    },
    'package.json': JSON.stringify({
      name: 'pkg',
      dependencies: {
        '@ruyadorno/create-index': '^2.0.0',
      },
    }),
  })
  const runPath = path
  const cache = resolve(path, 'cache')

  const executable =
    resolve(path, 'node_modules/@ruyadorno/create-index/index.js')
  fs.chmodSync(executable, 0o775)

  await binLinks({
    path: resolve(path, 'node_modules/@ruyadorno/create-index'),
    pkg,
  })

  await libexec({
    ...baseOpts,
    cache,
    packages: ['@ruyadorno/create-index'],
    call: 'create-index resfile',
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'LOCAL PKG', 'should run local pkg bin script')
})

t.test('local file system path', async t => {
  const path = t.testdir({
    cache: {},
    a: {
      'package.json': JSON.stringify({
        name: 'a',
        bin: {
          a: './index.js',
        },
      }),
      'index.js': `#!/usr/bin/env node
require('fs').writeFileSync(process.argv.slice(2)[0], 'LOCAL PKG')`,
    },
  })
  const runPath = path
  const cache = resolve(path, 'cache')

  const executable = resolve(path, 'a/index.js')
  fs.chmodSync(executable, 0o775)

  await libexec({
    ...baseOpts,
    args: [`file:${resolve(path, 'a')}`, 'resfile'],
    cache,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'LOCAL PKG', 'should run local pkg bin script')
})

t.test('global space pkg', async t => {
  const pkg = {
    name: 'a',
    bin: {
      a: 'index.js',
    },
  }
  const path = t.testdir({
    cache: {},
    global: {
      node_modules: {
        '.bin': {},
        a: {
          'index.js': `#!/usr/bin/env node
  require('fs').writeFileSync(process.argv.slice(2)[0], 'GLOBAL PKG')`,
          'package.json': JSON.stringify(pkg),
        },
      },
    },
  })
  const globalBin = resolve(path, 'global/node_modules/.bin')
  const runPath = path

  const executable = resolve(path, 'global/node_modules/a')
  fs.chmodSync(executable, 0o775)

  await binLinks({
    path: resolve(path, 'global/node_modules/a'),
    pkg,
  })

  await libexec({
    ...baseOpts,
    args: ['a', 'resfile'],
    globalBin,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'GLOBAL PKG', 'should run local pkg bin script')
})

t.test('run from registry', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')

  t.throws(
    () => fs.statSync(resolve(path, 'index.js')),
    { code: 'ENOENT' },
    'should not have template file'
  )

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
  })

  t.ok(fs.statSync(resolve(path, 'index.js')).isFile(), 'ran create pkg')
})

t.test('avoid install when exec from registry an available pkg', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')

  t.throws(
    () => fs.statSync(resolve(path, 'index.js')),
    { code: 'ENOENT' },
    'should not have template file'
  )

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
  })

  t.ok(fs.statSync(resolve(path, 'index.js')).isFile(), 'ran create pkg')
  fs.unlinkSync(resolve(path, 'index.js'))

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
  })

  t.ok(fs.statSync(resolve(path, 'index.js')).isFile(), 'ran create pkg again')
})

t.test('run multiple from registry', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')

  t.throws(
    () => fs.statSync(resolve(path, 'index.js')),
    { code: 'ENOENT' },
    'should not have index template file'
  )

  t.throws(
    () => fs.statSync(resolve(path, 'test.js')),
    { code: 'ENOENT' },
    'should not have test template file'
  )

  await libexec({
    ...baseOpts,
    packages: ['@ruyadorno/create-test', '@ruyadorno/create-index'],
    call: ['create-test; create-index'],
    cache,
    path,
    runPath,
  })

  t.ok(fs.statSync(resolve(path, 'index.js')).isFile(), 'ran index pkg')
  t.ok(fs.statSync(resolve(path, 'test.js')).isFile(), 'ran test pkg')
})

t.test('no args', async t => {
  const path = t.testdir({})
  const runPath = path
  const libexec = t.mock('../lib/index.js', {
    '../lib/run-script': ({ args }) => {
      t.ok(args.length === 0, 'should call run-script with no args')
    },
  })

  await libexec({
    ...baseOpts,
    path,
    runPath,
  })
})

t.test('prompt, accepts', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')
  const libexec = t.mock('../lib/index.js', {
    '@npmcli/ci-detect': () => false,
    read (opts, cb) {
      cb(null, 'y')
    },
    '../lib/no-tty.js': () => false,
  })

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
    yes: undefined,
  })

  const installedDir = resolve(cache,
    '_npx/0e8e15840a234288/node_modules/@ruyadorno/create-index/package.json')
  t.ok(fs.statSync(installedDir).isFile(), 'installed required packages')
})

t.test('prompt, refuses', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')
  const libexec = t.mock('../lib/index.js', {
    '@npmcli/ci-detect': () => false,
    read (opts, cb) {
      cb(null, 'n')
    },
    '../lib/no-tty.js': () => false,
  })

  await t.rejects(
    libexec({
      ...baseOpts,
      args: ['@ruyadorno/create-index'],
      cache,
      path,
      runPath,
      yes: undefined,
    }),
    /canceled/,
    'should throw with canceled error'
  )

  const installedDir = resolve(cache,
    '_npx/0e8e15840a234288/node_modules/@ruyadorno/create-index/package.json')

  t.throws(
    () => fs.statSync(installedDir),
    { code: 'ENOENT' },
    'should not have installed required packages'
  )
})

t.test('prompt, -n', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')

  await t.rejects(
    libexec({
      ...baseOpts,
      args: ['@ruyadorno/create-index'],
      cache,
      path,
      runPath,
      yes: false,
    }),
    /canceled/,
    'should throw with canceled error'
  )

  const installedDir = resolve(cache,
    '_npx/0e8e15840a234288/node_modules/@ruyadorno/create-index/package.json')

  t.throws(
    () => fs.statSync(installedDir),
    { code: 'ENOENT' },
    'should not have installed required packages'
  )
})

t.test('no prompt if no tty', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')
  const libexec = t.mock('../lib/index.js', {
    '../lib/no-tty.js': () => true,
  })

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
    yes: undefined,
  })

  const installedDir = resolve(cache,
    '_npx/0e8e15840a234288/node_modules/@ruyadorno/create-index/package.json')
  t.ok(fs.statSync(installedDir).isFile(), 'installed required packages')
})

t.test('no prompt if CI', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')
  const libexec = t.mock('../lib/index.js', {
    '@npmcli/ci-detect': () => true,
  })

  await libexec({
    ...baseOpts,
    args: ['@ruyadorno/create-index'],
    cache,
    path,
    runPath,
    yes: undefined,
  })

  const installedDir = resolve(cache,
    '_npx/0e8e15840a234288/node_modules/@ruyadorno/create-index/package.json')
  t.ok(fs.statSync(installedDir).isFile(), 'installed required packages')
})

t.test('no prompt if CI, multiple packages', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const path = resolve(testdir, 'work')
  const runPath = path
  const cache = resolve(testdir, 'cache')
  const libexec = t.mock('../lib/index.js', {
    '@npmcli/ci-detect': () => true,
    'proc-log': {
      warn (title, msg) {
        t.equal(title, 'exec', 'should warn exec title')
        const expected = 'The following packages were not found and will be ' +
          'installed: @ruyadorno/create-index, @ruyadorno/create-test'
        t.equal(msg, expected, 'should warn installing pkg')
      },
    },
  })

  await libexec({
    ...baseOpts,
    call: 'create-index',
    packages: ['@ruyadorno/create-index', '@ruyadorno/create-test'],
    cache,
    path,
    runPath,
    yes: undefined,
  })
})

t.test('sane defaults', async t => {
  const testdir = t.testdir({
    cache: {},
    work: {},
  })
  const cache = resolve(testdir, 'cache')
  const workdir = resolve(testdir, 'work')

  const cwd = process.cwd()
  process.chdir(workdir)
  t.teardown(() => {
    process.chdir(cwd)
  })

  await libexec({
    args: ['@ruyadorno/create-index'],
    cache,
    yes: true,
  })

  t.ok(fs.statSync(resolve(workdir, 'index.js')).isFile(),
    'ran create-index pkg')
})
