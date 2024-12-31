const fs = require('fs')
const p = require('path')

const {
  SupportedTypes,
  getDefaultValue
} = require('./lib/types.js')
const generateCode = require('./lib/codegen')

const JSON_FILE_NAME = 'schema.json'
const CODE_FILE_NAME = 'index.js'

class ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    this.hyperschema = hyperschema
    this.description = description
    this.name = description?.name || fqn
    this.namespace = description?.namespace || ''
    this.derived = description.derived
    this.existing = existing
    this.fqn = fqn

    this.isPrimitive = false
    this.isStruct = false
    this.isAlias = false

    this.version = -1
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
    super(null, name, name, null)
    this.isPrimitive = true
    this.bool = this.name === 'bool'
    this.default = getDefaultValue(this.name)
  }

  static AllPrimitives = new Map([...SupportedTypes].map(name => {
    return [name, new this(name)]
  }))
}

class Alias extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)
    this.isAlias = true

    this.type = hyperschema.resolve(description.alias)
    if (!this.type) throw new Error(`Cannot resolve alias target ${description.alias} in ${description.name}`)

    this.default = this.type.default

    if (existing) {
      if (existing.type.name !== this.type.name) {
        throw new Error(`Remapping an alias: ${fqn}`)
      }
      this.version = existing.version
    } else if (!this.derived) {
      this.hyperschema.maybeBumpVersion()
      this.version = this.hyperschema.version
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

class StructField {
  constructor (hyperschema, struct, position, flag, description) {
    this.hyperschema = hyperschema
    this.description = description
    this.name = this.description.name
    this.required = this.description.required
    this.external = this.description.external

    this.position = position
    this.struct = struct
    this.flag = flag

    this.type = hyperschema.resolve(description.type)
    if (!this.type) throw new Error(`Cannot resolve field type ${description.type} in ${this.name}`)

    this.framed = this.type.isStruct && !this.type.description.compact
    this.array = !!this.description.array

    this.version = description.version || hyperschema.version

    if (this.struct.existing) {
      const tag = `${this.struct.fqn}/${this.description.name}`
      const prevField = this.struct.existing.fields[position]
      if (prevField) {
        if (prevField.type.fqn !== this.type.fqn) {
          throw new Error(`Field was modified: ${tag}`)
        } else if (prevField.required !== this.required) {
          throw new Error(`A required field must always stay required: ${tag}`)
        }
        this.version = prevField.version
      } else if (!this.struct.derived) {
        hyperschema.maybeBumpVersion()
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
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)
    this.isStruct = true
    this.default = null
    this.validator = description.validator

    this.fields = []
    this.fieldsByName = new Map()

    this.optionals = []
    this.flagsPosition = -1
    this.compact = !!description.compact

    if (Number.isInteger(description.flagsPosition)) {
      this.flagsPosition = description.flagsPosition
    }

    if (!description.name) {
      throw new Error(`Struct ${this.fqn}: required 'name' definition is missing`)
    }

    if (!description.fields) {
      throw new Error(`Struct ${this.fqn}: required 'fields' definition is missing`)
    }

    if (this.existing) {
      const oldLength = this.existing.fields.length
      const newLength = this.description.fields.length
      if (oldLength > newLength) {
        throw new Error(`A field was removed: ${this.fqn}`)
      } else if (this.compact && (oldLength !== newLength)) {
        throw new Error(`A compact struct was expanded: ${this.fqn}`)
      }
    } else if (!this.derived) {
      this.hyperschema.maybeBumpVersion()
      this.version = this.hyperschema.version
    }

    for (let i = 0; i < description.fields.length; i++) {
      const fieldDescription = description.fields[i]

      // bools can only be set in the flag, so auto downgrade the from required
      // TODO: if we add semantic meaning to required, ie "user MUST set this", we should
      // add an additional state for this
      if (fieldDescription.required && fieldDescription.type === 'bool') {
        fieldDescription.required = false
      }
      const flag = !fieldDescription.required ? 2 ** this.optionals.length : 0
      const field = new StructField(hyperschema, this, i, flag, fieldDescription)

      this.fields.push(field)
      this.fieldsByName.set(field.name, field)

      if (!fieldDescription.required) {
        this.optionals.push(field)
        if (this.flagsPosition === -1) {
          this.flagsPosition = i
        }
      }
    }
  }

  getNamespace () {
    return this.hyperschema.namespaces.get(this.namespace)
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
    this.helpers = null
    this.id = hyperschema.namespaces.size
  }

  require (filename) {
    this.helpers = p.resolve(filename)
  }

  register (description) {
    return this.hyperschema.register({
      ...description,
      namespace: this.name
    })
  }
}

module.exports = class Hyperschema {
  constructor (json, { dir = null } = {}) {
    this.version = json ? json.version : 0
    this.schema = []
    this.dir = dir

    this.namespaces = new Map()
    this.positionsByType = new Map()
    this.typesByPosition = new Map()
    this.types = new Map()

    this.changed = false
    this.initializing = true
    if (json) {
      for (let i = 0; i < json.schema.length; i++) {
        const description = json.schema[i]
        this.register(description)
      }
    }
    this.initializing = false
  }

  _getFullyQualifiedName (description) {
    if (description.namespace === null) return description.name
    return '@' + description.namespace + '/' + description.name
  }

  maybeBumpVersion () {
    if (this.changed || this.initializing) return
    this.changed = true
    this.version += 1
  }

  register (description) {
    const fqn = this._getFullyQualifiedName(description)
    const existing = this.types.get(fqn)
    const existingPosition = this.positionsByType.get(fqn)

    let type = null
    if (description.alias) {
      type = new Alias(this, fqn, description, existing)
    } else {
      type = new Struct(this, fqn, description, existing)
    }
    this.types.set(fqn, type)

    const json = type.toJSON()
    if (existing) {
      this.schema[existingPosition] = json
    } else {
      const position = this.schema.push(json) - 1
      this.positionsByType.set(fqn, position)
      this.typesByPosition.set(position, fqn)
    }

    return type
  }

  namespace (name) {
    if (this.namespaces.has(name)) throw new Error('Namespace already exists')
    const ns = new HyperschemaNamespace(this, name)
    this.namespaces.set(name, ns)
    return ns
  }

  resolve (fqn, { aliases = true } = {}) {
    if (Primitive.AllPrimitives.has(fqn)) return Primitive.AllPrimitives.get(fqn)
    const type = this.types.get(fqn)
    if (!aliases && type.isAlias) return type.type
    return type
  }

  toJSON () {
    const json = { version: this.version, schema: this.schema.filter(t => !t.derived) }
    return json
  }

  toCode () {
    return generateCode(this)
  }

  static toDisk (hyperschema, dir) {
    if (!dir) dir = hyperschema.dir
    fs.mkdirSync(dir, { recursive: true })

    const jsonPath = p.join(p.resolve(dir), JSON_FILE_NAME)
    const codePath = p.join(p.resolve(dir), CODE_FILE_NAME)

    fs.writeFileSync(jsonPath, JSON.stringify(hyperschema.toJSON(), null, 2), { encoding: 'utf-8' })
    fs.writeFileSync(codePath, hyperschema.toCode(), { encoding: 'utf-8' })
  }

  static from (json) {
    if (typeof json === 'string') {
      const jsonFilePath = p.join(p.resolve(json), JSON_FILE_NAME)
      let exists = false
      try {
        fs.statSync(jsonFilePath)
        exists = true
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }
      if (exists) return new this(JSON.parse(fs.readFileSync(jsonFilePath)), { dir: json })
      return new this(null, { dir: json })
    }
    return new this(json)
  }
}
