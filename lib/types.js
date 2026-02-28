const BitwiseNumericTypes = new Set(['uint1', 'uint2', 'uint3', 'uint4', 'uint5', 'uint6', 'uint7'])
const NumericTypes = new Set([
  'uint',
  ...BitwiseNumericTypes,
  'uint8',
  'uint16',
  'uint24',
  'uint32',
  'uint40',
  'uint48',
  'uint56',
  'uint64',
  'int',
  'int8',
  'int16',
  'int24',
  'int32',
  'int40',
  'int48',
  'int56',
  'int64',
  'float32',
  'float64',
  'port',
  'lexint',
  'signedLexint'
])
const StringTypes = new Set(['string', 'utf8', 'ascii', 'hex'])
const BigIntTypes = new Set(['bigint', 'biguint64', 'bigint64'])
const ObjectTypes = new Set(['fixed32', 'fixed64', 'buffer', 'date', 'lexdate'])
const BooleanTypes = new Set(['bool'])
const NetworkTypes = new Set(['ip', 'ipv4', 'ipv6', 'ipAddress', 'ipv4Address', 'ipv6Address'])
const SupportedTypes = new Set([
  ...NumericTypes,
  ...StringTypes,
  ...BigIntTypes,
  ...ObjectTypes,
  ...BooleanTypes,
  ...NetworkTypes,
  'none',
  'raw',
  'json'
])

function getBitwiseSize(type) {
  if (type === 'uint1') return 1
  if (type === 'uint2') return 2
  if (type === 'uint3') return 3
  if (type === 'uint4') return 4
  if (type === 'uint5') return 5
  if (type === 'uint6') return 6
  if (type === 'uint7') return 7
  return 0
}

function getDefaultValue(type) {
  if (NumericTypes.has(type)) return 0
  if (BigIntTypes.has(type)) return 0n
  if (BooleanTypes.has(type)) return false
  return null
}

module.exports = {
  SupportedTypes,
  BitwiseNumericTypes,
  getDefaultValue,
  getBitwiseSize
}
