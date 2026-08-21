export function serializeBrowserPilotStatus(snapshot, toolCount) {
  const value = {
    state: typeof snapshot?.state === 'string' ? snapshot.state : 'unknown',
    toolCount: Number.isSafeInteger(toolCount) && toolCount >= 0 ? toolCount : 0,
  }
  if (typeof snapshot?.lastError === 'string' && snapshot.lastError !== '') {
    value.lastError = snapshot.lastError
  }
  if (isObject(snapshot?.runtime)) {
    value.runtime = {
      command: String(snapshot.runtime.command || ''),
      args: Array.isArray(snapshot.runtime.args) ? snapshot.runtime.args.map(String) : [],
      cwd: String(snapshot.runtime.cwd || ''),
    }
  }
  if (isObject(snapshot?.serverInfo)) {
    value.serverInfo = {
      ...(typeof snapshot.serverInfo.name === 'string' ? { name: snapshot.serverInfo.name } : {}),
      ...(typeof snapshot.serverInfo.version === 'string' ? { version: snapshot.serverInfo.version } : {}),
    }
  }
  return value
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
