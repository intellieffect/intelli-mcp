// Polyfill for the 'global' object
module.exports = (typeof globalThis !== 'undefined') ? globalThis :
                 (typeof self !== 'undefined') ? self :
                 (typeof window !== 'undefined') ? window :
                 (typeof global !== 'undefined') ? global :
                 {};