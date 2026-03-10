const test = require('brittle')
const Hyperschema = require('../builder.cjs')
const generateSwift = require('../lib/swift-codegen')
const { runSwift } = require('./helpers/swift')
const { isWindows } = require('which-runtime')

test('swift: struct with single required uint — roundtrip', { skip: isWindows }, (t) => {
  const schema = Hyperschema.from(null)
  schema.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })

  const schemaSwift = generateSwift(schema)
  const mainSwift = `
import CompactEncoding
let value = TestStruct(field1: 42)
let buffer = encode(testStruct, value)
let decoded = try! decode(testStruct, buffer)
precondition(decoded.field1 == 42, "roundtrip failed: field1")
print("OK")
`
  const result = runSwift(schemaSwift, mainSwift)
  t.ok(result.ok, result.stderr)
})

test('swift: basic struct, all required fields, no version bump', { skip: isWindows }, (t) => {
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

  const schemaSwift = generateSwift(s2)
  const mainSwift = `
import CompactEncoding
let value = TestStruct(field1: 42)
let buffer = encode(testStruct, value)
let decoded = try! decode(testStruct, buffer)
precondition(decoded.field1 == 42, "roundtrip failed: field1")
print("OK")
`
  const result = runSwift(schemaSwift, mainSwift)
  t.ok(result.ok, result.stderr)
})

test('swift: basic struct, all required fields, version bump', { skip: isWindows }, (t) => {
  const schemaV1 = Hyperschema.from(null)
  schemaV1.namespace('test').register({
    name: 'test-struct',
    fields: [{ name: 'field1', type: 'uint', required: true }]
  })

  t.is(schemaV1.version, 1)

  {
    const schemaSwift = generateSwift(schemaV1)
    const mainSwift = `
import CompactEncoding
let value = TestStruct(field1: 10)
let buffer = encode(testStruct, value)
let decoded = try! decode(testStruct, buffer)
precondition(decoded.field1 == 10, "roundtrip failed: field1")
print("OK")
`
    const result = runSwift(schemaSwift, mainSwift)
    t.ok(result.ok, result.stderr)
  }

  const schemaV2 = Hyperschema.from(schemaV1.toJSON())
  schemaV2.namespace('test').register({
    name: 'test-struct',
    fields: [
      { name: 'field1', type: 'uint', required: true },
      { name: 'field2', type: 'uint', required: true }
    ]
  })

  t.is(schemaV2.version, 2)

  {
    const schemaSwift = generateSwift(schemaV2)
    const mainSwift = `
import CompactEncoding
let value = TestStruct(field1: 10, field2: 20)
let buffer = encode(testStruct, value)
let decoded = try! decode(testStruct, buffer)
precondition(decoded.field1 == 10, "roundtrip failed: field1")
precondition(decoded.field2 == 20, "roundtrip failed: field2")
print("OK")
`
    const result = runSwift(schemaSwift, mainSwift)
    t.ok(result.ok, result.stderr)
  }
})

test('swift: struct with multiple required uint fields — roundtrip', { skip: isWindows }, (t) => {
  const schema = Hyperschema.from(null)
  schema.namespace('test').register({
    name: 'test-struct',
    fields: [
      { name: 'field1', type: 'uint', required: true },
      { name: 'field2', type: 'uint', required: true }
    ]
  })

  const schemaSwift = generateSwift(schema)
  const mainSwift = `
import CompactEncoding
let value = TestStruct(field1: 10, field2: 200)
let buffer = encode(testStruct, value)
let decoded = try! decode(testStruct, buffer)
precondition(decoded.field1 == 10, "roundtrip failed: field1")
precondition(decoded.field2 == 200, "roundtrip failed: field2")
print("OK")
`
  const result = runSwift(schemaSwift, mainSwift)
  t.ok(result.ok, result.stderr)
})
