const c = require('compact-encoding')
const sameObject = require('same-object')

const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')
const generateCompactEncoders = require('./lib/codegen')

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
    return { version: 0, schema: this.types }
  }
}

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
      this.previous = hyperschema.previous.fullyQualifiedTypes.get(fqn)  
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
        if (prev.name !== current.name) {
          throw new Error(`Renaming an enum value: ${this.fqn}/${prev.name}`)  
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
      values: this.description.values,
      versions: this.versions
    }
  }
}

class StructField {
  constructor (hyperschema, struct, position, description) {
    this.hyperschema = hyperschema  
    this.description = description
    this.position = position
    this.struct = struct

    this.type = hyperschema.resolve(description.type)
    this.framed = this.type.isStruct && !this.type.description.compact

    this.version = description.version || 1

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
        this.version += 1
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
        throw new Error(`A field was removed: ${this.struct.fqn}`)  
      }
    }
    for (let i = 0; i < description.fields.length; i++) {
      const fieldDescription = description.fields[i]
      const field = new StructField(hyperschema, this, i, fieldDescription) 
      this.fields.push(field)  
      if (!fieldDescription.required) {
        const flag = 2 ** this.optionals.length
        this.optionals.push({ field, flag })  
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
    this.types = new Map()
  }

  register (fqn, description) {
    if (this.types.has(description.name)) throw new Error('Duplicate type description')
    let type = null
    if (description.alias) {
      type = new Alias(this.hyperschema, description, fqn)
    } else if (description.enum) {
      type = new Enum(this.hyperschema, description, fqn)  
    } else {
      type = new Struct(this.hyperschema, description, fqn)
    }
    this.types.set(description.name, type)
    return type
  }
}

module.exports = class Hyperschema {
  static Builder = Builder

  constructor (description, { previous = null } = {}) {
    this.description = description

    this.fullyQualifiedTypes = new Map()
    this.namespaces = new Map()
    this.orderedTypes = []

    this.previous = previous
    this.version = 1
    if (description.version) {
      this.version = description.version
    } else if (previous) {
      this.version = previous.version + 1
    }
    console.log('THIS.VERSION:', this.version)

    for (let i = 0; i < description.schema.length; i++) {
      const typeDescription = description.schema[i]
      if (!this.namespaces.has(typeDescription.namespace)) {
        const ns = new HyperschemaNamespace(this, typeDescription.namespace)
        this.namespaces.set(typeDescription.namespace, ns)
      }
      const ns = this.namespaces.get(typeDescription.namespace)
      const fqn = this._getFullyQualifiedName(typeDescription)
      const type = ns.register(fqn, typeDescription)

      const fullDescription = {
        description: typeDescription,
        name: fqn,
        type
      }
      this.fullyQualifiedTypes.set(fqn, type)
      this.orderedTypes.push(fullDescription)
    }
  }

  _getFullyQualifiedName (description) {
    return '@' + description.namespace + '/' + description.name
  }

  getStructVersions (type) {
    const prevType = this.previous && this.previous.fullyQualifiedTypes.get(type)
    if (prevType) return prevType.versions
    return { first: this.version, latest: this.version }
  }

  resolve (type) {
    if (Primitive.AllPrimitives.has(type)) return Primitive.AllPrimitives.get(type)
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

  toCode () {
    return generateCompactEncoders(this)
  }

  toJSON () {
    const output = {
      version: this.version,
      schema: []
    }
    for (const { type } of this.orderedTypes) {
      output.schema.push(type.toJSON())
    }
    return output
  }
}

function stripVersions (schema) {
  return schema.map(({ versions, fields, ...strippedType }) => {
    const strippedFields = fields?.map(({ version, ...strippedField }) => strippedField)
    if (!strippedFields) return strippedType
    return {
      ...strippedType,
      fields: strippedFields
    }
  })
}
