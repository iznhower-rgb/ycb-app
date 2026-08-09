// ==========================================================
// Y.C.B PROVIDERS CORE 3.0.0
// Stable provider registry + isolated multi-provider execution
// ==========================================================

const providers = [];

export class DataProvider {
  constructor(name) {
    this.name = String(name || "").trim();
  }

  async getMatchData(home, away, env) {
    throw new Error(`getMatchData() not implemented for ${this.name}`);
  }
}

export function registerProvider(provider) {
  if (!provider || typeof provider.getMatchData !== "function" || !provider.name) {
    throw new Error("Invalid data provider");
  }

  const exists = providers.some(item => item.name === provider.name);

  if (!exists) {
    providers.push(provider);
  }

  return provider;
}

export function getProviders() {
  return providers.map(provider => ({
    provider: provider.name
  }));
}

export function getProviderInstances() {
  return [...providers];
}

export async function getAllMatchData(home, away, env) {
  return Promise.all(
    providers.map(async provider => {
      const startedAt = Date.now();

      try {
        const result = await provider.getMatchData(home, away, env);

        return {
          provider: provider.name,

          success:
            result?.status === "success",

          status:
            result?.status || "unknown",

          message:
            result?.message || "",

          data:
            result?.data || null,

          durationMs:
            Date.now() - startedAt
        };

      } catch (error) {

        return {
          provider: provider.name,

          success: false,

          status: "provider_error",

          message:
            error?.message ||
            String(error),

          data: null,

          durationMs:
            Date.now() - startedAt
        };

      }
    })
  );
}

export function getProviderCount() {
  return providers.length;
}
