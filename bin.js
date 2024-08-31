#!/usr/bin/env node
const p = require('path')
const fs = require('fs')
const sameObject = require('same-object')

const Hyperschema = require('.')

const args = process.argv.slice(2)
const input = args[0]
const output = args[1]
if (!input || !output) {
  console.error('Usage: hyperschema [input.js] [outputDir]')
  process.exit(1)
}

const inputSchemaPath = p.resolve(input)
const outputDirPath = p.resolve(output)
const outputJsonPath = p.join(outputDirPath, 'schema.json')
const outputCencPath = p.join(outputDirPath, 'messages.js')

let exists = false
try {
  fs.statSync(outputJsonPath)
  exists = true
} catch (err) {
  if (err.code !== 'ENOENT') throw err
}
if (!exists) {
  fs.mkdirSync(output, { recursive: true })
}

let prevJson = null
let prev = null
if (exists) {
  prevJson = require(outputJsonPath)
  prev = Hyperschema.fromJSON(prevJson)
}
const next = new Hyperschema(require(inputSchemaPath), {
  _previous: prev,
  _version: prev ? prev.version + 1 : 1
})
const nextJson = next.toJSON()

if (prevJson && sameObject(prevJson.schema, nextJson.schema)) {
  console.log('Schema has not been changed.')
  process.exit(0)
}

fs.writeFileSync(outputJsonPath, JSON.stringify(nextJson, null, 2) + '\n')
fs.writeFileSync(outputCencPath, next.toCode())

console.log('Schema JSON snapshot written to ' + outputJsonPath)
console.log('Compact encodings written to ' + outputCencPath)
process.exit(0)
