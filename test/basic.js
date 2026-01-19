const test = require('brittle')
const c = require('compact-encoding')
const path = require('path')

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

test('lexdate', async (t) => {
  const schema = await createTestSchema(t)

  await schema.rebuild((schema) => {
    const ns = schema.namespace('test')

    ns.register({
      name: 'test-struct',
      compact: true,
      fields: [
        {
          name: 'timestamp',
          type: 'lexdate',
          required: true
        }
      ]
    })
  })

  {
    const enc = schema.module.resolveStruct('@test/test-struct')
    const buf = c.encode(enc, { timestamp: new Date(-100) })
    const dec = c.decode(enc, buf)

    t.alike({ timestamp: new Date(-100) }, dec)

    const buf2 = c.encode(enc, { timestamp: new Date(99) })
    t.is(
      Buffer.compare(
        buf,
        // 1 off but positive to trip up normal date encoder
        buf2
      ),
      -1,
      'dates after epoch are sorted after preepoch dates'
    )
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
