const test = require('brittle')
const c = require('compact-encoding')
const fs = require('fs')
const path = require('path')

const Hyperschema = require('../builder.cjs')
const { createTestSchema } = require('./helpers')

test('basic struct, all required fields, version bump', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

  await schema.rebuild((schema) => {
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

test('basic struct, all required fields, no version bump', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

  await schema.rebuild((schema) => {
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

test('basic struct, one optional fields, version bump', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

  await schema.rebuild((schema) => {
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

test('basic struct, one optional fields, type alias, version bump', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

  await schema.rebuild((schema) => {
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

test('basic nested struct', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

test('flagsPosition', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-struct',
      flagsPosition: 1,
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
        },
        {
          name: 'field3',
          type: 'uint'
        },
        {
          name: 'field4',
          type: 'uint'
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const initial = { field1: 10, field2: 42, field4: 1337 }
    const encoded = c.encode(enc, initial)

    {
      const state = c.state(0, encoded.byteLength, encoded)
      const r0 = c.uint.decode(state)
      const flags = c.uint.decode(state)
      t.absent((flags & 1) !== 0, 'flag for field3')
      t.ok((flags & 2) !== 0, 'flag for field4')
    }

    const expected = { field1: 10, field2: 42, field3: 0, field4: 1337 }
    t.alike(c.decode(enc, encoded), expected)
  }
})

test('error if inlined struct isnt compact', async (t) => {
  const schema = await createTestSchema(t)

  await t.exception(
    () =>
      schema.rebuild((schema) => {
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
          // Compact is not required to throw the error but would cause error not to throw in previous bugged versions
          compact: true,
          fields: [
            {
              name: 'field1',
              type: '@test/interior-struct',
              inline: true
            }
          ]
        })
      }),
    /Struct .*: inline requires compact/
  )
})

test('inline - (en/de)codes', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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
          inline: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { field1: { field1: 10 } }
    const encoded = c.encode(enc, expected)
    t.alike(expected, c.decode(enc, encoded))

    const encInnerAlone = schema.module.resolveStruct('@test/interior-struct')
    const encodedInnerAlone = c.encode(encInnerAlone, expected.field1)
    t.absent(encoded.includes(encodedInnerAlone), "outer struct doesn't include inner struct flags")
    const encodedInnerWOFlags = encodedInnerAlone.slice(1)
    t.ok(encoded.includes(encodedInnerWOFlags), 'outer struct inlines inner w/o flags')
  }
})

test('inline - flagsPosition', async (t) => {
  const schema = await createTestSchema(t)

  const flagsPosition = 1
  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'interior-struct',
      compact: true,
      flagsPosition,
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
        },
        {
          name: 'field3',
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
          inline: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const initial = { field1: { field1: 10, field2: 42 } }
    const expected = { field1: { field1: 10, field2: 42, field3: 0 } }
    const encoded = c.encode(enc, initial)
    t.alike(c.decode(enc, encoded), expected)

    const encInnerAlone = schema.module.resolveStruct('@test/interior-struct')
    const encodedInnerAlone = c.encode(encInnerAlone, expected.field1)
    t.absent(encoded.includes(encodedInnerAlone), "outer struct doesn't include inner struct flags")

    // Inlined version will skip 2nd byte where it normally encodes flags
    const encodedInnerWOFlags = Buffer.alloc(encodedInnerAlone.byteLength - 1)
    encodedInnerAlone.copy(encodedInnerWOFlags, 0, 0, flagsPosition) // Copy required fields before flags
    encodedInnerAlone.copy(encodedInnerWOFlags, flagsPosition, flagsPosition + 1) // Copy everything after the flags

    t.ok(encoded.includes(encodedInnerWOFlags), 'outer struct inlines inner w/o flags')
  }
})

test('inline - inlining array throws error', async (t) => {
  const schema = await createTestSchema(t)

  await t.exception(
    () =>
      schema.rebuild((schema) => {
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
              array: true,
              inline: true
            }
          ]
        })
      }),
    /Struct .*: Arrays cannot be inlined/
  )
})

test('inline - record in struct throws error', async (t) => {
  const schema = await createTestSchema(t)

  await t.exception(
    () =>
      schema.rebuild((schema) => {
        const ns = schema.namespace('test')

        ns.register({
          name: 'test-struct',
          fields: [
            {
              name: 'field1',
              key: 'string',
              value: 'string',
              record: true
            }
          ]
        })
      }),
    /Record not supported as field. Use @example\/my-record/
  )
})

test('inline - recursively inlines inlined fields', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'layer2',
      compact: true,
      fields: [
        {
          name: 'foo',
          type: 'uint'
        }
      ]
    })
    ns.register({
      name: 'layer1',
      compact: true,
      fields: [
        {
          name: 'bar',
          type: '@test/layer2',
          inline: true
        }
      ]
    })
    ns.register({
      name: 'test-struct',
      fields: [
        {
          name: 'baz',
          type: '@test/layer1',
          inline: true
        }
      ]
    })
  })

  t.is(schema.json.version, 1)
  t.is(schema.module.version, 1)

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const expected = { baz: { bar: { foo: 42 } } }
    const encoded = c.encode(enc, expected)
    t.alike(expected, c.decode(enc, encoded))

    // Inline Layer 1
    const encInnerAlone = schema.module.resolveStruct('@test/layer1')
    const encodedInnerAlone = c.encode(encInnerAlone, expected.baz)
    t.absent(encoded.includes(encodedInnerAlone), "outer struct doesn't include inner struct flags")
    const encodedInnerWOFlags = encodedInnerAlone.slice(1)
    t.ok(encoded.includes(encodedInnerWOFlags), 'outer struct inlines inner w/o flags')

    // Inline layer 2
    const encInner2Alone = schema.module.resolveStruct('@test/layer2')
    const encodedInner2Alone = c.encode(encInner2Alone, expected.baz.bar)
    t.absent(
      encoded.includes(encodedInner2Alone),
      "outer struct doesn't include 2nd layer inner struct flags"
    )
    const encodedInner2WOFlags = encodedInner2Alone.slice(1)
    t.ok(encoded.includes(encodedInner2WOFlags), 'outer struct inlines 2nd layer inner w/o flags')
  }
})

