const p = require('path')
const fs = require('fs')
const tmp = require('test-tmp')

const Hyperschema = require('../../builder.cjs')

class TestBuilder {
  constructor(dir, test) {
    this.test = test
    this.dir = dir
    this.module = null
    this.version = 0
  }

  async rebuild(builder) {
    const schema = Hyperschema.from(this.dir)

    builder(schema)

    this.dir = await makeDir(this.test)

    Hyperschema.toDisk(schema, this.dir)

    this.module = require(this.dir)
    this.json = require(p.join(this.dir, 'schema.json'))

    return schema
  }

  resolve(name, version) {
    if (this.module) throw new Error('Module is not set on TestBuilder')
    return this.module.resolveStruct(name, version)
  }
}

async function makeDir(t) {
  const dir = await tmp(t, { dir: p.join(__dirname, '../test-storage') })

  // Copy the runtime into the tmp dir so that we don't need to override it in the codegen
  const runtimePath = p.join(dir, 'node_modules', 'hyperschema', 'runtime.cjs')
  await fs.promises.mkdir(p.dirname(runtimePath), { recursive: true })
  await fs.promises.copyFile(p.resolve(dir, '../../../runtime.cjs'), runtimePath)
  return dir
}

async function createTestSchema(t) {
  const dir = await makeDir(t)
  return new TestBuilder(dir, t)
}

module.exports = {
  createTestSchema
}
