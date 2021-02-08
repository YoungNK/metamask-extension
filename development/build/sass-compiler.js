#!/usr/bin/env node
const { promisify } = require('util')
const sass = require('sass')

main()

async function main () {
  let opts
  try {
    const rawOpts = process.argv[2]
    opts = JSON.parse(rawOpts)
  } catch (err) {
    throw new Error(`Failed to parse opts:\n${err.stack}`)
  }
  await performSassCompileAndExit(opts)
}

async function performSassCompileAndExit (opts) {
  const results = await promisify((cb) => sass.render(opts, cb))()
  console.log(JSON.stringify(results))
}