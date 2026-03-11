const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const WORKSPACE = path.join(__dirname, '../swift-workspace')
const SOURCES = path.join(WORKSPACE, 'Sources')

function runSwift(schemaSwift, mainSwift) {
  fs.mkdirSync(SOURCES, { recursive: true })
  fs.writeFileSync(path.join(SOURCES, 'Schema.swift'), schemaSwift)
  fs.writeFileSync(path.join(SOURCES, 'main.swift'), mainSwift)

  const result = spawnSync('swift', ['run'], {
    cwd: WORKSPACE,
    encoding: 'utf8'
  })

  return {
    ok: result.status === 0,
    stdout: result.stdout ? result.stdout.toString() : '',
    stderr: result.stderr ? result.stderr.toString() : ''
  }
}

module.exports = { runSwift }
