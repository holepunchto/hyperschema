const test = require('brittle')
const c = require('compact-encoding')

const { createTestSchema } = require('./helpers')

test.solo('basic struct, all required fields, version bump', async t => {
  const schema = await createTestSchema(t)

  schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: 'uint',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: 10 }
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }

  schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: 'uint',
          required: true
        },
        {
          name: 'field2',
          type: 'uint',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 2)
  t.is(schema.module.version, 2)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: 10, field2: 20 }
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }
})
