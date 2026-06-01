export = Hyperschema

declare class Hyperschema {
  constructor(json?: Hyperschema.SchemaJSON | null, opts?: Hyperschema.Options)

  version: number
  versioned: boolean
  dir: string | null

  register(description: Hyperschema.TypeDescription): Hyperschema.ResolvedType
  namespace(name: string): Hyperschema.Namespace
  resolve(fqn: string, opts?: { aliases?: boolean }): Hyperschema.ResolvedType
  toJSON(): Hyperschema.SchemaJSON
  toCode(opts?: Hyperschema.ToCodeOptions): string
  linkAll(): void
  maybeBumpVersion(): void

  static esm: boolean

  static from<T extends typeof Hyperschema>(
    this: T,
    json?: string | Hyperschema.SchemaJSON | null,
    opts?: Hyperschema.Options
  ): InstanceType<T>

  static toDisk(
    hyperschema: Hyperschema,
    dir?: string | null,
    opts?: Hyperschema.ToDiskOptions
  ): void
  static toDisk(hyperschema: Hyperschema, opts?: Hyperschema.ToDiskOptions): void
}

declare namespace Hyperschema {
  export interface Options {
    dir?: string | null
    versioned?: boolean
  }

  export interface ToCodeOptions {
    esm?: boolean
    filename?: string
  }

  export interface ToDiskOptions {
    esm?: boolean
  }

  export interface SchemaJSON {
    version: number
    schema: object[]
  }

  export interface Namespace {
    readonly name: string
    external: string | null
    require(filename: string): void
    register(description: TypeDescription): ResolvedType
  }

  export interface FieldDescription {
    name: string
    type: string
    required?: boolean
    array?: boolean
    inline?: boolean
    useDefault?: boolean
    version?: number
  }

  export interface EnumValue {
    key: string
    version?: number
  }

  export interface VersionMapping {
    version: number
    type: string
    map?: string
  }

  // A single registration. The kind keys (alias / enum / array / record /
  // versions / external) are mutually exclusive; with none present the
  // description is a struct and `fields` is required.
  export interface TypeDescription {
    name: string
    namespace?: string | null
    version?: number

    // struct
    fields?: FieldDescription[]
    compact?: boolean
    flagsPosition?: number

    // alias
    alias?: string

    // enum
    enum?: Array<string | EnumValue>
    offset?: number
    strings?: boolean

    // array
    array?: boolean
    type?: string

    // record
    record?: boolean
    key?: string
    value?: string

    // versioned
    versions?: VersionMapping[]

    // external
    external?: unknown
  }

  // The resolved type returned by `register` / `resolve`. Only the stable
  // identity and discriminant fields are surfaced here.
  export interface ResolvedType {
    readonly name: string
    readonly namespace: string
    readonly fqn: string
    readonly version: number
    readonly isPrimitive: boolean
    readonly isEnum: boolean
    readonly isStruct: boolean
    readonly isArray: boolean
    readonly isRecord: boolean
    readonly isAlias: boolean
    readonly isExternal: boolean
    readonly isVersioned: boolean
    toJSON(): object
  }
}
