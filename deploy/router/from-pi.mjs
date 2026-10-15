/** Translate one Pi router catalog into Harness provider configuration. */
const unsupportedCompat = ['supportsOpenAIGrammarTools', 'sendSessionAffinityHeaders']

export function fromPi(models, settings) {
  const source = models.providers?.['home-router']
  if (!source || source.api !== 'openai-completions' || !source.models?.length) {
    throw new Error('Pi must declare a nonempty home-router OpenAI Completions catalog')
  }
  const endpoint = new URL(source.baseUrl)
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error('The router endpoint must be an HTTP(S) URL without embedded credentials')
  }
  const ids = new Set()
  const catalog = source.models.map((model) => {
    if (!model.id || ids.has(model.id)) throw new Error('Router model ids must be nonempty and unique')
    ids.add(model.id)
    const compat = { ...source.compat, ...model.compat }
    for (const field of unsupportedCompat) {
      if (compat[field] === true) throw new Error(`Harness cannot preserve ${field}=true for ${model.id}`)
      delete compat[field]
    }
    if (compat.thinkingFormat === 'reasoning_effort') compat.thinkingFormat = 'openai'
    // Alaska's backend owns its reasoning budget; pi-ai otherwise adds answer headroom.
    if (model.id === 'alaska') {
      compat.supportsThinkingTokenBudget = false
      delete compat.thinkingTokenBudgetField
    }
    const map = model.thinkingLevelMap ?? {}
    const reasoningEfforts = model.reasoning ? Object.fromEntries(
      ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].flatMap((level) => {
        if (map[level] === null || (['xhigh', 'max'].includes(level) && map[level] === undefined)) return []
        return [[level, map[level] ?? (level === 'off' ? null : level)]]
      }),
    ) : false
    return {
      id: model.id,
      name: model.name ?? model.id,
      contextWindow: model.contextWindow,
      maxTokens: model.maxTokens,
      input: model.input,
      reasoningEfforts,
      ...model.samplingParams === undefined ? {} : { samplingParams: model.samplingParams },
      compat,
    }
  })
  const defaultModel = settings.defaultProvider === 'home-router' && ids.has(settings.defaultModel)
    ? settings.defaultModel : catalog[0].id
  return {
    defaultModel,
    provider: {
      displayName: 'Home router',
      apiKeyEnv: 'HOME_ROUTER_API_KEY',
      api: source.api,
      baseURL: source.baseUrl,
      // Harness requires a bounded watchdog; permit long router queue waits.
      streamIdleTimeoutMs: 86400000,
      headers: { ...source.headers, 'X-LLM-Priority': 'foreground' },
      models: catalog,
    },
  }
}
