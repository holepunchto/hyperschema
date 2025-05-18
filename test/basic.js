const test = require('brittle')
const c = require('compact-encoding')
const path = require('path')

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

    ns.require(path.join(__dirname, 'helpers/external.js'))

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
      versions: [
        {
          version: 0,
          type: '@test/v0',
          map: 'map'
        },
        {
          version: 2,
          type: '@test/v1'
        }
      ]
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/versioned')
    const expectedv0 = { version: 0, value: 10 }
    const expectedv1 = { version: 1, value: 10 }
    const expected = { version: 2, value: 10 }

    t.alike(expectedv0, c.decode(enc, c.encode(enc, { version: 0, value: '10' })))
    t.alike(expectedv1, c.decode(enc, c.encode(enc, { version: 1, value: 10 })))
    t.alike(expected, c.decode(enc, c.encode(enc, expected)))
  }
})

test('basic json type', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'json-struct',
      fields: [
        {
          name: 'jsonData',
          type: 'json',
          required: true
        },
        {
          name: 'optionalJson',
          type: 'json'
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  const enc = schema.module.resolveStruct('@test/json-struct')

  {
    const expected = { jsonData: { foo: 'bar', baz: [1, 2, true, null] }, optionalJson: null }
    const encoded = c.encode(enc, { jsonData: { foo: 'bar', baz: [1, 2, true, null] } })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON object and handle optional field')
  }

  {
    const expected = { jsonData: ['hello', { nested: 'world' }, 42], optionalJson: { check: 'this' } }
    const encoded = c.encode(enc, expected)
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON array and include optional field when provided')
  }

  {
    const expected = { jsonData: null, optionalJson: null }
    const encoded = c.encode(enc, { jsonData: null })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a null JSON value')
  }

  {
    const expected = { jsonData: 'a simple string', optionalJson: null }
    const encoded = c.encode(enc, { jsonData: 'a simple string' })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON string')
  }

  {
    const expected = { jsonData: 123.45, optionalJson: null }
    const encoded = c.encode(enc, { jsonData: 123.45 })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON number')
  }

  {
    const expected = { jsonData: true, optionalJson: null }
    const encoded = c.encode(enc, { jsonData: true })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON boolean (true)')
  }

  {
    const expected = { jsonData: false, optionalJson: null }
    const encoded = c.encode(enc, { jsonData: false })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode a JSON boolean (false)')
  }
})

test('basic ndjson type', async t => {
  const schema = await createTestSchema(t)

  await schema.rebuild(schema => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'ndjson-struct',
      fields: [
        {
          name: 'ndjsonData',
          type: 'ndjson',
          required: true
        },
        {
          name: 'optionalNdjson',
          type: 'ndjson' // optional by default
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  const enc = schema.module.resolveStruct('@test/ndjson-struct')

  {
    const expected = { ndjsonData: [{ foo: 'bar' }, { baz: 123 }], optionalNdjson: null }
    const encoded = c.encode(enc, { ndjsonData: [{ foo: 'bar' }, { baz: 123 }] })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode an array of JSON objects for ndjson and handle optional field')
  }

  {
    const expected = { ndjsonData: [{ id: 1, msg: 'hello' }], optionalNdjson: [{ status: 'ok' }] }
    const encoded = c.encode(enc, expected)
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode ndjson and include optional field when provided')
  }

  {
    const expected = { ndjsonData: [], optionalNdjson: null }
    const encoded = c.encode(enc, { ndjsonData: [] })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode an empty array for ndjson')
  }

  {
    const expected = { ndjsonData: null, optionalNdjson: null }
    const encoded = c.encode(enc, { ndjsonData: null })
    const decoded = c.decode(enc, encoded)
    t.alike(decoded, expected, 'should encode/decode null for ndjson')
  }
})
