#!/usr/bin/env node
const p = require('path')
const generateCompactEncoders = require('./lib/codegen')

const args = process.argv.slice(2)
const input = args[0]
const flag = args[1]
if (!input || !flag) {
  console.error('Usage: hyperschema [input] (--json or --cenc)')
}

const schema = require(p.resolve(input))
if (flag === '--json') {
  console.log(JSON.stringify(schema.toJSON(), null, 2))
} else if (flag === '--cenc') {
  console.log(generateCompactEncoders(schema))
}
