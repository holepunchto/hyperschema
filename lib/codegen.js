module.exports = function generateSchema (hyperschema) {
  const types = hyperschema.listTypes()
  return `\
const c = require('compact-encoding')

const namesToEncoders = new Map([
${types.map(({ name }, i) => {
  const suffix = i !== types.length - 1 ? ',' : ''
  return `  ['${name}', ${'encoder' + i}]${suffix}`
}).join('\n')}  
]) 

${types.map(({ name, type }, i) => {
  return generateEncoder(i, name, '', '', '')
}).join('\n')}

module.exports = function resolve (typeName) {
    return namesToIds.get(typeName)
}\
`
}

function generateEncoder (id, name, preencode, encode, decode) {
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
