// Y.C.B PROVIDERS CORE
// Phase 2.2
// Stable provider registry + safe multi-provider execution
// Browser-safe provider execution
// No provider failure can stop the complete analysis


const providers = [];


/* ==========================================
   CONSTANTS
========================================== */

const DEFAULT_PROVIDER_TIMEOUT =
  15000;


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
    env
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
   UNREGISTER PROVIDER
========================================== */

export function unregisterProvider(
  name
) {

  const target =
    String(
      name || ""
    ).trim();


  if (!target) {
    return false;
  }


  const index =
    providers.findIndex(
      provider =>
        provider.name === target
    );


  if (
    index === -1
  ) {

    return false;

  }


  providers.splice(
    index,
    1
  );


  return true;

}


/* ==========================================
   CLEAR PROVIDERS
========================================== */

export function clearProviders() {

  providers.length = 0;

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
   SAFE PROVIDER EXECUTION
========================================== */

async function executeProvider(
  provider,
  home,
  away,
  env
) {

  const startedAt =
    Date.now();


  try {

    const result =
      await provider.getMatchData(
        home,
        away,
        env
      );


    const durationMs =
      Date.now() -
      startedAt;


    const safeResult =
      result &&
      typeof result === "object"
        ? result
        : {};


    return {

      provider:
        provider.name,

      success:
        safeResult.status ===
        "success",

      status:
        safeResult.status ||
        "unknown",

      message:
        safeResult.message ||
        "",

      data:
        safeResult.data ??
        null,

      durationMs

    };

  } catch (
    error
  ) {

    const durationMs =
      Date.now() -
      startedAt;


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

      durationMs

    };

  }

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
   * Every provider runs independently.
   *
   * A failure in one provider NEVER
   * stops another provider.
   */


  if (
    providers.length === 0
  ) {

    return [];

  }


  const results =
    await Promise.all(
      providers.map(
        provider =>
          executeProvider(
            provider,
            home,
            away,
            env
          )
      )
    );


  return results;

}


/* ==========================================
   GET ALL MATCH DATA WITH TIMEOUT
========================================== */

export async function getAllMatchDataSafe(
  home,
  away,
  env = {},
  timeoutMs =
    DEFAULT_PROVIDER_TIMEOUT
) {

  if (
    providers.length === 0
  ) {

    return [];

  }


  const timeout =
    Number.isFinite(
      Number(timeoutMs)
    )
      ? Math.max(
          1000,
          Number(timeoutMs)
        )
      : DEFAULT_PROVIDER_TIMEOUT;


  const results =
    await Promise.all(

      providers.map(
        async provider => {

          const startedAt =
            Date.now();


          try {

            const result =
              await Promise.race([

                provider.getMatchData(
                  home,
                  away,
                  env
                ),

                new Promise(
                  (_, reject) => {

                    setTimeout(
                      () => {

                        const error =
                          new Error(
                            `Provider timeout after ${timeout}ms`
                          );

                        error.code =
                          "PROVIDER_TIMEOUT";

                        reject(
                          error
                        );

                      },
                      timeout
                    );

                  }
                )

              ]);


            const durationMs =
              Date.now() -
              startedAt;


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
                result?.data ??
                null,

              durationMs

            };

          } catch (
            error
          ) {

            const durationMs =
              Date.now() -
              startedAt;


            return {

              provider:
                provider.name,

              success:
                false,

              status:
                error?.code ===
                  "PROVIDER_TIMEOUT"

                  ? "timeout"

                  : "provider_error",

              message:
                error?.message ||
                String(error),

              data:
                null,

              durationMs

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
   PROVIDER STATUS SUMMARY
========================================== */

export function summarizeProviderResults(
  results
) {

  const list =
    Array.isArray(results)
      ? results
      : [];


  return {

    total:
      list.length,

    successful:
      list.filter(
        item =>
          item?.success === true
      ).length,

    available:
      list.filter(
        item =>
          item?.data?.available === true
      ).length,

    blocked:
      list.filter(
        item =>
          item?.status ===
          "access_blocked"
      ).length,

    errors:
      list.filter(
        item =>
          [
            "provider_error",
            "network_error",
            "api_error",
            "endpoint_not_found",
            "timeout"
          ].includes(
            item?.status
          )
      ).length,

    disabled:
      list.filter(
        item =>
          String(
            item?.status ||
            ""
          ).startsWith(
            "disabled"
          )
      ).length

  };

}
