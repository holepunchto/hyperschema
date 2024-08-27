module.exports = function generateSchema (hyperschema) {
  const types = hyperschema.listTypes().filter(({ type }) => !type.primitive)
  for (const { type } of types) {
    if (type.primitive) continue
    type.preprocessEncoding()
  }
  return `\
// !!! Generated File -- Do not edit !!!
const c = require('compact-encoding')

const namesToEncoders = new Map([
${types.map(({ name }, i) => {
  const suffix = i !== types.length - 1 ? ',' : ''
  return `  ['${name}', ${'encoder' + i}]${suffix}`
}).join('\n')}  
]) 

${types.map(({ name, type }, i) => {
  return generateEncoder(i, name, type)
}).join('\n')}

module.exports = function resolve (typeName) {
    return namesToIds.get(typeName)
}\
`
}

function generateEncoder (id, name, type) {
  const preencode = generateEncode(type, { preencode: true })
  const encode = generateEncode(type)
  const decode = generateDecode(type)
  return `\
// ${name}
const encoder${id} = {
  preencode (state, m) {
    ${preencode}
  },
  encode (state, m) {
    ${encode}  
  },
  decode (state) {
    ${decode}  
  }
}
`
}

function generateEncode (type, { preencode = false } = {}) {
  const fn = preencode ? 'preencode' : 'encode'
  let str = ''
  str += 'let flags = 0'
  for (const optional of type._optionals) {
    str += `    if (m['${optional.name}']) flags |= ${optional.flag}`
    str += '\n'
  }
  for (let i = 0; i < type._encodables.length; i++) {
    const enc = type._encodables[i]
    if (i === type._bitfieldPosition) {
      str += `    c.uint.${fn}(state, flags)\n`
    }
    if (!enc.type.bool) {
      const prefix = enc.optional ? `    if (m['${enc.name}'])` : '   '
      const encoder = enc.type.primitive ? `c.${enc.type.name}` : `resolve('${enc.type.fqn}')`
      str += `${prefix} ${encoder}.${fn}(state, m['${enc.name}']) `
    }
    if (i !== type._encodables.length - 1) str += '\n'
  }
  return str
}

function generateDecode (type) {
  return ''
}
