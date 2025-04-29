const NumericTypes = new Set([
  'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56', 'uint64',
  'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64',
  'float32', 'float64',
  'lexint'
])
const StringTypes = new Set([
  'string', 'utf8', 'ascii', 'hex'
])
const BigIntTypes = new Set([
  'bigint', 'biguint64', 'bigint64'
])
const ObjectTypes = new Set([
  'fixed32', 'fixed64',
  'buffer',
  'date'
])
const BooleanTypes = new Set([
  'bool'
])
const SupportedTypes = new Set([
  ...NumericTypes,
  ...StringTypes,
  ...BigIntTypes,
  ...ObjectTypes,
  ...BooleanTypes,
  'none',
  'raw'
])

function getDefaultValue (type) {
  if (NumericTypes.has(type)) return 0
  if (BigIntTypes.has(type)) return 0n
  if (BooleanTypes.has(type)) return false
  return null
}

module.exports = {
  SupportedTypes,
  getDefaultValue
}
