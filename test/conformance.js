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

// Same reasoning: version-aware encoding is only covered while some fixture
// actually carries older versions of its schema
test('fixtures cover older schema versions', (t) => {
  t.ok(
    names.some((name) => readTest(name).versioned),
    'a fixture ships versioned encodings'
  )
})

for (const name of names) {
  test(`conformance, fixture ${name}`, async (t) => {
    const fixtureDir = p.join(fixturesDir, name)
    const json = JSON.parse(fs.readFileSync(p.join(fixtureDir, 'schema.json')))
    const { values, encoded, versioned } = readTest(name)

    const dir = await makeDir(t)
    Hyperschema.toDisk(Hyperschema.from(fixtureDir), dir)

    // Fixtures encode the last type registered in the schema
    const target = json.schema[json.schema.length - 1]
    const name_ = '@' + target.namespace + '/' + target.name
    const module = require(dir)

    check(t, module.resolveStruct(name_), values, encoded, 'latest')

    // Older versions of the same schema, oldest first, where the fixture has them
    for (const older of versioned || []) {
      const enc = module.resolveStruct(name_, older.version)
      const label = 'v' + older.version

      check(t, enc, older.values, older.encoded, label)

      // The stored values are already projected onto that version, so the above
      // passes even if the version is ignored. Encoding the latest values with
      // the older encoder is what proves fields above it are dropped.
      for (let i = 0; i < values.length; i++) {
        const expected = hex(older.encoded[i])
        const actual = c.encode(enc, revive(values[i])).toString('hex')

        t.is(actual, expected, `${label} truncates case ${i}`)
      }
    }
  })
}

function check(t, enc, values, encoded, label) {
  for (let i = 0; i < values.length; i++) {
    const expected = hex(encoded[i])

    t.is(c.encode(enc, revive(values[i])).toString('hex'), expected, `${label} encode ${i}`)

    // Decoding is only asserted through re-encoding: the builder encodes falsy
    // optionals as absent, so a decoded value need not match the input value
    const decoded = c.decode(enc, Buffer.from(expected, 'hex'))
    t.is(c.encode(enc, decoded).toString('hex'), expected, `${label} decode ${i}`)
  }
}

function readTest(name) {
  return JSON.parse(fs.readFileSync(p.join(fixturesDir, name, 'test.json')))
}

function fixtures() {
  return fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
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
