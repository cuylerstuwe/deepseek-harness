#!/usr/bin/env node
/** Render the Agentbox settings template from deployment environment values. */

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    check: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    output: { type: 'string' },
    stdout: { type: 'boolean', default: false },
  },
  allowPositionals: false,
})

if (values.stdout && values.output !== undefined) {
  throw new Error('agentbox configure: --stdout and --output are mutually exclusive')
}

const knownModels = new Map([
  ['upstairs-q27-quality', 'qwen3.8-27b-q27-quality'],
  ['mtplx-flash-next', 'Qwen3.8-Flash-Next-MTPLX-Optimized-Speed'],
  ['gx10-glm', 'glm-5.3-flash'],
])

function required(name) {
  const value = process.env[name]?.trim()
  if (value === undefined || value.length === 0) {
    throw new Error(`agentbox configure: ${name} is required`)
  }
  return value
}

function endpoint(name) {
  const value = required(name).replace(/\/+$/u, '')
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`agentbox configure: ${name} must be an absolute HTTP(S) URL`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`agentbox configure: ${name} must use http or https`)
  }
  return value
}

const defaultProvider = process.env.DSH_DEFAULT_PROVIDER?.trim() || 'gx10-glm'
const defaultModel = process.env.DSH_DEFAULT_MODEL?.trim() || knownModels.get(defaultProvider)
if (defaultModel === undefined) {
  throw new Error('agentbox configure: DSH_DEFAULT_MODEL is required for an unknown DSH_DEFAULT_PROVIDER')
}
const expectedModel = knownModels.get(defaultProvider)
if (expectedModel !== undefined && expectedModel !== defaultModel) {
  throw new Error(`agentbox configure: ${defaultProvider} must use model ${expectedModel}`)
}

const replacements = {
  DSH_DEFAULT_PROVIDER: defaultProvider,
  DSH_DEFAULT_MODEL: defaultModel,
  UPSTAIRS_QWEN38_BASE_URL: endpoint('UPSTAIRS_QWEN38_BASE_URL'),
  MTPLX_FLASH_NEXT_BASE_URL: endpoint('MTPLX_FLASH_NEXT_BASE_URL'),
  GX10_GLM_BASE_URL: endpoint('GX10_GLM_BASE_URL'),
}

const templatePath = resolve(import.meta.dirname, 'settings.template.yaml')
let rendered = readFileSync(templatePath, 'utf8')
for (const [name, value] of Object.entries(replacements)) {
  rendered = rendered.replaceAll(`@@${name}@@`, JSON.stringify(value))
}
const unresolved = [...rendered.matchAll(/@@([A-Z0-9_]+)@@/gu)].map(match => match[1])
if (unresolved.length > 0) {
  throw new Error(`agentbox configure: unresolved template values: ${unresolved.join(', ')}`)
}

if (values.check) {
  process.stdout.write('Agentbox settings inputs are valid.\n')
  process.exit(0)
}
if (values.stdout) {
  process.stdout.write(rendered)
  process.exit(0)
}

const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const outputPath = resolve(values.output || join(dshHome, 'settings.yaml'))
if (existsSync(outputPath) && !values.force) {
  throw new Error(`agentbox configure: ${outputPath} exists; pass --force to replace it`)
}

mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 })
const temporaryPath = join(dirname(outputPath), `.${basename(outputPath)}.${process.pid}.tmp`)
try {
  writeFileSync(temporaryPath, rendered, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  renameSync(temporaryPath, outputPath)
  chmodSync(outputPath, 0o600)
} finally {
  rmSync(temporaryPath, { force: true })
}
process.stdout.write(`Wrote ${outputPath}\n`)