test('basic required field missing', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

test('basic nested struct, version bump', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

  await schema.rebuild((schema) => {
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

test('basic array', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
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

test('basic record', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-record',
      record: true,
      key: 'string',
      value: 'uint'
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-record')
    const buf = c.encode(enc, {
      foo: 10,
      boo: 1
    })
    const dec = c.decode(enc, buf)

    t.alike(
      dec,
      Object.assign(Object.create(null), {
        foo: 10,
        boo: 1
      })
    )
  }
})

test('nested record', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-struct',
      compact: true,
      fields: [
        {
          name: 'nested',
          type: 'string',
          required: true
        }
      ]
    })

    ns.register({
      name: 'test-record',
      record: true,
      key: 'string',
      value: '@test/test-struct'
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-record')
    const buf = c.encode(enc, {
      foo: { nested: 'bar' },
      boo: { nested: 'bar' }
    })
    const dec = c.decode(enc, buf)

    t.alike(
      dec,
      Object.assign(Object.create(null), {
        foo: { nested: 'bar' },
        boo: { nested: 'bar' }
      })
    )
  }
})

test('basic enums', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-enum',
      enum: ['hello', 'world']
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

test('basic enums (strings)', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-enum',
      strings: true,
      enum: ['hello', 'world']
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

  t.alike(schema.module.getEnum('@test/test-enum'), {
    hello: 'hello',
    world: 'world'
  })

  t.alike(schema.json.schema[0].strings, true)
})

test('versioned struct', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.require(path.join(__dirname, 'helpers/external.js'))

    ns.register({
      name: 'v0',
      fields: [
        {
          name: 'value',
          type: 'string',
          required: true
        }
      ]
    })

    ns.register({
      name: 'v1',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        }
      ]
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

test('versioned struct gains a version in a later generation', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'thing-v1',
      fields: [
        {
          name: 'value',
          type: 'string',
          required: true
        }
      ]
    })

    ns.register({
      name: 'thing',
      versions: [
        {
          version: 1,
          type: '@test/thing-v1'
        }
      ]
    })
  })

  // the v2 struct appends after the wrapper in the lineage - reload must tolerate the forward ref
  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'thing-v2',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        }
      ]
    })

    ns.register({
      name: 'thing',
      versions: [
        {
          version: 1,
          type: '@test/thing-v1'
        },
        {
          version: 2,
          type: '@test/thing-v2'
        }
      ]
    })
  })

  await schema.rebuild(() => {})

  const enc = schema.module.resolveStruct('@test/thing')
  t.alike(c.decode(enc, c.encode(enc, { version: 1, value: '10' })), { version: 1, value: '10' })
  t.alike(c.decode(enc, c.encode(enc, { version: 2, value: 10 })), { version: 2, value: 10 })
})

