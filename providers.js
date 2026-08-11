// ==========================================================
// Y.C.B PROVIDERS REGISTRY 3.1.0
// ==========================================================

const registry = [];

export function registerProvider(provider) {
  if (!provider || typeof provider.getMatchData !== "function") {
    throw new Error("Invalid provider registration");
  }

  const name = String(provider.name || "Unnamed Provider").trim();

  if (!name) {
    throw new Error("Provider name is required");
  }

  if (!registry.some(p => p.name === name)) {
    registry.push({
      ...provider,
      name
    });
  }

  return provider;
}

export function getProviderInstances() {
  return [...registry];
}

export function getProviders() {
  return registry.map(provider => ({
    name: provider.name,
    version: provider.version || "3.1.0",
    description: provider.description || "",
    enabled: provider.enabled !== false
  }));
}

export function clearProviders() {
  registry.length = 0;
}

export default {
  registerProvider,
  getProviderInstances,
  getProviders,
  clearProviders
};
