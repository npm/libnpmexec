# libnpmexec

[![npm version](https://img.shields.io/npm/v/libnpmexec.svg)](https://npm.im/libnpmexec)
[![license](https://img.shields.io/npm/l/libnpmexec.svg)](https://npm.im/libnpmexec)
[![GitHub Actions](https://github.com/npm/libnpmexec/workflows/node-ci/badge.svg)](https://github.com/npm/libnpmexec/actions?query=workflow%3Anode-ci)
[![Coverage Status](https://coveralls.io/repos/github/npm/libnpmexec/badge.svg?branch=main)](https://coveralls.io/github/npm/libnpmexec?branch=main)

The `npm exec` (`npx`) Programmatic API

## Install

`npm install libnpmexec`

## Usage:

```js
const libExec = require('libnpmexec')
await libExec({
  args: [],
  call: '',
  cache: '~./npm',
  color: false,
  flatOptions: {
    audit: false,
    cache: '~/.npm',
    registry: 'https://registry.npmjs.org/',
    // and more options from @npmcli/arborist
  },
  localBin: '',
  log: {
    http () {},
    silly () {},
    warn () {},
  },
  globalBin: '',
  output: console.log,
  packages: [],
  path: '',
  runPath: '',
  shell: process.platform === 'win32'
    ? process.env.ComSpec || 'cmd'
    : process.env.SHELL || 'sh',
  yes: true,
})
```

## API:

### `libExec(opts)`

- `opts`:
  - `args`: List of pkgs to execute **Array<String>**
  - `call`: An alternative command to run when using `packages` option **String**
  - `cache`: The path location to where the npm cache folder is placed **String**
  - `color`: Output should use color? **Boolean**
  - `flatOptions`: Options send to [@npmcli/arborist](https://github.com/npm/arborist/) and [pacote](https://github.com/npm/pacote/#options) **Object**
  - `localBin`: Location to the `node_modules/.bin` folder of the local project **String**
  - `locationMsg`: Overrides "at location" message when entering interactive mode **String**
  - `log`: A logger to log messages **Object**
  - `globalBin`: Location to the global space bin folder, same as: `$(npm bin -g)` **String**
  - `output`: A function to print output to **Function**
  - `packages`: A list of packages to be used (possibly fetch from the registry) **Array<String>**
  - `path`: Location to where to read local project info (`package.json`) **String**
  - `runPath`: Location to where to execute the script **String**
  - `shell`: Default shell to be used **String**
  - `yes`: Should skip download confirmation prompt when fetching missing packages from the registry? **Boolean**

## LICENSE

[ISC](./LICENSE)
