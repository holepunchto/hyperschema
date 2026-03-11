'use strict'

// Shared schema definitions and test cases for multi-language codegen tests.
//
// Each fixture:
//   name     - human-readable description
//   register - function that registers types into any Hyperschema instance
//   cases    - test cases, each with:
//     type   - fully-qualified type name for JS codec lookup
//     value  - canonical JS value for encode/decode
//     swift  - Swift-specific info:
//       codec      - Swift codec variable name (e.g. 'testStruct')
//       encode     - Swift expression that constructs the value (e.g. 'TestStruct(field1: 10)')
//       assertions - Swift precondition lines run after decoding

module.exports = [
  {
    name: 'basic struct, required uint fields',
    register(schema) {
      const ns = schema.namespace('test')
      ns.register({
        name: 'test-struct',
        fields: [
          { name: 'field1', type: 'uint', required: true },
          { name: 'field2', type: 'uint', required: true }
        ]
      })
    },
    cases: [
      {
        type: '@test/test-struct',
        value: { field1: 10, field2: 200 },
        swift: {
          codec: 'testStruct',
          encode: 'TestStruct(field1: 10, field2: 200)',
          assertions: [
            'precondition(decoded.field1 == 10, "roundtrip failed: field1")',
            'precondition(decoded.field2 == 200, "roundtrip failed: field2")'
          ]
        }
      },
      {
        type: '@test/test-struct',
        value: { field1: 0, field2: 0 },
        swift: {
          codec: 'testStruct',
          encode: 'TestStruct(field1: 0, field2: 0)',
          assertions: [
            'precondition(decoded.field1 == 0, "roundtrip failed: field1")',
            'precondition(decoded.field2 == 0, "roundtrip failed: field2")'
          ]
        }
      }
    ]
  }
]
