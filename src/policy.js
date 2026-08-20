const SENSITIVE_VERBS = /(?:download|upload|file|script|evaluate|execute|cookie|password|credential|permission)/i
const INTERACTION_VERBS = /(?:click|type|press|key|navigate|open|close|scroll|select|drag|claim|release|focus|submit|fill)/i
const READ_VERBS = /(?:status|list|read|get|observe|snapshot|screenshot|inspect|find|query|tab)/i

export function classifyTool(rawName) {
  const name = String(rawName)
  if (SENSITIVE_VERBS.test(name)) return 'sensitive'
  if (INTERACTION_VERBS.test(name)) return 'interaction'
  if (READ_VERBS.test(name)) return 'read'
  return 'interaction'
}

export function decideToolAccess(rawName, settings) {
  if (!settings.enabled) {
    return { allow: false, reason: 'BrowserPilot 已在 DSH 设置中关闭。' }
  }

  const category = classifyTool(rawName)
  const mode = category === 'read'
    ? settings.readAccess
    : category === 'sensitive'
      ? settings.sensitiveAccess
      : settings.interactionAccess

  if (mode === 'deny') {
    return { allow: false, reason: `当前安全策略禁止 ${categoryLabel(category)} 类浏览器操作。`, category, mode }
  }

  return {
    allow: true,
    category,
    mode,
    requiresBrowserPilotApproval: mode === 'ask',
  }
}

export function categoryLabel(category) {
  return ({ read: '只读', interaction: '交互', sensitive: '敏感' })[category] ?? '交互'
}
