module.exports = function generateSchema (hyperschema) {
  const types = hyperschema.orderedTypes.filter(({ type }) => !type.primitive)
  for (const { type } of types) {
    if (type.primitive) continue
    type.preprocessEncoding()
  }
  let str = ''
  str += '// !!! Generated File -- Do not edit !!!\n' 
  str += `const c = require('compact-encoding')\n\n`

  for (let i = 0; i < types.length; i++) {
    const { name, type } = types[i]
    str += generateEncoder(i, name, type)  
    str += '\n'
  }

  str += '\n'

  str += 'const EncoderMap = new Map([\n'
  for (let i = 0; i < types.length; i++) {
    const { name, type } = types[i]
    str += `  ['${name}', ${'encoder' + i}]`   
    if (i !== types.length - 1) str += ',\n'
    else str += '\n'
  }
  str += '])\n\n'

  str += 'module.exports = function resolve (name) {\n   return EncoderMap.get(name)\n}'
    
  return str
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
  str += 'let flags = 0\n'
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
      if (i !== type._encodables.length - 1) str += '\n'
    }
  }
  return str
}

function generateDecode (type) {
  let str = ''
  str += 'const res = {\n'
  for (let i = 0; i < type._encodables.length; i++) {
    const enc = type._encodables[i]
    str += `      ${enc.name}: ${enc.default}` 
    if (i !== type._encodables.length - 1) str += ','
    str += '\n'
  }
  str += '    }\n'
  for (let i = 0; i < type._encodables.length; i++) {
    const enc = type._encodables[i]  
    const encoder = enc.type.primitive ? `c.${enc.type.name}` : `resolve('${enc.type.fqn}')`
    const decodeStr = `res.${enc.name} = ${encoder}.decode(state)` 
    if (i === type._bitfieldPosition) {
      str += `    const flags = state.start < state.end ? c.uint.decode(state) : 0\n`  
    }
    if (!enc.optional) {
      str += `    ${decodeStr}\n`   
    } else {
      str += `    if ((flags & enc.flag) !== 0) ${decodeStr}\n`  
    }
  }
 
  str += '    return res' 
  return str
}
