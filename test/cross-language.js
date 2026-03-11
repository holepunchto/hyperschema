'use strict'

const test = require('brittle')
const c = require('compact-encoding')
const SwiftHyperschema = require('../swift.cjs')
const { runSwift } = require('./helpers/swift')
const { createTestSchema } = require('./helpers')
const { isWindows } = require('which-runtime')
const fixtures = require('./helpers/fixtures')

for (const fixture of fixtures) {
  const swiftCases = fixture.cases.filter((kase) => kase.swift)
  if (!swiftCases.length) continue

  // JS encodes → Swift decodes
  test(`cross-language: ${fixture.name}: JS → Swift`, { skip: isWindows }, async (t) => {
    const jsSchema = await createTestSchema(t)
    await jsSchema.rebuild(fixture.register)

    const swiftSchema = SwiftHyperschema.from(null)
    fixture.register(swiftSchema)

    const lines = ['import Foundation']
    for (const kase of swiftCases) {
      const enc = jsSchema.module.resolveStruct(kase.type)
      const base64 = c.encode(enc, kase.value).toString('base64')

      lines.push('do {')
      lines.push(`  let data = Data(base64Encoded: "${base64}")!`)
      lines.push(`  let decoded = try! decode(${kase.swift.codec}, data)`)
      for (const assertion of kase.swift.assertions) {
        lines.push(`  ${assertion}`)
      }
      lines.push('}')
    }
    lines.push('print("OK")')

    const result = runSwift(swiftSchema.toCode(), lines.join('\n'))
    t.ok(result.ok, `JS→Swift failed:\n${result.stderr}`)
  })

  // Swift encodes → JS decodes
  test(`cross-language: ${fixture.name}: Swift → JS`, { skip: isWindows }, async (t) => {
    const jsSchema = await createTestSchema(t)
    await jsSchema.rebuild(fixture.register)

    const swiftSchema = SwiftHyperschema.from(null)
    fixture.register(swiftSchema)

    // Batch all cases into a single swift run — one base64 line per case on stdout
    const lines = ['import Foundation']
    for (const kase of swiftCases) {
      lines.push('do {')
      lines.push(`  let value = ${kase.swift.encode}`)
      lines.push(`  let buffer = encode(${kase.swift.codec}, value)`)
      lines.push('  print(buffer.base64EncodedString())')
      lines.push('}')
    }

    const result = runSwift(swiftSchema.toCode(), lines.join('\n'))
    t.ok(result.ok, `Swift encode failed:\n${result.stderr}`)

    const outputs = result.stdout.trim().split('\n')
    for (let i = 0; i < swiftCases.length; i++) {
      const kase = swiftCases[i]
      const bytes = Buffer.from(outputs[i], 'base64')
      const enc = jsSchema.module.resolveStruct(kase.type)
      t.alike(
        c.decode(enc, bytes),
        kase.value,
        `Swift→JS roundtrip failed for ${JSON.stringify(kase.value)}`
      )
    }
  })
}