test('versioned struct encodes the latest version by default', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'v1',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        }
      ]
    })

    ns.register({
      name: 'v2',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        },
        {
          name: 'label',
          type: 'string'
        }
      ]
    })

    ns.register({
      name: 'versioned',
      versions: [
        {
          version: 1,
          type: '@test/v1'
        },
        {
          version: 2,
          type: '@test/v2'
        }
      ]
    })
  })

  const enc = schema.module.resolveStruct('@test/versioned')

  t.alike(c.decode(enc, c.encode(enc, { value: 10 })), {
    version: 2,
    value: 10,
    label: null
  })
  t.alike(c.decode(enc, c.encode(enc, { version: 1, value: 10 })), { version: 1, value: 10 })
})

test('versioned struct with a map survives a reload', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.require(path.join(__dirname, 'helpers/external.js'))

    ns.register({
      name: 'v0',
      fields: [
        {
          name: 'value',
          type: 'string',
          required: true
        }
      ]
    })

    ns.register({
      name: 'v1',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        }
      ]
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
          version: 1,
          type: '@test/v1'
        }
      ]
    })
  })

  t.alike(schema.json.namespaces, [
    {
      name: 'test',
      external: path
        .relative(schema.dir, path.join(__dirname, 'helpers/external.js'))
        .replaceAll('\\', '/')
    }
  ])

  // reload from disk only: the maps file must be remembered without a new require call
  {
    const schemaReload = Hyperschema.from(schema.dir)
    t.execution(() => schemaReload.toCode({ filename: path.join(schema.dir, 'index-reloaded.js') }))
  }

  const schemaModuleLoaded = require(schema.dir)

  const enc = schemaModuleLoaded.resolveStruct('@test/versioned')
  t.alike(c.decode(enc, c.encode(enc, { version: 0, value: '10' })), { version: 0, value: 10 })
})

test('schema without externals persists no namespaces entry', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'plain',
      fields: [
        {
          name: 'value',
          type: 'uint',
          required: true
        }
      ]
    })
  })

  t.is(schema.json.namespaces, undefined)
})

test('alias, enum, field versions should not sync with schema version if no change in definition', async (t) => {
  const schema = await createTestSchema(t)

  // write to file a schema version mismatched with enum and alias versions
  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-alias',
      alias: 'uint'
    })
    ns.register({
      name: 'test-enum',
      enum: ['hello', 'world']
    })
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
    schema.version = 10 // create a gap in schema version
  })

  // load again from file
  // rebuild with no change in definition
  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')
    ns.register({
      name: 'test-alias',
      alias: 'uint'
    })
    ns.register({
      name: 'test-enum',
      enum: ['hello', 'world']
    })
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

  t.is(schema.json.version, 10)
  t.is(schema.module.version, 10)
  t.is(schema.json.schema[0].version, 1) // no change in alias version
  t.is(schema.json.schema[1].enum[0].version, 1) // no change in enum1 version
  t.is(schema.json.schema[1].enum[1].version, 1) // no change in enum2 version
  t.is(schema.json.schema[2].fields[0].version, 1) // no change in field1 version
  t.is(schema.json.schema[2].fields[1].version, 1) // no change in field2 version
})

test('basic json', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-json',
      compact: true,
      fields: [
        {
          name: 'foo',
          type: 'json',
          required: true
        }
      ]
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-json')
    const buf = c.encode(enc, { foo: { here: 'is json' } })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: { here: 'is json' } })
  }
})

