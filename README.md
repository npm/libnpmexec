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
  cwd,
})
```

## API:

### `libExec(opts)`

- `opts`:
  - `pkg`: A valid `package.json` **Object**

## LICENSE

[ISC](./LICENSE)

