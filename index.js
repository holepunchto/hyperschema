const IndexEncoder = require('index-encoder')
const c = require('compact-encoding')

const SupportedTypes = new Set([
  'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64',
  'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64',
  'string', 'utf8', 'ascii', 'hex', 'base64',
  'bigint', 'biguint64', 'bigint64',
  'fixed32', 'fixed64',
  'float32', 'float64',
  'lexint',
  'buffer',
  'bool'
])

const IndexTypeMap = new Map([
  ['uint', IndexEncoder.UINT],
  ['uint8', IndexEncoder.UINT],
  ['uint16', IndexEncoder.UINT],
  ['uint24', IndexEncoder.UINT],
  ['uint32', IndexEncoder.UINT],
  ['uint40', IndexEncoder.UINT],
  ['uint48', IndexEncoder.UINT],
  ['uint56', IndexEncoder.UINT],
  ['uint64', IndexEncoder.UINT],
  ['string', IndexEncoder.STRING],
  ['utf8', IndexEncoder.STRING],
  ['ascii', IndexEncoder.STRING],
  ['hex', IndexEncoder.STRING],
  ['base64', IndexEncoder.STRING],
  ['fixed32', IndexEncoder.BUFFER],
  ['fixed64', IndexEncoder.BUFFER],
  ['buffer', IndexEncoder.BUFFER]
])

class ResolvedType {
  constructor (hyperschema, { primitive, struct, bool, type, fields, positionMap }) {
    this.hyperschema = hyperschema
    this.type = type
    this.fields = fields
    this.positionMap = positionMap

    this.bool = !!bool
    this.struct = !!struct
    this.primitive = !!primitive

    this.encoding = this.primitive ? c[this.type] : createStructEncoding(this.fields, this.positionMap)
  }

  createIndexEncoding (primaryIndexFields) {
    // Strip out the index fields from the struct definition, so that they aren't duplicated in the value
    const positionMap = new Map([...this.positionMap])
    const fields = [...this.fields]
    for (const fieldName of primaryIndexFields) {
      const position = positionMap.get(fieldName)
      fields.splice(position, 1)
      positionMap.delete(fieldName)
    }
    return {
      keyEncoding: createIndexKeyEncoding(this, primaryIndexFields),
      valueEncoding: createStructEncoding(fields, positionMap)
    }
  }

  static fromDescription (description, resolver) {
    if (description.alias) return resolver(description.alias)
    const fields = []
    const positionMap = new Map()

    for (const field of description.fields) {
      const type = resolveType(field.type, resolver)
      const position = fields.push({ ...field, type }) - 1
      positionMap.set(field.name, position)
    }

    return new this(resolver, {
      compact: description.compact,
      type: description.name,
      struct: true,
      positionMap,
      fields
    })
  }

  static fromName (name, resolver) {
    return resolveType(name, resolver)
  }

  static PrimitiveResolvedTypes = new Map([...SupportedTypes].map(type => {
    return [type, new this(null, { primitive: true, type, bool: type === 'bool' })]
  }))
}

function resolveType (type, resolver) {
  if (ResolvedType.PrimitiveResolvedTypes.has(type)) return ResolvedType.PrimitiveResolvedTypes.get(type)
  return resolver(type)
}

function createIndexKeyEncoding (targetType, fieldNames) {
  const keys = []

  for (const fieldName of fieldNames) {
    const targetField = targetType.fields[targetType.positionMap.get(fieldName)]
    if (!targetField) throw new Error('Invalid key field ' + fieldName)

    const fieldIndexEncoding = IndexTypeMap.get(targetField.type.type)
    if (!fieldIndexEncoding) throw new Error('Invalid index key type:' + targetField.type)

    keys.push(fieldIndexEncoding)
  }

  return new IndexEncoder(keys)
}

class HyperschemaNamespace {
  constructor (hyperschema, name) {
    this._hyperschema = hyperschema
    this._name = name
    this._types = new Map()
  }

  add (definition) {

  }
}

module.exports = class Hyperschema {
  constructor () {
    this._fullyQualifiedTypes = new Map()
    this._namespaces = new Map()
  }

  namespace (name) {
    if (this._namespaces.has(name)) throw new Error('Namespace already exists')
    const ns = new HyperschemaNamespace(this, name)
    this._namespaces.set(name, ns)
    return ns
  }

  encode (type, value) {
  }

  decode (type, value) {

  }

  toJSON (opts) {
    const namespacesOutput = []

    const namespaces = [...this._namespaces]
    namespaces.sort((a, b) => a[0].localeCompare(b[0]))

    for (const [namespaceName, namespace] of namespaces) {
      const typesOutput = []

      const types = [...namespace._types]
      types.sort((a, b) => a[0].localeCompare(b[0]))

      for (const [typeName, resolvedType] of types) {
        typesOutput.push(resolvedType.fullDescription)
      }

      namespacesOutput.push({ name: ns.name, types: typesOutput })
    }

    return namespacesOutput
  }

  static fromJSON (rawSchema) {
    const schema = new this()
    for (const namespace of rawSchema) {
      const ns = schema.namespace(namespace.name)
      for (const type of namespace.types) {
        ns.add(type)
      }
    }
    return schema
  }
}

// TODO: We should codegen this
function createStructEncoding (fields, positionMap) {
  const encodables = new Array(fields.length)
  const optionals = []

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const framed = (!field.primitive && !field.compact)
    const optional = !field.required

    let encoding = field.type.encoding
    if (field.array) encoding = c.array(encoding)
    if (field.framed) encoding = c.frame(encoding)

    let flag = 0
    if (optional) {
      flag = 2 ** optionals.length
      optionals.push(i)
    }
    encodables[i] = { bool: !!field.bool, encoding, optional, flag }
  }

  return {
    preencode (state, m) {
      let flags = 0
      for (let i = 0; i < optionals.length; i++) {
        if (!m[fields[optionals[i]].name]) continue
        flags |= encodables[optionals[i]].flag
      }
      c.uint.preencode(state, flags)
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i]
        if (field.type.bool) continue
        const value = m[field.name]
        if (!value && field.optional) continue
        encodables[i].encoding.preencode(state, value)
      }
    },
    encode (state, m) {
      let flags = 0
      for (let i = 0; i < optionals.length; i++) {
        if (!m[fields[optionals[i]].name]) continue
        flags |= encodables[optionals[i]].flag
      }
      c.uint.encode(state, flags)
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i]
        if (field.type.bool) continue
        const value = m[field.name]
        if (!value && field.optional) continue
        encodables[i].encoding.encode(state, value)
      }
    },
    decode (state) {
      const flags = c.uint.decode(state)
      const res = {}
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i]
        const encoding = encodables[i]
        if (field.type.bool) {
          res[field.name] = (flags & encoding.flag) !== 0
        } else {
          if (encoding.flag && !((flags & encoding.flag) !== 0)) continue
          res[field.name] = encoding.encoding.decode(state)
        }
      }
      return res
    }
  }
}
