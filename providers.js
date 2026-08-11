// ==========================================================
// Y.C.B PROVIDERS CORE 3.1.0
// ==========================================================
//
// Provider registry only.
//
// ==========================================================

const providers = [];


/* ==========================================================
   DATA PROVIDER
========================================================== */

export class DataProvider {

  constructor(name) {
    this.name = String(name || "").trim();
  }

  async getMatchData(home, away, env) {

    throw new Error(
      `getMatchData() not implemented for ${this.name}`
    );

  }

}


/* ==========================================================
   REGISTER PROVIDER
========================================================== */

export function registerProvider(provider) {

  if (!provider) {
    throw new Error("Invalid data provider");
  }

  if (
    typeof provider.getMatchData !== "function"
  ) {
    throw new Error(
      "Invalid data provider: getMatchData() is required"
    );
  }

  if (!provider.name) {
    throw new Error(
      "Invalid data provider: provider name is required"
    );
  }

  const exists = providers.some(
    item => item.name === provider.name
  );

  if (!exists) {
    providers.push(provider);
  }

  return provider;

}


/* ==========================================================
   GET PROVIDERS
========================================================== */

export function getProviders() {

  return providers.map(
    provider => ({
      provider: provider.name
    })
  );

}


/* ==========================================================
   GET PROVIDER INSTANCES
========================================================== */

export function getProviderInstances() {

  return [...providers];

}


/* ==========================================================
   COUNT
========================================================== */

export function getProviderCount() {

  return providers.length;

}


/* ==========================================================
   CLEAR PROVIDERS
========================================================== */

export function clearProviders() {

  providers.length = 0;

}


/* ==========================================================
   END providers.js
========================================================== */
