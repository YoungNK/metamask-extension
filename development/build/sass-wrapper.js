const path = require('path')
const { promisify, callbackify } = require('util')
const execFile = promisify(require('child_process').execFile)

module.exports = {
  render: (opts, callback) => {
    callbackify(spawnCompiler)(opts, callback)
  },
  renderSync: () => {
    throw new Error('sass-wrapper - renderSync not supported')
  }
}

async function spawnCompiler (opts) {
  const serializedOpts = JSON.stringify(opts)
  const compilerPath = path.resolve(path.join(__dirname, 'sass-compiler.js'))
  const { stdout, stderr } = await execFile(compilerPath, [serializedOpts], {
    // needed to enlarge the max buffer beyond the default
    maxBuffer: 10 * 1024 * 1024
  })
  if (stderr.length) {
    console.warn(stderr)
    throw new Error(`sass-wrapper encountered error output in sass-compiler:\n${stderr}`)
  }
  // deserialize and re-bufferify
  const result = JSON.parse(stdout)
  result.css = Buffer.from(result.css)
  return result
}