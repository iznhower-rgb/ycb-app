// ==========================================================
// Y.C.B PROVIDERS CORE
// Version 2.3.0
// ==========================================================

const providers = [];


// ==========================================================
// DATA PROVIDER BASE
// ==========================================================

export class DataProvider {

  constructor(name) {

    this.name =
      String(
        name || ""
      ).trim();

  }


  async getMatchData(
    home,
    away,
    env
  ) {

    throw new Error(
      `getMatchData() not implemented for ${this.name}`
    );

  }

}


// ==========================================================
// REGISTER PROVIDER
// ==========================================================

export function registerProvider(
  provider
) {

  if (
    !provider ||
    typeof provider.getMatchData !== "function" ||
    !provider.name
  ) {

    throw new Error(
      "Invalid data provider"
    );

  }


  const exists =
    providers.some(
      item =>
        item.name ===
        provider.name
    );


  if (!exists) {

    providers.push(
      provider
    );

  }


  return provider;

}


// ==========================================================
// GET PROVIDERS
// ==========================================================

export function getProviders() {

  return providers.map(
    provider => ({

      provider:
        provider.name

    })
  );

}


// ==========================================================
// GET PROVIDER INSTANCES
// ==========================================================

export function getProviderInstances() {

  return [
    ...providers
  ];

}


// ==========================================================
// GET ALL MATCH DATA
// ==========================================================

export async function getAllMatchData(
  home,
  away,
  env
) {

  /*
   * Every provider runs independently.
   *
   * IMPORTANT:
   *
   * success means that the provider
   * returned usable data.
   *
   * partial_success is also considered
   * usable because it may contain valuable
   * historical matches even when the exact
   * fixture was not found.
   */

  return Promise.all(

    providers.map(
      async provider => {

        const startedAt =
          Date.now();


        try {

          const result =
            await provider.getMatchData(
              home,
              away,
              env
            );


          return {

            provider:
              provider.name,

            success:
              result?.status ===
                "success" ||

              result?.status ===
                "partial_success",

            status:
              result?.status ||
              "unknown",

            message:
              result?.message ||
              "",

            data:
              result?.data ||
              null,

            durationMs:
              Date.now() -
              startedAt

          };

        } catch (
          error
        ) {

          return {

            provider:
              provider.name,

            success:
              false,

            status:
              "provider_error",

            message:
              error?.message ||
              String(
                error
              ),

            data:
              null,

            durationMs:
              Date.now() -
              startedAt

          };

        }

      }
    )

  );

}


// ==========================================================
// PROVIDER COUNT
// ==========================================================

export function getProviderCount() {

  return providers.length;

}
