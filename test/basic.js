const test = require('brittle')

const Hyperschema = require('..')

const schema = require('./schemas/basic.js')

test('basic persistence', t => {
  const json1 = schema.toJSON()

  const schema2 = Hyperschema.fromJSON(json1)
  const json2 = schema2.toJSON()

  t.alike(json1, json2)
})

test('basic encoding', t => {
  {
    const expected = { bool1: true, bool2: false, bool3: true }
    const encoded = schema.encode('@namespace-1/basic-bools', expected)
    const decoded = schema.decode('@namespace-1/basic-bools', encoded)
    t.alike(decoded, expected)
  }
  {
    const expected = {
      id: 10,
      basicString: 'hello world',
      basicArray: [1, 2, 3, 4, 5],
      basicAlias: 'hello again'
    }
    const encoded = schema.encode('@namespace-1/basic-struct', expected)
    const decoded = schema.decode('@namespace-1/basic-struct', encoded)
    t.alike(decoded, expected)
  }
})
