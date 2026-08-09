// ==========================================
// Y.C.B PROVIDERS CORE
// ==========================================

const providers = [];


// ==========================================
// DATA PROVIDER BASE CLASS
// ==========================================

export class DataProvider {

  constructor(name) {

    this.name =
      name;

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


// ==========================================
// REGISTER PROVIDER
// ==========================================

export function registerProvider(
  provider
) {

  if (
    !provider ||
    typeof provider.getMatchData !== "function"
  ) {

    throw new Error(
      "Invalid data provider"
    );

  }


  const exists =
    providers.some(
      item =>
        item.name === provider.name
    );


  if (!exists) {

    providers.push(
      provider
    );

  }


  return provider;

}


// ==========================================
// GET PROVIDERS
// ==========================================

export function getProviders() {

  return providers.map(
    provider => ({
      provider:
        provider.name
    })
  );

}


// ==========================================
// GET ALL MATCH DATA
// ==========================================

export async function getAllMatchData(
  home,
  away,
  env
) {

  const results =
    await Promise.all(

      providers.map(
        async provider => {

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
                result?.status === "success",

              status:
                result?.status ||
                "unknown",

              message:
                result?.message ||
                "",

              data:
                result?.data ||
                null

            };

          } catch (error) {

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
                null

            };

          }

        }
      )

    );


  return results;

}


// ==========================================
// EXPORT PROVIDER LIST
// ==========================================

export function getProviderInstances() {

  return [
    ...providers
  ];

}
