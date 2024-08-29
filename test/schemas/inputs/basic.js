const Hyperschema = require('../../..')
const schema = new Hyperschema.Builder()

const ns1 = schema.namespace('namespace-1')
const ns2 = schema.namespace('namespace-2')

ns2.register({
  name: 'basic-alias',
  alias: 'string'
})

ns1.register({
  name: 'basic-bools',
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
    }
  ]
})

ns1.register({
  name: 'basic-struct',
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
    }
  ]
})

module.exports = schema.toJSON()
