import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromPi } from './from-pi.mjs'
const source = () => ({ providers: { 'home-router': {
  baseUrl: 'https://router.example/v1', api: 'openai-completions', models: [
    { id: 'nyc', reasoning: true, thinkingLevelMap: { off: null, minimal: null, low: 'low', medium: 'medium', high: 'xhigh', xhigh: null, max: null }, input: ['text'], contextWindow: 98304, maxTokens: 32768, samplingParams: { temperature: 1, top_p: 0.95, min_p: 0.05 }, compat: { thinkingFormat: 'reasoning_effort', supportsOpenAIGrammarTools: false, sendSessionAffinityHeaders: false } },
    { id: 'alaska', reasoning: true, thinkingLevelMap: { minimal: null, low: 'low', medium: null, high: 'high', xhigh: null, max: 'max' }, contextWindow: 1048576, maxTokens: 131072, input: ['text', 'image'], compat: { supportsThinkingTokenBudget: true, thinkingTokenBudgetField: 'thinking_token_budget' } },
  ],
} } })
test('translates wire names and supported efforts without exporting keys', () => {
  const result = fromPi(source(), { defaultProvider: 'home-router', defaultModel: 'alaska' })
  assert.equal(result.defaultModel, 'alaska')
  assert.deepEqual(result.provider.models[0].reasoningEfforts, { low: 'low', medium: 'medium', high: 'xhigh' })
  assert.deepEqual(result.provider.models[0].compat, { thinkingFormat: 'openai' })
  assert.deepEqual(result.provider.models[0].samplingParams, { temperature: 1, top_p: 0.95, min_p: 0.05 })
  assert.equal(result.provider.models[1].reasoningEfforts.off, null)
  assert.equal(result.provider.models[1].contextWindow, 1048576)
  assert.equal(result.provider.models[1].thinkingTokenBudgets, undefined)
  assert.equal(result.provider.models[1].compat.supportsThinkingTokenBudget, false)
  assert.equal(result.provider.models[1].compat.thinkingTokenBudgetField, undefined)
  assert.equal(result.provider.headers['X-LLM-Priority'], 'foreground')
  assert.equal(result.provider.apiKey, undefined)
})
test('refuses a feature it cannot translate and duplicate ids', () => {
  const incompatible = source(); incompatible.providers['home-router'].models[0].compat.supportsOpenAIGrammarTools = true
  assert.throws(() => fromPi(incompatible, {}), /cannot preserve/)
  const duplicate = source(); duplicate.providers['home-router'].models.push(duplicate.providers['home-router'].models[0])
  assert.throws(() => fromPi(duplicate, {}), /unique/)
})
