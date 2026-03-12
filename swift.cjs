'use strict'

const fs = require('fs')
const path = require('path')
const Hyperschema = require('./builder.cjs')
const generateSwift = require('./lib/swift-codegen')

class SwiftHyperschema extends Hyperschema {
  toCode(opts) {
    return generateSwift(this, opts)
  }

  // Writes a valid Swift package layout:
  //   <dir>/Package.swift       — Swift package manifest, needed for `swift build` / `swift run`
  //   <dir>/Sources/Schema.swift — generated schema encodings
  //   <dir>/schema.json          — hyperschema version history
  static toDisk(hyperschema, dir, opts) {
    if (typeof dir === 'object' && dir) {
      opts = dir
      dir = null
    }

    if (!dir) dir = hyperschema.dir

    hyperschema.linkAll()

    const root = path.resolve(dir)
    const sources = path.join(root, 'Sources')

    fs.mkdirSync(sources, { recursive: true })

    fs.writeFileSync(
      path.join(root, 'schema.json'),
      JSON.stringify(hyperschema.toJSON(), null, 2) + '\n',
      { encoding: 'utf-8' }
    )
    fs.writeFileSync(path.join(sources, 'Schema.swift'), hyperschema.toCode(opts), {
      encoding: 'utf-8'
    })
    fs.writeFileSync(path.join(root, 'Package.swift'), PACKAGE_SWIFT, { encoding: 'utf-8' })
  }
}

const PACKAGE_SWIFT = `// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "Schema",
  platforms: [.macOS(.v11), .iOS(.v14)],
  dependencies: [
    .package(url: "https://github.com/holepunchto/compact-encoding-swift", branch: "main")
  ],
  targets: [
    .executableTarget(
      name: "Schema",
      dependencies: [.product(name: "CompactEncoding", package: "compact-encoding-swift")],
      path: "Sources"
    )
  ]
)
`

module.exports = SwiftHyperschema
