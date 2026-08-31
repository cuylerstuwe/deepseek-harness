#!/usr/bin/env node
/** Verify the built CLI, local-only composition, rendered settings, and optional model reachability. */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { load } from 'js-yaml'

const { values } = parseArgs({
  options: { network: { type: 'boolean', default: false } },
  allowPositionals: false,
})
const repoRoot = resolve(import.meta.dirname, '../..')
const cli = join(repoRoot, 'apps/cli/lib/bin.js')
const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'))
const settingsPath = join(dshHome, 'settings.yaml')

function requireCondition(condition, message) {
  if (!condition) throw new Error(`agentbox verify: ${message}`)
}

requireCondition(existsSync(cli), `built CLI is missing at ${cli}`)
requireCondition(existsSync(join(dshHome, 'cordis.patch.yml')), `policy patch is missing under ${dshHome}`)
requireCondition(existsSync(settingsPath), `settings are missing at ${settingsPath}`)

const version = spawnSync(process.execPath, [cli, '--version'], { encoding: 'utf8' })
requireCondition(version.status === 0, version.stderr.trim() || 'dsh --version failed')

const dump = spawnSync(process.execPath, [cli, '--profile', 'headless', '--dump-config'], {
  encoding: 'utf8',
  env: { ...process.env, DSH_HOME: dshHome, DSH_TELEMETRY_DISABLED: '1', DSH_TELEMETRY_MODE: 'DISABLED' },
})
requireCondition(dump.status === 0, dump.stderr.trim() || 'headless config dump failed')

function row(id) {
  const lines = dump.stdout.split('\n')
  const start = lines.findIndex(line => line === `- id: ${id}`)
  requireCondition(start >= 0, `composed row ${id} is missing`)
  let end = lines.findIndex((line, index) => index > start && /^- id: /u.test(line))
  if (end < 0) end = lines.length
  return lines.slice(start, end).join('\n')
}

requireCondition(/disabled: true/u.test(row('llm-deepseek')), 'DeepSeek LLM adapter is enabled')
requireCondition(/excludedCatalogProviders:\n\s+- deepseek/u.test(row('llm-pi-ai')), 'DeepSeek remains in the pi-ai catalog')
requireCondition(/searchProvider: local-search-disabled/u.test(row('web')), 'DeepSeek search routing is not replaced')
requireCondition(/disabled: true/u.test(row('web-search-deepseek')), 'DeepSeek search provider is enabled')
requireCondition(/search: false/u.test(row('tool-web')) && /fetch: true/u.test(row('tool-web')), 'web tools are not fetch-only')
requireCondition(/disabled: true/u.test(row('session-telemetry-otel')), 'DeepSeek telemetry exporter is enabled')

const settings = load(readFileSync(settingsPath, 'utf8'))
const providers = settings?.['llm-pi-ai']?.providers
requireCondition(providers !== null && typeof providers === 'object', 'llm-pi-ai providers are missing')
const expected = new Map([
  ['upstairs-q27-quality', 'qwen3.8-27b-q27-quality'],
  ['mtplx-flash-next', 'Qwen3.8-Flash-Next-MTPLX-Optimized-Speed'],
  ['gx10-glm', 'glm-5.3-flash'],
])
for (const [provider, model] of expected) {
  const profile = providers[provider]
  requireCondition(profile !== null && typeof profile === 'object', `provider ${provider} is missing`)
  requireCondition(profile.models?.some(candidate => candidate.id === model), `model ${provider}/${model} is missing`)
}

if (values.network) {
  for (const [provider, model] of expected) {
    const profile = providers[provider]
    const credential = process.env[profile.apiKeyEnv]
      || (profile.apiKeyEnv === 'UPSTAIRS_QWEN38_API_KEY' ? undefined : 'local-no-auth')
    requireCondition(credential !== undefined, `${profile.apiKeyEnv} is required for the ${provider} network probe`)
    const response = await fetch(`${profile.baseURL.replace(/\/+$/u, '')}/models`, {
      headers: { Authorization: `Bearer ${credential}` },
      signal: AbortSignal.timeout(15_000),
    })
    requireCondition(response.ok, `${provider} /models returned HTTP ${response.status}`)
    const body = await response.json()
    requireCondition(Array.isArray(body.data) && body.data.some(candidate => candidate.id === model), `${provider} did not advertise ${model}`)
    process.stdout.write(`Reachable: ${provider}/${model}\n`)
  }
}

process.stdout.write(`Agentbox verification passed with dsh ${version.stdout.trim()}.\n`)
