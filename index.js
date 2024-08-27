const c = require('compact-encoding')

const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')

class ResolvedType {
  constructor (hyperschema, name, fqn, { primitive, struct, compact, fields, positionMap }) {
    this.hyperschema = hyperschema
    this.fqn = fqn
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
      this.preprocessEncoding()
      this._encoding = {
        preencode: this._preencode.bind(this),
        encode: this._encode.bind(this),
        decode: this._decode.bind(this)
      }
    }
    this._canEncode = true
    return this._encoding
  }

  preprocessEncoding () {
    if (this._encodables) return
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
      console.log('preencoding field:', field)
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

  generate () {
    if (this.primitive) return
    this.preprocessEncoding()
  }

  static fromDescription (hyperschema, fqn, description) {
    if (description.alias) return hyperschema.resolve(description.alias)
    const fields = []
    const positionMap = new Map()

    for (const field of description.fields) {
      const type = hyperschema.resolve(field.type)
      const position = fields.push({ ...field, type }) - 1
      positionMap.set(field.name, position)
    }

    return new this(hyperschema, description.name, fqn, {
      compact: description.compact,
      struct: true,
      positionMap,
      fields
    })
  }

  static PrimitiveResolvedTypes = new Map([...SupportedTypes].map(name => {
    return [name, new this(null, name, name, { primitive: true })]
  }))
}

class HyperschemaNamespace {
  constructor (hyperschema, name) {
    this.hyperschema = hyperschema
    this.name = name
    this.types = new Map()
    this._ordered = []
    this._orderedTypes = []
  }

  _getFullyQualifiedName (name) {
    return '@' + this.name + '/' + name
  }

  register (definition) {
    if (this.types.has(definition.name)) throw new Error('Duplicate type definition')
    const fqn = this._getFullyQualifiedName(definition.name)
    const type = ResolvedType.fromDescription(this.hyperschema, fqn, definition)

    this.hyperschema.fullyQualifiedTypes.set(fqn, type)
    this.types.set(type.name, type)

    this._orderedTypes.push({ name: fqn, type })
    this._ordered.push(definition)
  }
}

module.exports = class Hyperschema {
  constructor () {
    this.fullyQualifiedTypes = new Map()
    this.namespaces = new Map()
    this._ordered = []
  }

  namespace (name) {
    if (this.namespaces.has(name)) throw new Error('Namespace already exists')
    const ns = new HyperschemaNamespace(this, name)
    this.namespaces.set(name, ns)

    this._ordered.push(name)

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

  listTypes () {
    const types = []
    for (const namespaceName of this._ordered) {
      const namespace = this.namespaces.get(namespaceName)
      for (const { name, type } of namespace._orderedTypes) {
        types.push({ name, type })
      }
    }
    return types
  }

  toJSON (opts) {
    const output = []
    for (const namespaceName of this._ordered) {
      const msg = { name: namespaceName, types: [] }
      const namespace = this.namespaces.get(namespaceName)
      for (const definition of namespace._ordered) {
        msg.types.push(definition)
      }
      output.push(msg)
    }
    return output
  }

  static fromJSON (rawSchema) {
    const schema = new this()
    for (const { name, types } of rawSchema) {
      const ns = schema.namespace(name)
      for (const definition of types) {
        ns.register(definition)
      }
    }
    return schema
  }
}