test('basic default', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-default',
      compact: true,
      fields: [
        {
          name: 'foo',
          type: 'uint'
        },
        {
          name: 'bar',
          type: 'buffer',
          required: false,
          useDefault: true
        },
        {
          name: 'baz',
          type: 'buffer',
          required: false,
          useDefault: false
        },
        {
          name: 'far',
          type: 'buffer',
          required: false,
          useDefault: false
        }
      ]
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-default')
    const buf = c.encode(enc, { foo: 1, far: Buffer.alloc(3, 3) })
    const dec = c.decode(enc, buf)

    t.alike(dec, { foo: 1, bar: null, baz: undefined, far: Buffer.alloc(3, 3) })
  }
})

test('embedded versioned struct stays aligned when a later generation appends an optional field', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => define(schema, false))
  const gen1 = schema.module

  await schema.rebuild((schema) => define(schema, true))
  const gen2 = schema.module

  const tail = Buffer.alloc(32, 7)
  const value = {
    inner: { version: 1, count: 1, label: 'a', extra: 'b'.repeat(64) },
    tail
  }

  const encoded = c.encode(gen2.resolveStruct('@test/outer'), value)
  const decoded = c.decode(gen1.resolveStruct('@test/outer'), encoded)

  t.alike(decoded.inner, { version: 1, count: 1, label: 'a' })
  t.alike(decoded.tail, tail)

  function define(schema, extra) {
    const ns = schema.namespace('test')

    ns.register({
      name: 'inner-v1',
      fields: [
        { name: 'count', type: 'uint', required: true },
        { name: 'label', type: 'string' },
        ...(extra ? [{ name: 'extra', type: 'string' }] : [])
      ]
    })

    ns.register({
      name: 'inner',
      versions: [{ version: 1, type: '@test/inner-v1' }]
    })

    ns.register({
      name: 'outer',
      fields: [
        { name: 'inner', type: '@test/inner' },
        { name: 'tail', type: 'fixed32', required: true }
      ]
    })
  }
})

test('embedded versioned struct stays aligned when a later generation adds its first optional field', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => define(schema, false))
  const gen1 = schema.module

  await schema.rebuild((schema) => define(schema, true))
  const gen2 = schema.module

  const tail = Buffer.alloc(32, 9)

  // the new field is never set, but the flags byte it introduces still shifts an unframed embed
  const encoded = c.encode(gen2.resolveStruct('@test/outer'), {
    inner: { version: 1, count: 3 },
    tail
  })
  const decoded = c.decode(gen1.resolveStruct('@test/outer'), encoded)

  t.alike(decoded.inner, { version: 1, count: 3 })
  t.alike(decoded.tail, tail)

  function define(schema, optional) {
    const ns = schema.namespace('test')

    ns.register({
      name: 'inner-v1',
      fields: [
        { name: 'count', type: 'uint', required: true },
        ...(optional ? [{ name: 'label', type: 'string' }] : [])
      ]
    })

    ns.register({
      name: 'inner',
      versions: [{ version: 1, type: '@test/inner-v1' }]
    })

    ns.register({
      name: 'outer',
      fields: [
        { name: 'inner', type: '@test/inner' },
        { name: 'tail', type: 'fixed32', required: true }
      ]
    })
  }
})

test('embedded versioned struct round trips within and across generations', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => define(schema, false))
  const gen1 = schema.module

  await schema.rebuild((schema) => define(schema, true))
  const gen2 = schema.module

  const enc1 = gen1.resolveStruct('@test/outer')
  const enc2 = gen2.resolveStruct('@test/outer')
  const tail = Buffer.alloc(32, 4)

  {
    const value = { inner: { version: 1, count: 7, label: 'a', extra: 'e' }, tail }
    t.alike(c.decode(enc2, c.encode(enc2, value)), value)
  }

  {
    const value = { inner: { version: 1, count: 7, label: 'a' }, tail }
    t.alike(c.decode(enc2, c.encode(enc1, value)), {
      inner: { version: 1, count: 7, label: 'a', extra: null },
      tail
    })
  }

  function define(schema, extra) {
    const ns = schema.namespace('test')

    ns.register({
      name: 'inner-v1',
      fields: [
        { name: 'count', type: 'uint', required: true },
        { name: 'label', type: 'string' },
        ...(extra ? [{ name: 'extra', type: 'string' }] : [])
      ]
    })

    ns.register({
      name: 'inner',
      versions: [{ version: 1, type: '@test/inner-v1' }]
    })

    ns.register({
      name: 'outer',
      fields: [
        { name: 'inner', type: '@test/inner' },
        { name: 'tail', type: 'fixed32', required: true }
      ]
    })
  }
})

