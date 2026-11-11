// Safely normalize any value into a trimmed string.
function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

/**
 * Normalize direct connection proxy configuration.
 */
function normalizeLegacyProxy(providerSpecificData = {}) {
  const connectionProxyEnabled =
    providerSpecificData?.connectionProxyEnabled === true;

  const connectionProxyUrl = normalizeString(
    providerSpecificData?.connectionProxyUrl
  );

  const connectionNoProxy = normalizeString(
    providerSpecificData?.connectionNoProxy
  );

  return {
    connectionProxyEnabled,
    connectionProxyUrl,
    connectionNoProxy,
  };
}

/**
 * Resolve connection proxy configuration.
 */
export async function resolveConnectionProxyConfig(
  providerSpecificData = {}
) {
  try {
    const legacy = normalizeLegacyProxy(providerSpecificData);

    if (legacy.connectionProxyEnabled && legacy.connectionProxyUrl) {
      return {
        source: "legacy",
        proxyPoolId: null,
        proxyPool: null,
        connectionProxyEnabled: true,
        connectionProxyUrl: legacy.connectionProxyUrl,
        connectionNoProxy: legacy.connectionNoProxy,
        strictProxy: false,
        vercelRelayUrl: "",
      };
    }

    return {
      source: "direct",
      proxyPoolId: null,
      proxyPool: null,
      connectionProxyEnabled: false,
      connectionProxyUrl: "",
      connectionNoProxy: "",
      strictProxy: false,
      vercelRelayUrl: "",
    };
  } catch (error) {
    console.error(
      "[connectionProxy] Error resolving proxy configuration:",
      error
    );

    return {
      source: "error_fallback",
      proxyPoolId: null,
      proxyPool: null,
      connectionProxyEnabled: false,
      connectionProxyUrl: "",
      connectionNoProxy: "",
      strictProxy: false,
      vercelRelayUrl: "",
    };
  }
}
