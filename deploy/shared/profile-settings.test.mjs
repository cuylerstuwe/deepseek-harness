/** Profile migration preserves user settings and expressions before the first boot. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { profileOutputs, readYaml, writeOutputs } from './profile-settings.mjs'

test('migrates legacy settings, preserves profile edits, and backs up credentials privately', () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-profile-migrate-'))
  try {
    mkdirSync(join(home, 'profiles/web'), { recursive: true })
    writeFileSync(join(home, 'profiles/web/cordis.patch.yml'), '- id: ui-settings-general\n  config:\n    locale: zh-CN\n- id: preset-standard\n  config:\n    description: custom preset\n')
    writeFileSync(join(home, 'settings.yaml'), 'agent-default-model:\n  provider: old\n')
    writeFileSync(join(home, '.credentials.yaml'), 'version: 1\nrecords: {}\n')
    const settings = {
      'agent-default-model': { provider: 'router', model: 'test' },
      'llm-pi-ai': { providers: { router: { api: 'openai-completions' } } },
      'ui-onboarding': { completed: true },
      'tool-web': { search: false, fetch: true },
    }
    const outputs = profileOutputs(home, settings, [
      { id: 'agent-default-model', config: { provider: 'old' } },
      { id: 'session-telemetry-otel', disabled: true },
    ])
    outputs['.credentials.yaml'] = { version: 1, records: {}, refs: { TEST: 'test-key' } }
    const backup = writeOutputs(home, outputs)
    assert.equal(existsSync(join(home, 'settings.yaml')), false)
    assert.match(readFileSync(join(backup, 'settings.yaml'), 'utf8'), /provider: old/)
    assert.equal(readYaml(join(backup, '.credentials.yaml')).refs, undefined)
    assert.deepEqual(readYaml(join(home, 'cordis.patch.yml')), [{ id: 'session-telemetry-otel', disabled: true }])
    const rows = readYaml(join(home, 'profiles/web/cordis.patch.yml'))
    assert.deepEqual(rows.find(row => row.id === 'ui-settings-general').config, { locale: 'zh-CN', completed: true })
    const preset = rows.find(row => row.id === 'preset-standard').config
    assert.equal(preset.description, 'custom preset')
    assert.ok(preset.plugins.some(row => row.id === 'tool-web' && row.config.search === false && row.config.fetch === true))
    assert.match(readFileSync(join(home, 'profiles/web/cordis.patch.yml'), 'utf8'), /!!js/)
    const headless = readYaml(join(home, 'profiles/headless/cordis.patch.yml'))
    assert.equal(headless.some(row => row.id === 'ui-settings-general'), false)
    assert.deepEqual(headless.find(row => row.id === 'llm-pi-ai').config.excludedCatalogProviders, ['deepseek'])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
