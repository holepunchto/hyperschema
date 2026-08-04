const test = require('brittle')
const c = require('compact-encoding')
const fs = require('fs')
const p = require('path')

const Hyperschema = require('../builder.cjs')
const { makeDir } = require('./helpers')

const fixturesDir = p.join(p.dirname(require.resolve('hyperschema-test/package')), 'fixtures')

const names = fixtures()

// Without this, a fixtures dir that ships empty or restructured makes the whole
// conformance suite pass by generating no tests at all
test('fixtures are installed', (t) => {
  t.ok(names.length > 0, 'hyperschema-test ships fixtures')
})

for (const name of names) {
  test(`conformance, fixture ${name}`, async (t) => {
    const fixtureDir = p.join(fixturesDir, name)
    const json = JSON.parse(fs.readFileSync(p.join(fixtureDir, 'schema.json')))
    const { values, encoded } = JSON.parse(fs.readFileSync(p.join(fixtureDir, 'test.json')))

    const dir = await makeDir(t)
    Hyperschema.toDisk(Hyperschema.from(fixtureDir), dir)

    // Fixtures encode the last type registered in the schema
    const target = json.schema[json.schema.length - 1]
    const enc = require(dir).resolveStruct('@' + target.namespace + '/' + target.name)

    for (let i = 0; i < values.length; i++) {
      const expected = hex(encoded[i])

      t.is(c.encode(enc, revive(values[i])).toString('hex'), expected, `encode ${i}`)

      // Decoding is only asserted through re-encoding: the builder encodes falsy
      // optionals as absent, so a decoded value need not match the input value
      const decoded = c.decode(enc, Buffer.from(expected, 'hex'))
      t.is(c.encode(enc, decoded).toString('hex'), expected, `decode ${i}`)
    }
  })
}

function fixtures() {
  return fs
    .readdirSync(fixturesDir)
    .filter((name) => fs.statSync(p.join(fixturesDir, name)).isDirectory())
    .sort((a, b) => Number(a) - Number(b))
}

function hex(encoded) {
  return typeof encoded === 'string' ? encoded : Buffer.from(encoded.data).toString('hex')
}

// JSON round trips buffers as { type: 'Buffer', data: [...] }
function revive(value) {
  if (Array.isArray(value)) return value.map(revive)
  if (value === null || typeof value !== 'object') return value
  if (value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data)

  const result = {}
  for (const key of Object.keys(value)) result[key] = revive(value[key])
  return result
}
