// ==========================================
// Y.C.B DATA PROVIDER SYSTEM
// ==========================================


export class DataProvider {

  constructor(name) {
    this.name = name;
  }


  async getMatchData(home, away, env) {

    throw new Error(
      `getMatchData() not implemented by ${this.name}`
    );

  }

}


// ==========================================
// PROVIDER REGISTRY
// ==========================================

export const providers = [];


// ==========================================
// REGISTER PROVIDER
// ==========================================

export function registerProvider(provider) {

  if (!(provider instanceof DataProvider)) {

    throw new Error(
      "Invalid data provider"
    );

  }


  // منع تسجيل نفس المزود مرتين

  const exists = providers.some(
    p => p.name === provider.name
  );


  if (!exists) {

    providers.push(provider);

  }

}


// ==========================================
// GET PROVIDERS
// ==========================================

export function getProviders() {

  return providers.map(provider => ({

    name: provider.name,

    status: "registered"

  }));

}


// ==========================================
// GET MATCH DATA FROM ALL PROVIDERS
// ==========================================

export async function getAllMatchData(
  home,
  away,
  env
) {

  const results = [];


  for (const provider of providers) {

    try {

      const data =
        await provider.getMatchData(
          home,
          away,
          env
        );


      results.push({

        provider: provider.name,

        success: true,

        data

      });

    } catch (error) {

      results.push({

        provider: provider.name,

        success: false,

        error:
          error?.message ||
          String(error)

      });

    }

  }


  return results;

}
