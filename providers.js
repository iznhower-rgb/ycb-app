// ==========================================================
// Y.C.B PROVIDERS CORE 3.0.1
// ==========================================================

const providers = [];


export class DataProvider {

  constructor(name) {

    this.name =
      String(name || "").trim();

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


/* ==========================================================
   REGISTER PROVIDER
========================================================== */

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


  if (
    !providers.some(
      item =>
        item.name === provider.name
    )
  ) {

    providers.push(
      provider
    );

  }


  return provider;

}


/* ==========================================================
   GET PROVIDERS
========================================================== */

export function getProviders() {

  return providers.map(
    provider => ({

      provider:
        provider.name

    })
  );

}


/* ==========================================================
   GET PROVIDER INSTANCES
========================================================== */

export function getProviderInstances() {

  return [
    ...providers
  ];

}


/* ==========================================================
   EXECUTE ALL PROVIDERS
========================================================== */

export async function getAllMatchData(
  home,
  away,
  env
) {

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
              "success",

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
              String(error),

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


/* ==========================================================
   COUNT
========================================================== */

export function getProviderCount() {

  return providers.length;

}
