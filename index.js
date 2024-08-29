const c = require('compact-encoding')

const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')

class BuilderNamespace {
  constructor (builder, name) {
    this.builder = builder
    this.name = name
  }

  register (description) {
    this.builder.types.push({ ...description, namespace: this.name })
  }
}
class Builder {
  constructor () {
    this.types = []
  }

  namespace (name) {
    return new BuilderNamespace(this, name)
  }

  toJSON () {
    return this.types
  }
}

class ResolvedType {
  constructor (hyperschema, description, fqn, version, opts = {}) {
    const { primitive, struct, fields, positionMap } = opts
    this.hyperschema = hyperschema
    this.description = description
    this.name = description.name
    this.namespace = description.namespace
    this.fqn = fqn

    this.fields = fields
    this.positionMap = positionMap
    this.version = version

    this.compact = !!description.compact
    this.struct = !!struct
    this.primitive = !!primitive
    this.bool = this.name === 'bool'
    this.default = getDefaultValue(this.name)

    this._bitfieldPosition = -1
    if (Number.isInteger(description.flagsPosition)) {
      this._bitfieldPosition = description.flagsPosition  
    }
    this._canEncode = false
    this._encodables = null
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
      const framed = !field.type.primitive && !field.type.compact
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
      this._encodables[i] = {
        default: array ? null : field.type.default,
        fqn: field.type.fqn,
        type: field.type,
        name: field.name,
        encoding,
        optional,
        framed,
        array,
        flag
      }
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
      res[field.name] = field.default
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

    const previous = hyperschema.previous ? hyperschema.previous.fullyQualifiedTypes.get(fqn) : null

    const fields = []
    const positionMap = new Map()
    let version = hyperschema.getBaseVersion(fqn)

    for (let i = 0; i < description.fields.length; i++) {
      const fieldDescription = description.fields[i]  
      const type = hyperschema.resolve(fieldDescription.type)
      const minVersion = (previous && previous.fields[i]) ? previous.version : hyperschema.version 
      const field = {
        ...fieldDescription,
        type: hyperschema.resolve(fieldDescription.type),
        version: Math.max(minVersion, type.version)   
      }
      const position = fields.push(field) - 1
      positionMap.set(field.name, position)
    }

    for (const field of fields) {
      if (field.version <= version) continue
      if (description.compact) throw new Error('Cannot change fields in a compact type: ' + fqn)
      version = field.version
    }

    return new this(hyperschema, description, fqn, version, {
      struct: true,
      positionMap,
      fields
    })
  }

  static PrimitiveResolvedTypes = new Map([...SupportedTypes].map(name => {
    const description = { name, namespace: null }
    return [name, new this(null, description, name, 1, { primitive: true })]
  }))
}

class HyperschemaNamespace {
  constructor (hyperschema, name) {
    this.hyperschema = hyperschema
    this.name = name
    this.types = new Map()
  }

  register (fqn, description) {
    if (this.types.has(description.name)) throw new Error('Duplicate type description')
    const type = ResolvedType.fromDescription(this.hyperschema, fqn, description)
    this.types.set(description.name, type)
    return type
  }
}

module.exports = class Hyperschema {
  static Builder = Builder

  constructor (types, { _previous = null, _version = 1 } = {}) {
    this.description = types

    this.fullyQualifiedTypes = new Map()
    this.namespaces = new Map()
    this.orderedTypes = []

    this.previous = _previous
    this.version = _version

    for (const description of types) {
      if (!this.namespaces.has(description.namespace)) {
        const ns = new HyperschemaNamespace(this, description.namespace)
        this.namespaces.set(description.namespace, ns)
      }
      const ns = this.namespaces.get(description.namespace)
      const fqn = this._getFullyQualifiedName(description)
      const type = ns.register(fqn, description)

      this.fullyQualifiedTypes.set(fqn, type)
      console.log('pusing description:', description)
      this.orderedTypes.push({
        version: type.version,
        description,
        name: fqn,
        type
      })
    }
  }

  _getFullyQualifiedName (description) {
    return '@' + description.namespace + '/' + description.name
  }

  getBaseVersion (type) {
    if (this.previous && this.previous.fullyQualifiedTypes.has(type)) return this.previous.version
    return this.version
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

  toJSON () {
    const output = {
      version: this.version,
      schema: []
    }
    for (const { name, namespace, description, type } of this.orderedTypes) {
      if (!description.fields) {
        output.schema.push({ ...description, version: type.version })
        continue
      } 
      output.schema.push({
        ...description,
        version: type.version,
        fields: description.fields.map((f, i) => {
          return {
            ...f,
            version: type.fields[i].version   
          }
        })   
      })
    }
    console.log('output is:', output)
    return output
  }

  static fromJSON (json) {
    if (!json.version) throw new Error('Previous version must be provided with fromJSON')
    return new this(json.schema, { _version: json.version })
  }
}
