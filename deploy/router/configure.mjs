#!/usr/bin/env node
/** Synchronize a private Harness home with the active Pi home-router catalog. */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'
import { readYaml, profileOutputs, writeOutputs } from '../shared/profile-settings.mjs'
import { fromPi } from './from-pi.mjs'

const { values } = parseArgs({ options: {
  'pi-home': { type: 'string' },
  'dsh-home': { type: 'string', default: join(homedir(), '.dsh') },
  write: { type: 'boolean', default: false },
} })
if (!values['pi-home']) throw new Error('--pi-home must name the active PI_CODING_AGENT_DIR')
const piHome = resolve(values['pi-home'])
const dshHome = resolve(values['dsh-home'])
const readJson = name => JSON.parse(readFileSync(join(piHome, name), 'utf8'))
const { defaultModel, provider } = fromPi(readJson('models.json'), readJson('settings.json'))
const settings = readYaml(join(dshHome, 'settings.yaml')) ?? {}
const patch = readYaml(join(dshHome, 'cordis.patch.yml')) ?? []
if (!Array.isArray(patch)) throw new Error('Harness home patch must be an array')
settings['agent-default-model'] = { provider: 'home-router', model: defaultModel }
settings['llm-pi-ai'] = { ...settings['llm-pi-ai'], providers: { 'home-router': provider } }
settings['subagent-model-selection'] = {
  ...settings['subagent-model-selection'], enabled: true,
  allowedModels: provider.models.map(model => ({ provider: 'home-router', model: model.id })),
}
const existingTools = patch.find(row => row.id === 'tool-web')?.config
settings['tool-web'] = { ...existingTools, ...settings['tool-web'], search: false }
function setRow(id, value) {
  const index = patch.findIndex(row => row.id === id)
  const row = { ...(index < 0 ? { id } : patch[index]), ...value }
  if (index < 0) patch.push(row)
  else patch[index] = row
}
setRow('agent-default-model', { config: settings['agent-default-model'] })
for (const id of ['llm-deepseek', 'llm-deepseek-account', 'web-search-deepseek', 'session-telemetry-otel']) {
  setRow(id, { disabled: true })
}
setRow('llm-pi-ai', { config: { excludedCatalogProviders: ['deepseek'] } })
process.stdout.write(`Router models: ${provider.models.map(model => model.id).join(', ')}; default: ${defaultModel}\n`)
if (!values.write) {
  process.stdout.write('Preview only. Add --write to back up and update this Harness home.\n')
} else {
  const auth = readJson('auth.json')['home-router']
  if (auth?.type !== 'api_key' || typeof auth.key !== 'string' || !auth.key || auth.key.startsWith('!')) {
    throw new Error('Pi home-router auth must contain a literal API key; credentials were not changed')
  }
  const credentials = readYaml(join(dshHome, '.credentials.yaml')) ?? { version: 1 }
  credentials.refs = { ...credentials.refs, HOME_ROUTER_API_KEY: auth.key }
  const outputs = profileOutputs(dshHome, settings, patch)
  outputs['.credentials.yaml'] = credentials
  const backup = writeOutputs(dshHome, outputs)
  process.stdout.write(`Updated ${dshHome}; private backups: ${backup}\n`)
}
