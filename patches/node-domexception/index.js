'use strict'

// Local replacement for the deprecated `node-domexception` package, wired in via
// the `node-domexception` entry in the root package.json `overrides`.
//
// The upstream package existed to polyfill `globalThis.DOMException` on Node < 17.
// Node has exposed it natively since 17.0.0 and this project requires Node >= 22,
// so the polyfill is dead weight; its own deprecation notice says to use the
// native class instead.
//
// The only consumer in this tree is `fetch-blob`, which does
// `import DOMException from 'node-domexception'` and calls `new DOMException(...)`,
// so `module.exports` must be the constructor itself.

if (!globalThis.DOMException) {
  throw new Error(
    'globalThis.DOMException is not available. Node >= 17 is required; this project requires Node >= 22.'
  )
}

module.exports = globalThis.DOMException
