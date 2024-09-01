#!/usr/bin/env node
const p = require('path')
const fs = require('fs')

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

let previousJson = null
let previous = null
if (exists) {
  previousJson = require(outputJsonPath)
  previous = new Hyperschema(previousJson)
}
const next = new Hyperschema(require(inputSchemaPath), { previous })
const nextJson = next.toJSON()

if (previous && (nextJson.version === previousJson.version)) {
  console.log('Schema has not been changed.')
  process.exit(0)
}

fs.writeFileSync(outputJsonPath, JSON.stringify(nextJson, null, 2) + '\n')

let code = next.toCode()
code += 'module.exports = hyperschema\n'
fs.writeFileSync(outputCencPath, code)

console.log('Schema JSON snapshot written to ' + outputJsonPath)
console.log('Compact encodings written to ' + outputCencPath)
process.exit(0)
