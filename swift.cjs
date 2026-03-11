'use strict'

const Hyperschema = require('./builder.cjs')
const generateSwift = require('./lib/swift-codegen')

class SwiftHyperschema extends Hyperschema {
  static outputFilename = 'Schema.swift'

  toCode(opts) {
    return generateSwift(this, opts)
  }
}

module.exports = SwiftHyperschema
