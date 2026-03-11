'use strict'

const test = require('brittle')
const Hyperschema = require('../builder.cjs')
const generateSwift = require('../lib/swift-codegen')
const { runSwift } = require('./helpers/swift')
const { isWindows } = require('which-runtime')
const fixtures = require('./helpers/fixtures')

// Roundtrip tests driven by shared fixtures
for (const fixture of fixtures) {
  const swiftCases = fixture.cases.filter((c) => c.swift)
  if (!swiftCases.length) continue

  test(`swift: ${fixture.name}`, { skip: isWindows }, (t) => {
    const schema = Hyperschema.from(null)
    fixture.register(schema)

    const swiftCode = generateSwift(schema)

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

    const result = runSwift(swiftCode, lines.join('\n'))
    t.ok(result.ok, `Swift roundtrip failed:\n${result.stderr}`)
  })
}

// Version evolution tests: these verify the Swift codegen handles schema
// changes correctly and are not representable as static fixtures.

test('swift: schema version — no bump on unchanged schema', { skip: isWindows }, (t) => {
  const s1 = Hyperschema.from(null)
  s1.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s1.version, 1)

  const s2 = Hyperschema.from(s1.toJSON())
  s2.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s2.version, 1)

  const result = runSwift(
    generateSwift(s2),
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
  const s1 = Hyperschema.from(null)
  s1.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })
  t.is(s1.version, 1)

  const r1 = runSwift(
    generateSwift(s1),
    [
      'let value = TestStruct(field1: 10)',
      'let buffer = encode(testStruct, value)',
      'let decoded = try! decode(testStruct, buffer)',
      'precondition(decoded.field1 == 10, "roundtrip failed: field1")',
      'print("OK")'
    ].join('\n')
  )
  t.ok(r1.ok, r1.stderr)

  const s2 = Hyperschema.from(s1.toJSON())
  s2.namespace('test').register({
    name: 'test-struct',
    fields: [
      { name: 'field1', type: 'uint', required: true },
      { name: 'field2', type: 'uint', required: true }
    ]
  })
  t.is(s2.version, 2)

  const r2 = runSwift(
    generateSwift(s2),
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
