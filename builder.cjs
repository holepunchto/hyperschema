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
    this.isEnum = false
    this.isStruct = false
    this.isArray = false
    this.isAlias = false
    this.isExternal = false
    this.isVersioned = false

    this.version = -1
  }

  link () {}

  frameable () {
    return false
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

  frameable () {
    return this.type.frameable()
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

class ExternalType extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)

    this.isExternal = true
    this.filename = hyperschema.namespaces.get(description.namespace)?.external || null
    this.external = description.external
  }

  require (filename) {
    return p.relative(p.join(filename, '..'), p.resolve(this.filename))
      .replaceAll('\\', '/')
  }

  toJSON () {
    return {
      name: this.description.name,
      namespace: this.namespace,
      external: this.description.external
    }
  }
}

class Enum extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)

    this.isEnum = true
    this.enum = []
    this.offset = typeof description.offset === 'number' ? description.offset : 1
    this.default = description.strings ? null : 0
    this.strings = !!description.strings

    if (this.existing) {
      if (!this.existing.enum) {
        throw new Error('Previous declaration was not an enum')
      }

      if (this.existing.enum.length > description.enum.length) {
        throw new Error('An enum value was removed')
      }
    }

    for (let i = 0; i < description.enum.length; i++) {
      const d = description.enum[i]
      const key = typeof d === 'string' ? d : d.key
      const prev = i < this.existing?.enum.length ? this.existing.enum[i] : null

      if (prev && prev.key !== key) {
        throw new Error(`Enum ${i} in ${fqn} changed. Was "${prev.key}" but is now "${key}`)
      }

      if (!prev) {
        hyperschema.maybeBumpVersion()
      }

      this.enum.push({
        key,
        version: prev ? prev.version : hyperschema.version
      })
    }
  }

  toJSON () {
    return {
      name: this.description.name,
      namespace: this.namespace,
      offset: this.offset,
      enum: this.enum
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

    this.type = hyperschema.resolve(description.type) || null
    this.typeFqn = this.type ? this.type.fqn : description.type

    this.array = !!this.description.array

    this.version = description.version || hyperschema.version

    if (this.struct.existing) {
      const tag = `${this.struct.fqn}/${this.description.name}`
      const prevField = this.struct.existing.fields[position]

      if (prevField) {
        if (prevField.typeFqn !== this.typeFqn) {
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

  link () {
    if (this.type === null) this.type = this.hyperschema.resolve(this.description.type) || null
    if (this.type === null) throw new Error(`Cannot resolve field type ${this.description.type} in ${this.name}`)
  }

  get framed () {
    return this.type.frameable()
  }

  toJSON () {
    return {
      name: this.description.name,
      required: this.description.required,
      array: this.description.array,
      type: this.typeFqn,
      version: this.version
    }
  }
}

class Array extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)
    this.isArray = true
    this.default = null

    if (!description.type) {
      throw new Error(`Array ${this.fqn}: required 'type' definition is missing`)
    }

    this.type = hyperschema.resolve(description.type)
    this.framed = this.type.frameable()

    if (!description.name) {
      throw new Error(`Array ${this.fqn}: required 'name' definition is missing`)
    }

    if (!description.namespace) {
      throw new Error(`Array ${this.fqn}: required 'namespace' definition is missing`)
    }

    if (this.existing) {
      if (this.existing.type.fqn !== this.type.fqn) {
        throw new Error(`Array was modified: ${this.fqn}`)
      }
    }
  }

  toJSON () {
    return {
      name: this.name,
      namespace: this.namespace,
      array: true,
      type: this.type.fqn
    }
  }
}

class VersionedType extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)
    this.isVersioned = true
    this.default = null
    this.filename = hyperschema.namespaces.get(description.namespace)?.external || null

    if (!description.versions) {
      throw new Error(`VersionedType ${this.fqn}: required 'versions' definition is missing`)
    }

    this.versions = description.versions.map(v => {
      return {
        type: hyperschema.resolve(v.type),
        version: v.version,
        map: v.map || null
      }
    })

    for (const v of this.versions) {
      v.type.expectsVersion = true
    }

    this.framed = true

    if (!description.name) {
      throw new Error(`VersionedType ${this.fqn}: required 'name' definition is missing`)
    }

    if (!description.namespace) {
      throw new Error(`VersionedType ${this.fqn}: required 'namespace' definition is missing`)
    }

    if (this.existing) {
      if (this.existing.type.fqn !== this.type.fqn) {
        throw new Error(`VersionedType was modified: ${this.fqn}`)
      }
    }
  }

  require (filename) {
    return p.relative(p.join(filename, '..'), p.resolve(this.filename))
      .replaceAll('\\', '/')
  }

  toJSON () {
    return {
      name: this.name,
      namespace: this.namespace,
      versions: this.versions.map(version => ({ type: version.type.fqn, map: version.map, version: version.version }))
    }
  }
}

