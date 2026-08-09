// Y.C.B PROVIDERS CORE
// Phase 2.2
// Stable provider registry + safe multi-provider execution
// Browser-safe / no provider can break the analysis

const providers = [];


/* ==========================================
   DATA PROVIDER BASE
========================================== */

export class DataProvider {

  constructor(name) {

    this.name =
      String(name || "").trim();

  }


  async getMatchData(
    home,
    away,
    env = {}
  ) {

    throw new Error(
      `getMatchData() not implemented for ${this.name}`
    );

  }

}


/* ==========================================
   REGISTER PROVIDER
========================================== */

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
        item.name === provider.name
    );


  if (!exists) {

    providers.push(
      provider
    );

  }


  return provider;

}


/* ==========================================
   GET PROVIDERS
========================================== */

export function getProviders() {

  return providers.map(
    provider => ({

      provider:
        provider.name

    })
  );

}


/* ==========================================
   GET PROVIDER INSTANCES
========================================== */

export function getProviderInstances() {

  return [
    ...providers
  ];

}


/* ==========================================
   GET ALL MATCH DATA
========================================== */

export async function getAllMatchData(
  home,
  away,
  env = {}
) {

  /*
   * Every provider is completely isolated.
   *
   * A provider can:
   * - succeed
   * - fail
   * - timeout
   * - be blocked
   *
   * None of these conditions can stop
   * the remaining providers.
   */

  const results =
    await Promise.all(

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

            /*
             * Absolute safety layer.
             *
             * Even if a provider accidentally
             * throws outside its own try/catch,
             * the whole Y.C.B engine remains alive.
             */

            return {

              provider:
                provider.name,

              success:
                false,

              status:
                classifyProviderError(
                  error
                ),

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


  return results;

}


/* ==========================================
   PROVIDER COUNT
========================================== */

export function getProviderCount() {

  return providers.length;

}


/* ==========================================
   PROVIDER ERROR CLASSIFICATION
========================================== */

function classifyProviderError(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "timeout"
    ) ||
    message.includes(
      "timed out"
    )
  ) {

    return "timeout";

  }


  if (
    message.includes(
      "cors"
    ) ||
    message.includes(
      "access-control"
    ) ||
    message.includes(
      "blocked"
    ) ||
    message.includes(
      "forbidden"
    ) ||
    message.includes(
      "403"
    )
  ) {

    return "access_blocked";

  }


  if (
    message.includes(
      "401"
    ) ||
    message.includes(
      "unauthorized"
    )
  ) {

    return "auth_error";

  }


  if (
    message.includes(
      "429"
    )
  ) {

    return "rate_limited";

  }


  return "provider_error";

}
