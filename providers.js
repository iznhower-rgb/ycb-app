// ============================================
// Y.C.B - DATA PROVIDER SYSTEM
// ============================================

// --------------------------------------------
// Base Data Provider
// --------------------------------------------

export class DataProvider {

  constructor(name) {

    if (!name) {
      throw new Error("Provider name is required");
    }

    this.name = name;
  }

  async getMatchData(home, away) {

    throw new Error(
      `${this.name}: getMatchData() is not implemented`
    );

  }

}


// --------------------------------------------
// Provider Registry
// --------------------------------------------

const providers = [];


// --------------------------------------------
// Register Provider
// --------------------------------------------

export function registerProvider(provider) {

  if (!(provider instanceof DataProvider)) {

    throw new Error(
      "Invalid data provider"
    );

  }

  const exists = providers.some(
    item => item.name === provider.name
  );

  if (exists) {

    throw new Error(
      `Provider already registered: ${provider.name}`
    );

  }

  providers.push(provider);

  return provider;
}


// --------------------------------------------
// Get All Providers
// --------------------------------------------

export function getProviders() {

  return providers.map(provider => ({
    name: provider.name,
    status: "registered"
  }));

}


// --------------------------------------------
// Get Provider By Name
// --------------------------------------------

export function getProvider(name) {

  return providers.find(
    provider => provider.name === name
  ) || null;

}


// --------------------------------------------
// Get First Available Provider
// --------------------------------------------

export function getFirstProvider() {

  return providers.length > 0
    ? providers[0]
    : null;

}


// --------------------------------------------
// Get Match Data From Providers
// --------------------------------------------

export async function getMatchData(home, away) {

  if (!home || !away) {

    throw new Error(
      "Home and away teams are required"
    );

  }

  if (providers.length === 0) {

    throw new Error(
      "No data providers registered"
    );

  }

  const results = [];

  for (const provider of providers) {

    try {

      const result =
        await provider.getMatchData(home, away);

      results.push({
        provider: provider.name,
        success: true,
        data: result
      });

    } catch (error) {

      results.push({
        provider: provider.name,
        success: false,
        error: error.message
      });

    }

  }

  return results;
}


// --------------------------------------------
// Provider Count
// --------------------------------------------

export function getProviderCount() {

  return providers.length;

}
