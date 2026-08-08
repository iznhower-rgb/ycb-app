// =================================
// Y.C.B DATA PROVIDER LAYER
// =================================

export class DataProvider {

  constructor(name) {
    this.name = name;
  }

  async getMatchData(home, away) {
    throw new Error(
      `${this.name}: getMatchData() not implemented`
    );
  }
}


// =================================
// Provider Registry
// =================================

export const providers = [];


// =================================
// Register Provider
// =================================

export function registerProvider(provider) {

  if (!(provider instanceof DataProvider)) {
    throw new Error("Invalid data provider");
  }

  providers.push(provider);

}


// =================================
// Get All Providers
// =================================

export function getProviders() {

  return providers.map(provider => ({
    name: provider.name,
    status: "registered"
  }));

}