test('dont frame compact version of versioned struct', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => define(schema, false))
  const gen1 = schema.module

  await schema.rebuild((schema) => define(schema, true))
  const gen2 = schema.module

  const enc1 = gen1.resolveStruct('@test/outer')
  const enc2 = gen2.resolveStruct('@test/outer')
  const tail = Buffer.alloc(32, 4)

  {
    const value = { inner: { version: 2, count: 7, label: 'a', extra: 'e' }, tail }
    t.alike(c.decode(enc2, c.encode(enc2, value)), value, 'roundtrip on recent')
  }

  {
    const value = { inner: { version: 1, count: 7, label: 'a' }, tail }
    t.alike(
      c.decode(enc2, c.encode(enc1, value)),
      {
        inner: { version: 1, count: 7, label: 'a' },
        tail
      },
      'encode w/ 1 -> decode w/ 2'
    )
  }

  function define(schema, extra) {
    const ns = schema.namespace('test')

    ns.register({
      name: 'inner-v1',
      compact: true,
      fields: [
        { name: 'count', type: 'uint', required: true },
        { name: 'label', type: 'string' }
      ]
    })

    if (extra) {
      ns.register({
        name: 'inner-v2',
        fields: [
          { name: 'count', type: 'uint', required: true },
          { name: 'label', type: 'string' },
          { name: 'extra', type: 'string' }
        ]
      })
    }

    ns.register({
      name: 'inner',
      versions: [
        { version: 1, type: '@test/inner-v1' },
        ...(extra ? [{ version: 2, type: '@test/inner-v2' }] : [])
      ]
    })

    ns.register({
      name: 'outer',
      fields: [
        { name: 'inner', type: '@test/inner' },
        { name: 'tail', type: 'fixed32', required: true }
      ]
    })
  }
})

test('a newly declared versioned type is framed and records it', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild(define)

  t.is(schema.json.schema[1].framed, true)
  t.is(encodeOuter(schema.module).byteLength, 1 + 1 + 2 + 32)

  // the flag survives a reload
  await schema.rebuild(define)
  t.is(schema.json.schema[1].framed, true)
})

test('a newly declared versioned type can disable framing and records it', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => define(schema, false))

  t.is(schema.json.schema[1].framed, false)
  t.is(encodeOuter(schema.module).byteLength, 1 + 2 + 32)

  // the flag survives a reload
  await schema.rebuild(define)
  t.is(schema.json.schema[1].framed, false)
})

test('a schema written before framing keeps its layout', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild(define)
  dropFramed(schema.dir)

  await schema.rebuild(define)

  t.is(schema.json.schema[1].framed, false)
  t.is(encodeOuter(schema.module).byteLength, 1 + 2 + 32)

  // and stays grandfathered on every later build
  await schema.rebuild(define)
  t.is(schema.json.schema[1].framed, false)
})

test('a grandfathered versioned type can opt in to framing', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild(define)
  dropFramed(schema.dir)

  await schema.rebuild((schema) => define(schema, true))

  t.is(schema.json.schema[1].framed, true)
  t.is(encodeOuter(schema.module).byteLength, 1 + 1 + 2 + 32)
})

function dropFramed(dir) {
  const file = path.join(dir, 'schema.json')
  const json = JSON.parse(fs.readFileSync(file, 'utf-8'))
  for (const type of json.schema) delete type.framed
  fs.writeFileSync(file, JSON.stringify(json, null, 2))
}

function encodeOuter(module) {
  return c.encode(module.resolveStruct('@test/outer'), {
    inner: { version: 1, count: 3 },
    tail: Buffer.alloc(32, 1)
  })
}

function define(schema, framed = null) {
  const ns = schema.namespace('test')

  ns.register({
    name: 'inner-v1',
    fields: [{ name: 'count', type: 'uint', required: true }]
  })

  ns.register({
    name: 'inner',
    ...(framed == null ? {} : { framed }),
    versions: [{ version: 1, type: '@test/inner-v1' }]
  })

  ns.register({
    name: 'outer',
    fields: [
      { name: 'inner', type: '@test/inner' },
      { name: 'tail', type: 'fixed32', required: true }
    ]
  })
}
