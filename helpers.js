exports.basicStructValidator = (state, m) => {
  if (!m.id) throw new Error('id is required')
  if (!m.basicString) throw new Error('basicString is required')
}
