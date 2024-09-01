const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')
const generateCode = require('./lib/codegen')

class ResolvedType {
  constructor (hyperschema, description, fqn) {
    this.hyperschema = hyperschema
    this.description = description
    this.name = description?.name || fqn
    this.namespace = description?.namespace || ''
    this.fqn = fqn

    this.isPrimitive = false
    this.isStruct = false
    this.isAlias = false
    this.isEnum = false

    this.version = 1
    this.previous = null
    if (hyperschema?.previous) {
      this.previous = hyperschema.previous.types.get(fqn)
    }
  }

  toJSON () {
    return {
      name: this.name,
      namespace: this.namespace
    }
  }
}

class Primitive extends ResolvedType {
  constructor (name) {
    super(null, null, name)
    this.isPrimitive = true
    this.bool = this.name === 'bool'
    this.default = getDefaultValue(this.name)
  }

  static AllPrimitives = new Map([...SupportedTypes].map(name => {
    return [name, new this(name)]
  }))
}

class Alias extends ResolvedType {
  constructor (hyperschema, description, fqn) {
    super(hyperschema, description, fqn)
    this.isAlias = true
    this.type = hyperschema.resolve(description.alias)
    this.default = this.type.default

    this.version = 1
    if (this.previous) {
      if (this.previous.type.name !== this.type.name) {
        throw new Error(`Remapping an alias: ${fqn}`)
      }
      this.version = this.previous.version
    }
  }

  toJSON () {
    return {
      name: this.name,
      namespace: this.namespace,
      alias: this.type.fqn,
      version: this.version
    }
  }
}

class Enum extends ResolvedType {
  constructor (hyperschema, description, fqn) {
    super(hyperschema, description, fqn)
    this.isEnum = true
    this.values = description.values
    this.versions = description.versions || []

    if (!description.versions) {
      for (let i = 0; i < description.values.length; i++) {
        this.versions.push(hyperschema.version)
      }
    }

    if (this.previous) {
      if (this.previous.versions.length > this.versions.length) {
        throw new Error(`Shrinking an enum: ${this.fqn}`)
      }
      for (let i = 0; i < this.previous.versions.length; i++) {
        const prev = this.previous.description.values[i]
        const current = this.description.values[i]
        if (prev !== current) {
          throw new Error(`Renaming an enum value: ${this.fqn}/${prev}`)
        }
        this.versions[i] = this.previous.versions[i]
      }
    }
  }

  toJSON () {
    return {
      enum: true,
      name: this.name,
      namespace: this.namespace,
      values: this.values,
      versions: this.versions
    }
  }
}

class StructField {
  constructor (hyperschema, struct, position, flag, description) {
    this.hyperschema = hyperschema
    this.description = description
    this.name = this.description.name

    this.position = position
    this.struct = struct
    this.flag = flag
    this.optional = flag !== 0

    this.type = hyperschema.resolve(description.type)
    this.framed = this.type.isStruct && !this.type.description.compact
    this.array = !!this.description.array

    this.version = description.version || hyperschema.version

    if (this.struct.previous) {
      const tag = `${this.struct.fqn}/${this.description.name}`
      const prevField = this.struct.previous.fields[position]
      if (prevField) {
        if (prevField.description.type !== this.description.type) {
          throw new Error(`Field was modified: ${tag}`)
        } else if (!prevField.description.required && this.description.required) {
          throw new Error(`Optional field was made required: ${tag}`)
        }
        this.version = prevField.version
      } else {
        this.version = hyperschema.version
      }
    }
  }

  toJSON () {
    return {
      name: this.description.name,
      required: this.description.required,
      array: this.description.array,
      type: this.type.fqn,
      version: this.version
    }
  }
}

class Struct extends ResolvedType {
  constructor (hyperschema, description, fqn) {
    super(hyperschema, description, fqn)
    this.isStruct = true
    this.default = null

    this.fields = []
    this.optionals = []
    this.flagsPosition = -1
    this.compact = !!description.compact

    if (Number.isInteger(description.flagsPosition)) {
      this.flagsPosition = description.flagsPosition
    }

    if (this.previous) {
      const oldLength = this.previous.fields.length
      const newLength = this.description.fields.length
      if (oldLength > newLength) {
        throw new Error(`A field was removed: ${this.fqn}`)
      } else if (this.compact && (oldLength !== newLength)) {
        throw new Error(`A compact struct was expanded: ${this.fqn}`)
      }
    }
    for (let i = 0; i < description.fields.length; i++) {
      const fieldDescription = description.fields[i]
      const flag = !fieldDescription.required ? 2 ** this.optionals.length : 0
      const field = new StructField(hyperschema, this, i, flag, fieldDescription)
      this.fields.push(field)
      if (!fieldDescription.required) {
        this.optionals.push(field)
        if (this.flagsPosition === -1) {
          this.flagsPosition = i
        }
      }
    }
  }

  toJSON () {
    return {
      name: this.name,
      namespace: this.namespace,
      compact: this.compact,
      flagsPosition: this.flagsPosition,
      fields: this.fields.map(f => f.toJSON())
    }
  }
}

class HyperschemaNamespace {
  constructor (hyperschema, name) {
    this.hyperschema = hyperschema
    this.name = name
  }

  register (description) {
    return this.hyperschema.register({
      ...description,
      namespace: this.name
    })
  }
}

module.exports = class Hyperschema {
  constructor ({ version = 1, previous = null } = {}) {
    this.namespaces = new Map()
    this.types = new Map()
    this.orderedTypes = []

    this.previous = previous
    this.version = previous ? previous.version + 1 : version
  }

  _getFullyQualifiedName (description) {
    return '@' + description.namespace + '/' + description.name
  }

  register (description) {
    const fqn = this._getFullyQualifiedName(description)
    if (this.types.has(fqn)) throw new Error('Duplicate type description')
    let type = null
    if (description.alias) {
      type = new Alias(this, description, fqn)
    } else if (description.enum) {
      type = new Enum(this, description, fqn)
    } else {
      type = new Struct(this, description, fqn)
    }

    const fullDescription = {
      description,
      name: fqn,
      type
    }
    this.types.set(fqn, type)
    this.orderedTypes.push(fullDescription)

    return type
  }

  namespace (name) {
    if (this.namespaces.has(name)) throw new Error('Namespace already exists')
    const ns = new HyperschemaNamespace(this, name)
    this.namespaces.set(name, ns)
    return ns
  }

  resolve (fqn) {
    if (Primitive.AllPrimitives.has(fqn)) return Primitive.AllPrimitives.get(fqn)
    return this.types.get(fqn)
  }

  toCode () {
    return generateCode(this)
  }

  toJSON () {
    const output = {
      version: this.version,
      schema: []
    }
    for (const { type } of this.orderedTypes) {
      output.schema.push(type.toJSON())
    }
    if (this.previous) {
      const curStr = JSON.stringify(output.schema)
      const prevStr = this.previous ? JSON.stringify(this.previous.toJSON().schema) : null
      if (curStr === prevStr) {
        // If nothing has changed between versions, do not bump it
        output.version -= 1
      }
    }
    return output
  }

  static fromJSON (json, opts) {
    const schema = new this({ ...opts, version: json.version })
    for (const typeDescription of json.schema) {
      schema.register(typeDescription)
    }
    return schema
  }
}
