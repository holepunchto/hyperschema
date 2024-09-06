const test = require('brittle')

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

  t.is(schema.version, 1)

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

  t.is(schema.version, 2)
})
