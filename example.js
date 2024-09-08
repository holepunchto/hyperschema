const Hyperschema = require('../../..')

module.exports = function createSchema (dir) {
  const schema = Hyperschema.from(dir)

  const ns1 = schema.namespace('namespace-1')
  const ns2 = schema.namespace('namespace-2')

  ns2.register({
    name: 'basic-enum',
    enum: true,
    values: [
      'value1',
      'value2',
      'value3',
      'value4',
      'value5',
      'value6'
    ]
  })

  ns2.register({
    name: 'basic-enum-2',
    enum: true,
    values: [
      'value1',
      'value2',
      'value3',
      'value4'
    ]
  })

  ns2.register({
    name: 'basic-alias',
    alias: 'string'
  })

  ns1.register({
    name: 'basic-bools',
    compact: true,
    fields: [
      {
        name: 'bool1',
        type: 'bool'
      },
      {
        name: 'bool2',
        type: 'bool'
      },
      {
        name: 'bool3',
        type: 'bool'
      },
      {
        name: 'bool4',
        type: 'bool'
      }
    ]
  })

  ns1.register({
    name: 'basic-no-optionals',
    fields: [
      {
        name: 'id',
        type: 'uint',
        required: true
      }
    ]
  })

  ns1.register({
    name: 'basic-single-optional',
    fields: [
      {
        name: 'id',
        type: 'uint'
      }
    ]
  })

  ns1.register({
    name: 'basic-struct',
    flagsPosition: 0,
    fields: [
      {
        name: 'id',
        type: 'uint',
        required: true
      },
      {
        name: 'basicString',
        type: 'string',
        required: true
      },
      {
        name: 'basicArray',
        type: 'uint',
        array: true
      },
      {
        name: 'basicAlias',
        type: '@namespace-2/basic-alias'
      },
      {
        name: 'anotherString',
        type: 'string'
      },
      {
        name: 'andAnother',
        type: 'uint'
      },
      {
        name: 'yetAnother',
        type: 'string'
      }
    ]
  })

  ns1.register({
    name: 'basic-compact-struct',
    compact: true,
    fields: [
      {
        name: 'id',
        type: 'uint',
        required: true
      },
      {
        name: 'basicString',
        type: 'string',
        required: true
      },
      {
        name: 'basicArray',
        type: 'uint',
        array: true
      },
      {
        name: 'basicAlias',
        type: '@namespace-2/basic-alias'
      },
      {
        name: 'anotherString',
        type: 'string'
      }
    ]
  })

  ns1.register({
    name: 'basic-embedded-struct',
    fields: [
      {
        name: 'outerString',
        type: 'string',
        required: true
      },
      {
        name: 'embedded',
        type: '@namespace-1/basic-struct'
      },
      {
        name: 'embedded2',
        type: '@namespace-1/basic-struct'
      },
      {
        name: 'embedded3',
        type: '@namespace-1/basic-struct'
      },
      {
        name: 'embedded4',
        type: '@namespace-1/basic-struct'
      }
    ]
  })

  ns1.register({
    name: 'basic-compact-embedded-struct',
    fields: [
      {
        name: 'outerString',
        type: 'string',
        required: true
      },
      {
        name: 'embeddedCompact',
        type: '@namespace-1/basic-compact-struct'
      }
    ]
  })

  ns1.register({
    name: 'deeper-embedded-struct',
    fields: [
      {
        name: 'outerString',
        type: 'string',
        required: true
      },
      {
        name: 'embedded',
        type: '@namespace-1/basic-embedded-struct'
      },
      {
        name: 'another',
        type: 'uint'
      }
    ]
  })

  ns1.register({
    name: 'deeper-embedded-struct-2',
    fields: [
      {
        name: 'outerString',
        type: 'string',
        required: true
      },
      {
        name: 'embedded',
        type: '@namespace-1/basic-embedded-struct'
      },
      {
        name: 'an-optional',
        type: 'string'
      },
      {
        name: 'another',
        type: 'uint'
      },
      {
        name: 'another-one',
        type: 'uint'
      }
    ]
  })

  Hyperschema.toDisk(schema, dir)
}