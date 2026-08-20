export function serializeBrowserPilotStatus(snapshot, toolCount) {
  const value = {
    state: typeof snapshot?.state === 'string' ? snapshot.state : 'unknown',
    toolCount: Number.isSafeInteger(toolCount) && toolCount >= 0 ? toolCount : 0,
  }
  if (typeof snapshot?.lastError === 'string' && snapshot.lastError !== '') {
    value.lastError = snapshot.lastError
  }
  return value
}
