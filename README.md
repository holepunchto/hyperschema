# hyperschema
Create and update declarative/versioned binary encoding definitions.

Hyperschema provides a schema builder and a code generator that's designed to enforce versioning rules across updates. This is particularly useful for P2P systems where different peers will be using different schema versions.

Every schema update produces a corresponding version bump, and due to the append-only rule, you'll always be able to encode/decode an object with a particular schema version.

### Usage
With Hyperschema, you create namespaces and register struct definitions on those namespaces. The `from` function will attept to load an existing schema from an output directory. The `toDisk` function will write a `schema.json` file (for versioning) and a generated encodings file in `index.js`.
```js
const Hyperschema = require('.')

const schema = Hyperschema.from('./schema')
const ns1 = schema.namespace('namespace-1')
ns1.register({
  name: 'basic-struct',
  fields: [
    {
      name: 'id',
      type: 'uint',
      required: true
    },
    {
      name: 'other',
      type: 'uint'
    }
  ]
})

Hyperschema.toDisk(schema)
```

If you want to generate as ESM, simply use `import` instead of `require` above or set the option explictly in `toDisk` like so

```js
Hyperschema.toDisk(schema, { esm: true })
```

`index.js` will contain generated `compact-encoding` definitions. You can then load/use them as follows:
```js
const c = require('compact-encoding')
const { resolveStruct } = require('./schema')

const encoding = resolveStruct('@namespace-1/basic-struct', 1)

// { id: 10, other: 20 }
c.decode(c.encode(encoding, { id: 10, other: 20 }))
```

You can subsequently update your definition of `@namespace-1/basic-struct`, so long as that update follows append-only rules (i.e. only additional optional fields can be added).

Let's say we perform this update:
```js
ns1.register({
  name: 'basic-struct',
  fields: [
    {
      name: 'id',
      type: 'uint',
      required: true
    },
    {
      name: 'other',
      type: 'uint'
    },
    {
      name: 'another'.
      type: 'string'
    }
  ]
})
```

After rebuilding, you'll then be able to encode/decode with different versions of `@namespace-1/basic-struct`:
```js
const encoding1 = resolveStruct('@namespace-1/basic-struct', 1)
const encoding2 = resolveStruct('@namespace-1/basic-struct', 2)

// { id: 10, other: 20 }
c.decode(c.encode(encoding1, { id: 10, other: 20, another: 30 }))
// { id: 10, other: 20, another: 30 }
c.decode(c.encode(encoding2, { id: 10, other: 20, another: 30 }))
```

### Schema Definition
All struct definitions must take the following form:
```
{
  name: 'struct-name',
  compact?: true|false,
  flagsPosition?: -1,
  fields: [
    {
      name: 'fieldName',
      type: 'uint' || '@namespace/another-type' // either a built-in or a predefined type
    },
    ...
  ]
}
```

#### Struct Definition
* `name`: (required) A string name for you struct
* `fields`: (required) (defined below)
* `compact`: (optional) If this struct will be extended in the future (if embedded in another struct, will not frame the encoding)
* `flagsPosition`: (optional) The position that the flags for optional fields should be encoded at (default to before first optional field)

#### Struct Field Definitions
* `name`: (required) The name of the field. This should be camel-case.
* `type`: (required) Either a built-in type (i.e. `uint`) or a fully-qualified user-defined type (i.e. `@namespace/another-struct`)

#### Alias Definition
* `name`: (required) The name of the alias.
* `type`: (required) Either a built-in type (i.e. `uint`) or a fully-qualified user-defined type (i.e. `@namespace/another-struct`)

### API
Hyperschema lets you define structs and aliases. All [`compact-encoding`](https://github.com/holepunchto/compact-encoding) types are available as built-in types.

#### `const schema = Hyperschema.from(json|dir)`
Create a new Hyperschema instance, either from a JSON object or from an output directory path.

#### `Hyperschema.toDisk(schema)`
Persist the generated encodings for a Hyperschema instance (previously loaded with `Hyperschema.from(outputDir)`). If the encodings have changed, the version will be bumped.

#### `const ns = schema.namespace(name)`
Return a new schema namespace. All structs/aliases for this namespace will be registered with the `@name` prefix. You can then reference these structs/aliases in subsequent definitions.

#### `ns.register(definition)`
Register a new schema/alias definition on a namespace, as described in the Schema Definition section above.

### License
Apache 2.0