class Struct extends ResolvedType {
  constructor (hyperschema, fqn, description, existing) {
    super(hyperschema, fqn, description, existing)
    this.isStruct = true
    this.default = null
    this.expectsVersion = false

    this.fields = []
    this.fieldsByName = new Map()

    this.optionals = []
    this.flagsPosition = -1
    this.linked = 0

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

  link () {
    for (const f of this.fields) f.link()
  }

  frameable () {
    return !this.compact
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
    this.external = null
  }

  require (filename) {
    this.external = filename
  }

  register (description) {
    return this.hyperschema.register({
      ...description,
      namespace: this.name
    })
  }
}

module.exports = class Hyperschema {
  constructor (json, { dir = null, versioned = true } = {}) {
    this.version = json ? json.version : versioned ? 0 : 1
    this.versioned = versioned
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
    this.linkAll() // link all existing ones
  }

  static esm = false

  _getFullyQualifiedName (description) {
    if (description.namespace === null) return description.name
    return '@' + description.namespace + '/' + description.name
  }

  maybeBumpVersion () {
    if (this.changed || this.initializing) return
    this.changed = true
    if (this.versioned) this.version += 1
  }

  linkAll () {
    for (const t of this.types.values()) t.link()
  }

  register (description) {
    const fqn = this._getFullyQualifiedName(description)
    const existing = this.types.get(fqn)
    const existingPosition = this.positionsByType.get(fqn)

    let type = null
    if (description.alias) {
      type = new Alias(this, fqn, description, existing)
    } else if (description.enum) {
      type = new Enum(this, fqn, description, existing)
    } else if (description.array) {
      type = new Array(this, fqn, description, existing)
    } else if (description.external) {
      type = new ExternalType(this, fqn, description, existing)
    } else if (description.versions) {
      type = new VersionedType(this, fqn, description, existing)
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
    this.linkAll()

    const json = { version: this.version, schema: this.schema.filter(t => !t.derived) }
    return json
  }

  toCode ({ esm = this.constructor.esm, filename } = {}) {
    this.linkAll()

    return generateCode(this, { esm, filename })
  }

  static toDisk (hyperschema, dir, opts) {
    if (typeof dir === 'object' && dir) {
      opts = dir
      dir = null
    }

    hyperschema.linkAll()

    if (!dir) dir = hyperschema.dir
    fs.mkdirSync(dir, { recursive: true })

    const jsonPath = p.join(p.resolve(dir), JSON_FILE_NAME)
    const codePath = p.join(p.resolve(dir), CODE_FILE_NAME)

    fs.writeFileSync(jsonPath, JSON.stringify(hyperschema.toJSON(), null, 2), { encoding: 'utf-8' })
    fs.writeFileSync(codePath, hyperschema.toCode({ ...opts, filename: codePath }), { encoding: 'utf-8' })
  }

  static from (json, opts) {
    if (typeof json === 'string') {
      const jsonFilePath = p.join(p.resolve(json), JSON_FILE_NAME)
      let exists = false
      try {
        fs.statSync(jsonFilePath)
        exists = true
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
      }
      if (exists) return new this(JSON.parse(fs.readFileSync(jsonFilePath)), { ...opts, dir: json })
      return new this(null, { ...opts, dir: json })
    }
    return new this(json, opts)
  }
}
