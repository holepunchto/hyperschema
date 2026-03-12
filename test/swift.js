'use strict'

const path = require('path')
const fs = require('fs')
const test = require('brittle')
const tmp = require('test-tmp')
const SwiftHyperschema = require('../swift.cjs')
const { runSwift } = require('./helpers/swift')
const { isWindows } = require('which-runtime')
const fixtures = require('./helpers/fixtures')

// Roundtrip tests driven by shared fixtures
for (const fixture of fixtures) {
  const swiftCases = fixture.cases.filter((c) => c.swift)
  if (!swiftCases.length) continue

  test(`swift: ${fixture.name}`, { skip: isWindows }, (t) => {
    const schema = SwiftHyperschema.from(null)
    fixture.register(schema)

    // Batch all cases into a single swift run (one compile per fixture)
    const lines = []
    for (const kase of swiftCases) {
      lines.push('do {')
      lines.push(`  let value = ${kase.swift.encode}`)
      lines.push(`  let buffer = encode(${kase.swift.codec}, value)`)
      lines.push(`  let decoded = try! decode(${kase.swift.codec}, buffer)`)
      for (const assertion of kase.swift.assertions) {
        lines.push(`  ${assertion}`)
      }
      lines.push('}')
    }
    lines.push('print("OK")')

    const result = runSwift(schema, lines.join('\n'))
    t.ok(result.ok, `Swift roundtrip failed:\n${result.stderr}`)
  })
}

// toDisk test: exercises the full user-facing path end-to-end
test('swift: toDisk writes Schema.swift', { skip: isWindows }, async (t) => {
  const dir = await tmp(t, { dir: path.join(__dirname, 'test-storage') })

  const schema = SwiftHyperschema.from(dir)
  schema.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'id', type: 'uint', required: true }]
  })

  SwiftHyperschema.toDisk(schema, dir)

  t.ok(fs.existsSync(path.join(dir, 'Sources', 'Schema.swift')), 'Sources/Schema.swift was written')
  t.ok(fs.existsSync(path.join(dir, 'schema.json')), 'schema.json was written')
  t.ok(fs.existsSync(path.join(dir, 'Package.swift')), 'Package.swift was written')
  t.is(
    fs.readFileSync(path.join(dir, 'Sources', 'Schema.swift'), 'utf8'),
    schema.toCode(),
    'Sources/Schema.swift content matches toCode()'
  )
})

// Version evolution tests: these verify the Swift codegen handles schema
// changes correctly and are not representable as static fixtures.

test('swift: schema version — no bump on unchanged schema', { skip: isWindows }, (t) => {
  const s1 = SwiftHyperschema.from(null)
  s1.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s1.version, 1)

  const s2 = SwiftHyperschema.from(s1.toJSON())
  s2.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s2.version, 1)

  const result = runSwift(
    s2,
    [
      'let value = TestStruct(field1: 42)',
      'let buffer = encode(testStruct, value)',
      'let decoded = try! decode(testStruct, buffer)',
      'precondition(decoded.field1 == 42, "roundtrip failed: field1")',
      'print("OK")'
    ].join('\n')
  )
  t.ok(result.ok, result.stderr)
})

test('swift: schema version — bump on new field', { skip: isWindows }, (t) => {
  const s1 = SwiftHyperschema.from(null)
  s1.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s1.version, 1)

  const r1 = runSwift(
    s1,
    [
      'let value = TestStruct(field1: 10)',
      'let buffer = encode(testStruct, value)',
      'let decoded = try! decode(testStruct, buffer)',
      'precondition(decoded.field1 == 10, "roundtrip failed: field1")',
      'print("OK")'
    ].join('\n')
  )
  t.ok(r1.ok, r1.stderr)

  const s2 = SwiftHyperschema.from(s1.toJSON())
  s2.namespace('test').register({
    name: 'test-struct',
    fields: [
      { name: 'field1', type: 'uint', required: true },
      { name: 'field2', type: 'uint', required: true }
    ]
  })
  t.is(s2.version, 2)

  const r2 = runSwift(
    s2,
    [
      'let value = TestStruct(field1: 10, field2: 20)',
      'let buffer = encode(testStruct, value)',
      'let decoded = try! decode(testStruct, buffer)',
      'precondition(decoded.field1 == 10, "roundtrip failed: field1")',
      'precondition(decoded.field2 == 20, "roundtrip failed: field2")',
      'print("OK")'
    ].join('\n')
  )
  t.ok(r2.ok, r2.stderr)
})
