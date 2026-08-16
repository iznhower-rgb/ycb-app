/* ==========================================================
   PROVIDERS REGISTRY (providers.js)
========================================================== */

class DataProvider {
  constructor(config) {
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
    this.enabled = true;
  }

  // الدالة الأساسية التي يجب أن تُعرف في كل مزود
  async getMatchData(home, away, env) {
    throw new Error("getMatchData must be implemented by subclass");
  }
}

let providersRegistry = [];

function registerProvider(providerInstance) {
  if (providerInstance && typeof providerInstance.getMatchData === "function") {
    providersRegistry.push(providerInstance);
  } else {
    console.error("Invalid provider registration: missing getMatchData function");
  }
}

function getProviderInstances() {
  return providersRegistry;
}

export { DataProvider, registerProvider, getProviderInstances };
