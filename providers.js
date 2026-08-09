// Y.C.B PROVIDERS CORE
const providers = [];

export class DataProvider {
  constructor(name) { this.name = name; }

  async getMatchData(home, away, env) {
    throw new Error(`getMatchData() not implemented for ${this.name}`);
  }
}

export function registerProvider(provider) {
  if (!provider || typeof provider.getMatchData !== "function" || !provider.name) {
    throw new Error("Invalid data provider");
  }

  if (!providers.some(item => item.name === provider.name)) {
    providers.push(provider);
  }

  return provider;
}

export function getProviders() {
  return providers.map(provider => ({
    provider: provider.name
  }));
}

export async function getAllMatchData(home, away, env) {
  return Promise.all(
    providers.map(async provider => {
      try {
        const result =
          await provider.getMatchData(
            home,
            away,
            env
          );

        return {
          provider: provider.name,
          success: result?.status === "success",
          status: result?.status || "unknown",
          message: result?.message || "",
          data: result?.data || null
        };

      } catch (error) {

        return {
          provider: provider.name,
          success: false,
          status: "provider_error",
          message:
            error?.message ||
            String(error),
          data: null
        };

      }
    })
  );
}

export function getProviderInstances() {
  return [...providers];
}
