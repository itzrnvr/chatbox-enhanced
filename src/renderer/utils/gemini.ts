export function normalizeGeminiHost(host: string) {
  let apiHost = host
  if (apiHost.endsWith('/v1beta')) {
    apiHost = apiHost.replace('/v1beta', '')
  } else if (apiHost.endsWith('/v1')) {
    apiHost = apiHost.replace('/v1', '')
  }
  return {
    apiHost,
  }
}