const test = require('brittle')

const Hyperschema = require('..')

const createBasicSchema = require('./schemas/basic.js')

test.skip('basic persistence', t => {
  const schema1 = createBasicSchema()
  const str = schema1.toJSON()
  const schema2 = Hyperschema.fromJSON(str)
  t.is(schema1, schema2)
})

test('basic encoding', t => {
  const schema = createBasicSchema()

  /*
  {
    const expected = { bool1: true, bool2: false, bool3: true }
    const encoded = schema.encode('@namespace-1/basic-bools', expected)
    const decoded = schema.decode('@namespace-1/basic-bools', encoded)
    t.alike(decoded, expected)
  }
  */

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
