const fs = require('fs')
const { resolve } = require('path')
const t = require('tap')

const libexec = require('../index.js')

const OUTPUT = []
const baseOpts = {
  args: [],
  call: '',
  cache: '',
  color: false,
  flatOptions: {},
  localBin: '',
  locationMsg: '',
  log: {
    warn () {},
  },
  globalBin: '',
  output: msg => {
    OUTPUT.push(msg)
  },
  packages: [],
  path: '',
  runPath: '',
  shell: process.platform === 'win32'
    ? process.env.ComSpec || 'cmd'
    : process.env.SHELL || 'sh',
  yes: true,
}

t.test('local pkg', async t => {
  const path = t.testdir({
    cache: {},
    node_modules: {
      '.bin': {
        a: t.fixture('symlink', '../a/index.js'),
      },
      a: {
        'index.js': `#!/usr/bin/env node
require('fs').writeFileSync(process.argv.slice(2)[0], 'LOCAL PKG')`,
      },
    },
    'package.json': JSON.stringify({ name: 'pkg' }),
  })
  const localBin = resolve(path, 'node_modules/.bin')
  const runPath = path

  const executable = resolve(localBin, 'a')
  fs.chmodSync(executable, 0o775)

  await libexec({
    ...baseOpts,
    args: ['a', 'resfile'],
    localBin,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'LOCAL PKG', 'should run local pkg bin script')
  t.end()
})

t.test('local pkg', async t => {
  const path = t.testdir({
    cache: {},
    node_modules: {
      '.bin': {
        a: t.fixture('symlink', '../a/index.js'),
      },
      a: {
        'index.js': `#!/usr/bin/env node
require('fs').writeFileSync(process.argv.slice(2)[0], 'LOCAL PKG')`,
      },
    },
    'package.json': JSON.stringify({ name: 'pkg' }),
  })
  const localBin = resolve(path, 'node_modules/.bin')
  const runPath = path

  const executable = resolve(localBin, 'a')
  fs.chmodSync(executable, 0o775)

  await libexec({
    ...baseOpts,
    args: ['a', 'resfile'],
    localBin,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'LOCAL PKG', 'should run local pkg bin script')
  t.end()
})

t.test('global space pkg', async t => {
  const path = t.testdir({
    cache: {},
    global: {
      node_modules: {
        '.bin': {
          a: t.fixture('symlink', '../a/index.js'),
        },
        a: {
          'index.js': `#!/usr/bin/env node
  require('fs').writeFileSync(process.argv.slice(2)[0], 'GLOBAL PKG')`,
        },
      },
    },
  })
  const globalBin = resolve(path, 'global/node_modules/.bin')
  const runPath = path

  const executable = resolve(globalBin, 'a')
  fs.chmodSync(executable, 0o775)

  await libexec({
    ...baseOpts,
    args: ['a', 'resfile'],
    globalBin,
    path,
    runPath,
  })

  const res = fs.readFileSync(resolve(path, 'resfile')).toString()
  t.equal(res, 'GLOBAL PKG', 'should run local pkg bin script')
  t.end()
})
