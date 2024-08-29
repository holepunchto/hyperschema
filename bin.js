#!/usr/bin/env node
const p = require('path')
const fs = require('fs')
const sameObject = require('same-object')

const Hyperschema = require('.')
const generateCompactEncoders = require('./lib/codegen')

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
  const st = fs.statSync(outputJsonPath)  
  exists = true
} catch (err) {
  if (err.code !== 'ENOENT') throw err  
}
if (!exists) {
  fs.mkdirSync(output, { recursive: true })
}

const prev = exists ? Hyperschema.fromJSON(require(outputJsonPath)) : null
const next = new Hyperschema(require(inputSchemaPath))

if (prev && sameObject(prev.description, next.description)) {
  console.log('Schema has not been changed.')
  process.exit(0)
}

const nextJson = next.toJSON()
if (prev) {
  nextJson.version = prev.version + 1  
}
console.log('NEXT JSON VERSION:', nextJson.version)

fs.writeFileSync(outputJsonPath, JSON.stringify(nextJson, null, 2) + '\n')
fs.writeFileSync(outputCencPath, generateCompactEncoders(next, nextJson.version))

console.log('Schema JSON snapshot written to ' + outputJsonPath)
console.log('Compact encodings written to ' + outputCencPath)
process.exit(0)
