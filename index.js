const c = require('compact-encoding')

const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')

class ResolvedType {
  constructor (hyperschema, name, { primitive, struct, compact, fields, positionMap }) {
    this.hyperschema = hyperschema
    this.name = name
    this.fields = fields
    this.positionMap = positionMap

    this.struct = !!struct
    this.compact = !!compact
    this.primitive = !!primitive
    this.bool = name === 'bool'

    this._canEncode = false
    this._encodables = null
    this._bitfieldPosition = -1
    this._optionals = null
    this._encoding = null
  }

  // Done lazily in case we want to load code-generated encodings from disk instead
  get encoding () {
    if (this._encoding) return this._encoding
    if (this.primitive) {
      if (SupportedTypes.has(this.name)) {
        this._encoding = c[this.name]
      } else {
        throw new Error('Invalid primitive type: ' + this.name)
      }
    } else {
      this._preprocessEncoding()
      this._encoding = {
        preencode: this._preencode.bind(this),
        encode: this._encode.bind(this),
        decode: this._decode.bind(this)
      }
    }
    this._canEncode = true
    return this._encoding
  }

  _preprocessEncoding () {
    this._encodables = new Array(this.fields.length)
    this._optionals = []

    for (let i = 0; i < this.fields.length; i++) {
      const field = this.fields[i]
      const framed = (!field.primitive && !field.compact)
      const optional = !field.required
      const array = !!field.array

      let encoding = field.type.encoding
      if (array) encoding = c.array(encoding)
      if (framed) encoding = c.frame(encoding)

      let flag = 0
      if (optional) {
        if (this._bitfieldPosition === -1) {
          this._bitfieldPosition = i
        }
        flag = 2 ** this._optionals.length
        this._optionals.push({ name: field.name, flag })
      }
      this._encodables[i] = { name: field.name, type: field.type, encoding, optional, flag }
    }
  }

  _preencode (state, m) {
    if (!this._canEncode) throw new Error('Cannot encode or decode with this type')
    let flags = 0
    for (let i = 0; i < this._optionals.length; i++) {
      const optional = this._optionals[i]
      if (!m[optional.name]) continue
      flags |= optional.flag
    }
    for (let i = 0; i < this._encodables.length; i++) {
      if ((this._bitfieldPosition !== -1) && (i === this._bitfieldPosition)) {
        c.uint.preencode(state, flags)
      }
      const field = this._encodables[i]
      if (field.type.bool) continue
      const value = m[field.name]
      if (!value && field.optional) continue
      this._encodables[i].encoding.preencode(state, value)
    }
  }

  _encode (state, m) {
    if (!this._canEncode) throw new Error('Cannot encode or decode with this type')
    let flags = 0
    for (let i = 0; i < this._optionals.length; i++) {
      const optional = this._optionals[i]
      if (!m[optional.name]) continue
      flags |= optional.flag
    }
    for (let i = 0; i < this._encodables.length; i++) {
      if ((this._bitfieldPosition !== -1) && (i === this._bitfieldPosition)) {
        c.uint.encode(state, flags)
      }
      const field = this._encodables[i]
      if (field.type.bool) continue
      const value = m[field.name]
      if (!value && field.optional) continue
      this._encodables[i].encoding.encode(state, value)
    }
  }

  _decode (state) {
    if (!this._canEncode) throw new Error('Cannot encode or decode with this type')
    let flags = -1
    const res = {}
    for (let i = 0; i < this._encodables.length; i++) {
      const field = this._encodables[i]
      res[field.name] = getDefaultValue(field.type)
      if (field.optional && (flags === -1)) {
        if (state.start >= state.end) return res
        flags = c.uint.decode(state)
      }
      if (field.type.bool) {
        res[field.name] = (flags & field.flag) !== 0
      } else {
        if (field.flag && !((flags & field.flag) !== 0)) continue
        res[field.name] = field.encoding.decode(state)
      }
    }
    return res
  }

  encode (value) {
    return c.encode(this.encoding, value)
  }

  decode (value) {
    return c.decode(this.encoding, value)
  }

  static fromDescription (hyperschema, description) {
    if (description.alias) return hyperschema.resolve(description.alias)
    const fields = []
    const positionMap = new Map()

    for (const field of description.fields) {
      const type = hyperschema.resolve(field.type)
      const position = fields.push({ ...field, type }) - 1
      positionMap.set(field.name, position)
    }

    return new this(hyperschema, description.name, {
      compact: description.compact,
      struct: true,
      positionMap,
      fields
    })
  }

  static PrimitiveResolvedTypes = new Map([...SupportedTypes].map(name => {
    return [name, new this(null, name, { primitive: true })]
  }))
}

class HyperschemaNamespace {
  constructor (hyperschema, name) {
    this.hyperschema = hyperschema
    this.name = name
    this.types = new Map()
  }

  _getFullyQualifiedName (name) {
    return '@' + this.name + '/' + name
  }

  register (definition) {
    if (this.types.has(definition.name)) throw new Error('Duplicate type definition')
    const resolved = ResolvedType.fromDescription(this.hyperschema, definition)

    this.hyperschema.fullyQualifiedTypes.set(this._getFullyQualifiedName(definition.name), resolved)
    this.types.set(resolved.name, resolved)
  }
}

module.exports = class Hyperschema {
  constructor () {
    this.fullyQualifiedTypes = new Map()
    this.namespaces = new Map()
  }

  namespace (name) {
    if (this.namespaces.has(name)) throw new Error('Namespace already exists')
    const ns = new HyperschemaNamespace(this, name)
    this.namespaces.set(name, ns)
    return ns
  }

  resolve (type) {
    if (ResolvedType.PrimitiveResolvedTypes.has(type)) return ResolvedType.PrimitiveResolvedTypes.get(type)
    return this.fullyQualifiedTypes.get(type)
  }

  encode (type, value) {
    const resolved = this.fullyQualifiedTypes.get(type)
    return resolved.encode(value)
  }

  decode (type, value) {
    const resolved = this.fullyQualifiedTypes.get(type)
    return resolved.decode(value)
  }

  toJSON (opts) {
    const namespacesOutput = []

    const namespaces = [...this.namespaces.values()]
    namespaces.sort((a, b) => a.name.localeCompare(b.name))

    for (const namespace of namespaces) {
      const typesOutput = []

      const types = [...namespace.types.values()]
      types.sort((a, b) => a.name.localeCompare(b.name))

      for (const resolvedType of types) {
        typesOutput.push(resolvedType.fullDescription)
      }

      namespacesOutput.push({ name: namespace.name, types: typesOutput })
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
