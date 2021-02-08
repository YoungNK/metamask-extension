#!/usr/bin/env node
const { promisify } = require('util')
const sass = require('sass')

const { promises: fs } = require('fs')
const vm = require('vm')

// example()
// async function example(){
//   const vmContext = vm.createContext()
//   const rawInput = JSON.stringify({"data":"/*\n  MetaMask design system imports\n  The variables declared here should take precedence.\n  They are included first because they will be used to replace bad variable names in itcss\n  prior to it being fully removed from the system.\n*/\n@import './reset.scss';\n@import './design-system/index';\n@import './base-styles.scss';\n@import '../components/app/app-components';\n@import '../components/ui/ui-components';\n@import '../pages/pages';\n\n/*\n  ITCSS\n\n  http://www.creativebloq.com/web-design/manage-large-css-projects-itcss-101517528\n  https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/\n\n  DEPRECATED: This CSS architecture is deprecated. The following imports will be removed\n  overtime.\n */\n@import './itcss/settings/index';\n@import './itcss/tools/index';\n@import './itcss/components/index';\n\n/*\n  Third Party Library Styles\n*/\n@import '../../../node_modules/react-tippy/dist/tippy';\n@import '../../../node_modules/react-select/dist/react-select';\n","file":"/home/xyz/Development/metamask-extension/ui/app/css/index.scss","includePaths":["/home/xyz/Development/metamask-extension/ui/app/css"]})
//   const input = jsonParseInContext(rawInput, vmContext)
//   await performSassCompileAndExit(input, vmContext)
//   console.log('done')
// }

main()

async function main () {
  const vmContext = vm.createContext()
  let opts
  try {
    const rawOpts = process.argv[2]
    opts = jsonParseInContext(rawOpts, vmContext)
  } catch (err) {
    throw new Error(`Failed to parse opts:\n${err.stack}`)
  }
  await performSassCompileAndExit(opts, vmContext)
}

async function performSassCompileAndExit (opts, vmContext) {
  const sass = await initializeSass(vmContext)
  const results = await promisify((cb) => sass.render(opts, cb))()
  // log result to stdout
  console.log(JSON.stringify(results))
  // <---------------------
}

async function initializeSass (vmContext) {
  const sassPath = require.resolve('sass')
  const sassContent = await fs.readFile(sassPath)
  prepareCjsContext({
    imports: {
      url: {
        pathToFileURL: require('url').pathToFileURL,
      },
      fs: {
        existsSync: require('fs').existsSync,
        statSync: require('fs').statSync,
        readFileSync: require('fs').readFileSync,
      },
      readline: {},
      chokidar: {},
    },
    globals: {
      process: {
        cwd: process.cwd,
        platform: process.platform,
        versions: {},
        env: {},
      },
      setTimeout,
      Buffer,
    },
  }, vmContext)
  vm.runInContext(sassContent, vmContext)
  const baseSass = vmContext.exports
  return {
    render: (opt, callback) => {
      return baseSass.render(opt, wrapFnForContext(callback, vmContext))
    }
  }
}

function prepareCjsContext ({ imports = {}, globals = {} }, vmContext) {
  vmContext.global = vmContext
  const { module, exports } = vm.runInContext('const exports = {}; ({ exports, module: { exports } })', vmContext)
  vmContext.module = module
  vmContext.exports = exports
  vmContext.require = (requestedName) => {
    return imports[requestedName]
  }
  Object.assign(vmContext, globals)
  return vmContext
}

function wrapFnForContext (fn, vmContext) {
  const createWrapped = vm.runInContext('(target) => { return (...args) => { return target(...args) } }', vmContext)
  const wrappedFn = createWrapped(fn)
  return wrappedFn
}

function jsonParseInContext (rawJson, vmContext) {
  const createWrapped = vm.runInContext('(target) => { return JSON.parse(target) }', vmContext)
  const result = createWrapped(rawJson)
  return result
}

// debug util for detecting accesses
function loggingProxy (label, obj) {
  const accessedSet = new Set()
  function logAccess (action, arg) {
    let accessedSlug
    if (arg === undefined) {
      accessedSlug = `${action}`
    } else if (typeof arg === 'string') {
      accessedSlug = `${action}:${arg}`
    } else if (typeof arg === 'symbol') {
      accessedSlug = `${action}:${String(arg)}`
    } else {
      console.log(label, action, arg)
      return
    }
    if (accessedSet.has(accessedSlug)) return
    accessedSet.add(accessedSlug)
    console.log(label, accessedSlug)
  }

  return new Proxy(obj, {
    defineProperty: (...args) => { logAccess('defineProperty', args[1]); return Reflect.defineProperty(...args) },
    deleteProperty: (...args) => { logAccess('deleteProperty', args[1]); return Reflect.deleteProperty(...args) },
    apply: (...args) => { logAccess('apply', args[1]); return Reflect.apply(...args) },
    construct: (...args) => { logAccess('construct', args[1]); return Reflect.construct(...args) },
    get: (...args) => { logAccess('get', args[1]); return Reflect.get(...args) },
    getOwnPropertyDescriptor: (...args) => { logAccess('getOwnPropertyDescriptor', args[1]); return Reflect.getOwnPropertyDescriptor(...args) },
    getPrototypeOf: (...args) => { logAccess('getPrototypeOf', args[1]); return Reflect.getPrototypeOf(...args) },
    has: (...args) => { logAccess('has', args[1]); return Reflect.has(...args) },
    isExtensible: (...args) => { logAccess('isExtensible', args[1]); return Reflect.isExtensible(...args) },
    ownKeys: (...args) => { logAccess('ownKeys', args[1]); return Reflect.ownKeys(...args) },
    preventExtensions: (...args) => { logAccess('preventExtensions', args[1]); return Reflect.preventExtensions(...args) },
    set: (...args) => { logAccess('set', args[1]); return Reflect.set(...args) },
    setPrototypeOf: (...args) => { logAccess('setPrototypeOf', args[1]); return Reflect.setPrototypeOf(...args) },
  })
}