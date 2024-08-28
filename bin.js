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
}

const inputSchemaPath = p.resolve(input)
const outputJsonPath = p.join(p.resolve(output), 'schema.json') 
const outputCencPath = p.join(p.resolve(output), 'messages.js')

let exists = false
try {
  const st = fs.statSync(outputJsonPath)  
  exists = true
} catch (err) {
  if (err.code !== 'ENOENT') throw err  
}

const prev = exists ? Hyperschema.fromJSON(require(outputJsonPath)) : null
const next = new Hyperschema(require(inputSchemaPath))

if (prev && sameObject(prev.orderedTypes, next.orderedTypes)) {
  console.log('Schema has not been changed.')
  process.exit(0)
}

const nextJson = next.toJSON()
if (prev) {
  nextJson.version = prev.version + 1  
}

fs.writeFileSync(outputJsonPath, JSON.stringify(nextJson, null, 2))
fs.writeFileSync(outputCencPath, generateCompactEncoders(next))

console.log('Schema JSON snapshot written to ' + outputJsonPath)
console.log('Compact encodings written to ' + outputCencPath)
process.exit(0)
