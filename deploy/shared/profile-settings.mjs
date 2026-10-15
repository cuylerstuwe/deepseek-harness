/** Persist deployment settings in current profile patches, preserving Cordis expressions. */
import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { load, dump, Type, DEFAULT_SCHEMA } from 'js-yaml'
class Expression { constructor(value) { this.value = value } }
const schema = DEFAULT_SCHEMA.extend([new Type('tag:yaml.org,2002:js', {
  kind: 'scalar', construct: value => new Expression(value),
  instanceOf: Expression, represent: value => value.value,
})])
export const readYaml = path => existsSync(path) ? load(readFileSync(path, 'utf8'), { schema }) : undefined
export function upsert(rows, id, value) {
  const index = rows.findIndex(row => row.id === id)
  const row = { ...(index < 0 ? { id } : rows[index]), ...value }
  if (index < 0) rows.push(row)
  else rows[index] = row
}
export function profileOutputs(dshHome, settings, homePatch) {
  const outputs = {}
  const names = new Set(['web', 'headless'])
  const profilesDir = join(dshHome, 'profiles')
  if (existsSync(profilesDir)) for (const name of readdirSync(profilesDir)) {
    if (existsSync(join(profilesDir, name, 'package.json'))) names.add(name)
  }
  const sections = { ...settings }
  sections['llm-pi-ai'] = { ...sections['llm-pi-ai'], excludedCatalogProviders: ['deepseek'] }
  const managed = new Set(Object.keys(sections))
  outputs['cordis.patch.yml'] = homePatch.filter(row => !managed.has(row.id))
  for (const name of names) {
    const file = `profiles/${name}/cordis.patch.yml`
    const rows = readYaml(join(dshHome, file)) ?? []
    if (!Array.isArray(rows)) throw new Error(`${file} must be a patch array`)
    for (const [section, config] of Object.entries(sections)) {
      const webOnly = ['ui-onboarding', 'subagent-model-selection'].includes(section) || section.startsWith('ui-')
      if (webOnly && !['web', 'desktop'].includes(name)) continue
      const id = ({ 'ui-onboarding': 'ui-settings-general', 'subagent-model-selection': 'subagent-model-selection-settings' })[section] ?? section
      upsert(rows, id, { config: { ...rows.find(row => row.id === id)?.config, ...config } })
    }
    if (['web', 'desktop'].includes(name)) {
      for (const preset of ['standard', 'ptc', 'cordis']) {
        const id = `preset-${preset}`
        const declaration = readYaml(resolve(import.meta.dirname, `../../packages/bundle/web-app/presets/${preset}.patch.yml`))[0].insert[0]
        const config = { ...declaration.config, ...rows.find(row => row.id === id)?.config }
        const visit = entries => { for (const entry of entries) {
          if (entry.id === 'tool-web') entry.config = { ...entry.config, ...settings['tool-web'], search: false }
          if (Array.isArray(entry.config)) visit(entry.config)
        } }
        visit(config.plugins)
        upsert(rows, id, { config })
      }
    }
    outputs[file] = rows
  }
  return outputs
}
export function writeOutputs(dshHome, outputs) {
  const backup = join(dshHome, 'backups', `router-${new Date().toISOString().replaceAll(':', '-')}`)
  mkdirSync(backup, { recursive: true, mode: 0o700 })
  for (const [name, value] of Object.entries(outputs)) {
    const path = join(dshHome, name)
    if (existsSync(path)) { const saved = join(backup, name); mkdirSync(dirname(saved), { recursive: true, mode: 0o700 }); copyFileSync(path, saved) }
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    const temporary = `${path}.${process.pid}.tmp`
    writeFileSync(temporary, dump(value, { schema, noRefs: true, lineWidth: -1 }), { mode: 0o600, flag: 'wx' })
    renameSync(temporary, path)
  }
  const legacy = join(dshHome, 'settings.yaml')
  if (existsSync(legacy)) renameSync(legacy, join(backup, 'settings.yaml'))
  return backup
}
