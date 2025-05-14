const test = require('brittle')
const c = require('compact-encoding')

const { createTestSchema } = require('./helpers')

test('basic struct, all required fields, version bump', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
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

  await schema.rebuild(schema => {
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

test('basic struct, all required fields, no version bump', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
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

  await schema.rebuild(schema => {
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
})

test('basic struct, one optional fields, version bump', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
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

  await schema.rebuild(schema => {
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
          type: 'uint'
        }
      ]
    })
  })

  t.is(schema.json.version, 2)
  t.is(schema.module.version, 2)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: 10, field2: 0 }
    t.alike(expected, c.decode(enc, c.encode(enc, { field1: 10 })))
  }
})

test('basic struct, one optional fields, type alias, version bump', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-alias',
      alias: 'uint'
    })
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: '@test/test-alias',
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

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: '@test/test-alias',
          required: true
        },
        {
          name: 'field2',
          type: 'uint'
        }
      ]
    })
  })

  t.is(schema.json.version, 2)
  t.is(schema.module.version, 2)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: 10, field2: 0 }
    t.alike(expected, c.decode(enc, c.encode(enc, { field1: 10 })))
  }
})

test('basic nested struct', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'interior-struct',
      compact: true,
      fields: [
        {
          name: 'field1',
          type: 'uint'
        }
      ]
    })
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: '@test/interior-struct',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: { field1: 10 } }
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }
})

test('basic required field missing', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: 'string',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const missingRequired = { field2: 'badField' }
    try {
      c.encode(enc, missingRequired)
      t.fail('expected error')
    } catch (e) {
      t.pass('it passes')
    }
  }
})

test('basic nested struct, version bump', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'interior-struct',
      fields: [
        {
          name: 'field1',
          type: 'uint'
        }
      ]
    })
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: '@test/interior-struct',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: { field1: 10 } }
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'interior-struct',
      fields: [
        {
          name: 'field1',
          type: 'uint'
        },
        {
          name: 'field2',
          type: 'string'
        }
      ]
    })
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'field1',
          type: '@test/interior-struct',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.version, 2)
  t.is(schema.module.version, 2)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: { field1: 10, field2: 'hello world' } }
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }
})

test('basic array', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-struct',
      compact: true,
      fields: [
        {
          name: 'foo',
          type: 'string',
          required: true
        }
      ]
    })

    ns.register({
      name: 'test-array',
      array: true,
      type: '@test/test-struct'
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-array')
    const buf = c.encode(enc, [{ foo: 'bar' }, { foo: 'baz' }])
    const dec = c.decode(enc, buf)

    t.alike(dec, [{ foo: 'bar' }, { foo: 'baz' }])
  }
})

test('basic enums', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-enum',
      enum: [
        'hello',
        'world'
      ]
    })

    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'foo',
          type: '@test/test-enum',
          required: true
        }
      ]
    })
  })

  {
    const { hello } = schema.module.getEnum('@test/test-enum')
    const enc = schema.module.resolveStruct('@test/test-struct')
    const buf = c.encode(enc, { foo: hello })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: hello })
  }

  {
    const { world } = schema.module.getEnum('@test/test-enum')
    const enc = schema.module.resolveStruct('@test/test-struct')
    const buf = c.encode(enc, { foo: world })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: world })
  }

  t.alike(schema.module.getEnum('@test/test-enum'), { hello: 1, world: 2 })
})

test('basic enums (strings)', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-enum',
      strings: true,
      enum: [
        'hello',
        'world'
      ]
    })

    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'foo',
          type: '@test/test-enum',
          required: true
        }
      ]
    })
  })

  {
    const { hello } = schema.module.getEnum('@test/test-enum')
    const enc = schema.module.resolveStruct('@test/test-struct')
    const buf = c.encode(enc, { foo: hello })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: hello })
  }

  {
    const { world } = schema.module.getEnum('@test/test-enum')
    const enc = schema.module.resolveStruct('@test/test-struct')
    const buf = c.encode(enc, { foo: world })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: world })
  }

  t.alike(schema.module.getEnum('@test/test-enum'), { hello: 'hello', world: 'world' })
})

test('versioned struct', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'v0',
      fields: [{
        name: 'value',
        type: 'string',
        required: true
      }]
    })

    ns.register({
      name: 'v1',
      fields: [{
        name: 'value',
        type: 'uint',
        required: true
      }]
    })

    ns.register({
      name: 'versioned',
      versioned: [
        {
          type: '@test/v0',
          map: function (m) { return { value: Number(m.value) } }
        },
        {
          type: '@test/v1'
        }
      ]
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/versioned')
    const expectedv0 = { version: 0, value: 10 }
    const expected = { version: 1, value: 10 }

    t.alike(expectedv0, c.decode(enc, c.encode(enc, { version: 0, value: '10' })))
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }
})
