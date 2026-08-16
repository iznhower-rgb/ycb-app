/* ==========================================================
   1. PROVIDERS REGISTRY (providers.js)
========================================================== */

const registry = [];

export class DataProvider {
  constructor(config = {}) {
    this.name = config.name || "Unnamed Provider";
    this.version = config.version || "3.1.0";
    this.description = config.description || "";
    this.enabled = config.enabled !== false;
  }

  async getMatchData(home, away, env) {
    throw new Error("getMatchData must be implemented by subclass");
  }
}

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
