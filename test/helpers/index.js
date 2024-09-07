const p = require('path')
const fs = require('fs')
const tmp = require('test-tmp')

const Hyperschema = require('../..')

class TestBuilder {
  constructor (dir) {
    this.dir = dir
    this.module = null
    this.version = 0
  }

  rebuild (builder) {
    const schema = Hyperschema.from(this.dir)

    builder(schema)

    Hyperschema.toDisk(schema, this.dir)
    if (this.module) {
      delete require.cache[require.resolve(this.dir)]
      delete require.cache[require.resolve(p.join(this.dir, 'schema.json'))]
    }

    this.module = require(this.dir)
    this.json = require(p.join(this.dir, 'schema.json'))

    return schema
  }

  resolve (name, version) {
    if (this.module) throw new Error('Module is not set on TestBuilder')
    return this.module.resolveStruct(name, version)
  }
}

async function createTestSchema (t) {
  const dir = await tmp(t, { dir: p.join(__dirname, '../test-storage') })

  // Copy the runtime into the tmp dir so that we don't need to override it in the codegen
  const runtimePath = p.join(dir, 'node_modules', 'hyperschema', 'runtime.js')
  await fs.promises.mkdir(p.dirname(runtimePath), { recursive: true })
  await fs.promises.copyFile(p.resolve(dir, '../../../runtime.js'), runtimePath)

  return new TestBuilder(dir)
}

module.exports = {
  createTestSchema
}
