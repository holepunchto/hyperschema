const ns1 = {
  name: 'namespace-1',
  schema: []
}
const ns2 = {
  name: 'namespace-2',
  schema: []
}

ns2.schema.push({
  name: 'basic-alias',
  alias: 'string'
})

ns1.schema.push({
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

ns1.schema.push({
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

ns1.schema.push({
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

module.exports = [ns1, ns2]
