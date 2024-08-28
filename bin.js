#!/usr/bin/env node
const p = require('path')

const Hyperschema = require('.')
const generateCompactEncoders = require('./lib/codegen')

const args = process.argv.slice(2)
const input = args[0]
const flag = args[1]
if (!input || !flag) {
  console.error('Usage: hyperschema [input] (--json or --cenc)')
}

const inputPath = p.resolve(input)
let schema = null
if (p.extname(input) === '.js') {
  schema = require(inputPath)
} else if (p.extname(input) === '.json') {
  schema = Hyperschema.fromJSON(require(inputPath))
} else {
  throw new Error('Invalid input file')
}
if (flag === '--json') {
  console.log(JSON.stringify(schema.toJSON(), null, 2))
} else if (flag === '--cenc') {
  console.log(generateCompactEncoders(schema))
}
