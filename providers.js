/* ==========================================================
   Y.C.B PROVIDER REGISTRY 3.2.0
========================================================== */

class DataProvider {
  constructor(config = {}) {
    this.name = String(config.name || "Unknown");
    this.version = String(config.version || "1.0.0");
    this.description = String(config.description || "");
    this.enabled = config.enabled !== false;
  }

  async getMatchData() {
    throw new Error("getMatchData must be implemented");
  }
}

const providersRegistry = [];

export function registerProvider(provider) {
  if (!provider || typeof provider.getMatchData !== "function") {
    return false;
  }

  const exists = providersRegistry.some(
    item => item.name === provider.name
  );

  if (!exists) {
    providersRegistry.push(provider);
  }

  return true;
}

export function getProviderInstances() {
  return [...providersRegistry];
}

export function getProviders() {
  return providersRegistry.map(provider => ({
    name: provider.name,
    version: provider.version,
    description: provider.description,
    enabled: provider.enabled !== false
  }));
}

export { DataProvider };
