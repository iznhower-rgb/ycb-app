// ==========================================================
// Y.C.B PROVIDERS CORE 4.2.0
// ==========================================================
// Multi Provider Execution Core
//
// المسؤوليات:
// 1. تسجيل جميع مزودي البيانات.
// 2. تشغيل جميع المزودين بشكل مستقل.
// 3. عدم السماح بفشل مزود واحد بإيقاف البقية.
// 4. اعتبار partial_success بيانات قابلة للاستخدام.
// 5. اعتبار api_ok_no_match مفيدًا إذا كان يحتوي على history.
// 6. توحيد نتيجة كل Provider.
// 7. إضافة diagnostics لكل مصدر.
// 8. حماية Worker من نتائج Provider غير صحيحة.
// ==========================================================


// ==========================================================
// PROVIDER REGISTRY
// ==========================================================

const providers = [];


// ==========================================================
// CONSTANTS
// ==========================================================

const CORE_VERSION =
  "4.2.0";

const DEFAULT_PROVIDER_TIMEOUT_MS =
  18000;


// ==========================================================
// DATA PROVIDER BASE CLASS
// ==========================================================

export class DataProvider {

  constructor(
    name
  ) {

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
    typeof provider.getMatchData !==
      "function" ||
    !provider.name
  ) {

    throw new Error(
      "Invalid data provider"
    );

  }


  const normalizedName =
    String(
      provider.name
    )
      .trim()
      .toLowerCase();


  //
  // Prevent duplicate registration.
  //

  const exists =
    providers.some(
      item =>
        String(
          item?.name || ""
        )
          .trim()
          .toLowerCase() ===
        normalizedName
    );


  if (
    !exists
  ) {

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
        provider.name,

      version:
        provider.version ||
        null,

      enabled:
        provider.enabled !== false

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
// PROVIDER COUNT
// ==========================================================

export function getProviderCount() {

  return providers.length;

}


// ==========================================================
// CHECK RESULT USABILITY
// ==========================================================
//
// أهم إصلاح في هذا الملف.
//
// سابقًا:
// success = status === "success"
//
// هذا خطأ لأن:
// - partial_success قد يحتوي history حقيقي.
// - api_ok_no_match قد يحتوي history حقيقي.
// - بعض المصادر قد تجمع بيانات صحيحة لكن لا تجد fixture.
//
// الآن:
// إذا كانت هناك data صالحة والمصدر available=true,
// تعتبر النتيجة قابلة للدمج.
// ==========================================================

export function isUsableProviderResult(
  result
) {

  if (
    !result ||
    typeof result !==
      "object"
  ) {

    return false;

  }


  const data =
    result.data;


  if (
    !data ||
    typeof data !==
      "object"
  ) {

    return false;

  }


  //
  // Explicitly disabled provider
  // must not be used.
  //

  if (
    result.status ===
      "disabled"
  ) {

    return false;

  }


  if (
    data.available ===
      false
  ) {

    return false;

  }


  //
  // If data contains fixture, it is useful.
  //

  if (
    data.fixture
  ) {

    return true;

  }


  //
  // If fixture is absent but history exists,
  // data is still useful.
  //

  const homeHistory =
    Array.isArray(
      data?.recentMatches?.home
    )
      ? data.recentMatches.home
      : [];


  const awayHistory =
    Array.isArray(
      data?.recentMatches?.away
    )
      ? data.recentMatches.away
      : [];


  if (
    homeHistory.length > 0 ||
    awayHistory.length > 0
  ) {

    return true;

  }


  //
  // A provider may return matchFound=true
  // with another valid fixture structure.
  //

  if (
    data.matchFound ===
      true &&
    data.fixture
  ) {

    return true;

  }


  //
  // Otherwise no usable information.
  //

  return false;

}


// ==========================================================
// CHECK FIXTURE VERIFICATION
// ==========================================================

export function isFixtureVerified(
  data
) {

  if (
    !data ||
    typeof data !==
      "object"
  ) {

    return false;

  }


  if (
    data.matchFound ===
      true &&
    data.fixture
  ) {

    return true;

  }


  return false;

}


// ==========================================================
// HISTORY COUNT
// ==========================================================

export function getHistoryCount(
  data
) {

  if (
    !data
  ) {

    return {

      home:
        0,

      away:
        0,

      total:
        0

    };

  }


  const home =
    Array.isArray(
      data?.recentMatches?.home
    )
      ? data.recentMatches.home.length
      : 0;


  const away =
    Array.isArray(
      data?.recentMatches?.away
    )
      ? data.recentMatches.away.length
      : 0;


  return {

    home,

    away,

    total:
      home +
      away

  };

}


// ==========================================================
// NORMALIZE PROVIDER RESULT
// ==========================================================

function normalizeProviderResult(
  provider,
  result,
  startedAt
) {

  const durationMs =
    Date.now() -
    startedAt;


  //
  // Provider returned nothing.
  //

  if (
    !result ||
    typeof result !==
      "object"
  ) {

    return {

      provider:
        provider.name,

      success:
        false,

      usable:
        false,

      status:
        "empty_result",

      message:
        "Provider returned an empty result.",

      data:
        null,

      fixtureVerified:
        false,

      history:
        {

          home:
            0,

          away:
            0,

          total:
            0

        },

      durationMs

    };

  }


  const data =
    result.data ||
    null;


  const usable =
    isUsableProviderResult(
      result
    );


  const fixtureVerified =
    isFixtureVerified(
      data
    );


  const history =
    getHistoryCount(
      data
    );


  //
  // IMPORTANT:
  //
  // success now means:
  // "The provider produced usable data"
  //
  // It no longer means:
  // "The provider found the fixture."
  //
  // Fixture verification is tracked separately.
  //

  return {

    provider:
      provider.name,

    success:
      usable,

    usable,

    status:
      result.status ||
      (
        usable
          ? "success"
          : "unknown"
      ),

    message:
      result.message ||
      "",

    data,

    fixtureVerified,

    history,

    durationMs

  };

}


// ==========================================================
// PROVIDER EXECUTION WITH TIMEOUT
// ==========================================================

async function executeProvider(
  provider,
  home,
  away,
  env
) {

  const startedAt =
    Date.now();


  const timeoutMs =
    Number(
      env?.YCB_PROVIDER_TIMEOUT_MS
    ) ||
    DEFAULT_PROVIDER_TIMEOUT_MS;


  //
  // Disabled provider object.
  //

  if (
    provider.enabled ===
      false
  ) {

    return {

      provider:
        provider.name,

      success:
        false,

      usable:
        false,

      status:
        "disabled",

      message:
        provider.disabledMessage ||
        "Provider disabled.",

      data:
        null,

      fixtureVerified:
        false,

      history:
        {

          home:
            0,

          away:
            0,

          total:
            0

        },

      durationMs:
        Date.now() -
        startedAt

    };

  }


  //
  // AbortController is only used to signal
  // timeout to providers that respect signal.
  //
  // Providers can still implement their own timeout.
  //

  const controller =
    new AbortController();


  const providerEnv = {

    ...(env || {}),

    YCB_PROVIDER_SIGNAL:
      controller.signal,

    YCB_PROVIDER_TIMEOUT_MS:
      timeoutMs

  };


  let timer =
    null;


  try {

    const providerPromise =
      Promise.resolve(
        provider.getMatchData(
          home,
          away,
          providerEnv
        )
      );


    const timeoutPromise =
      new Promise(
        (
          _resolve,
          reject
        ) => {

          timer =
            setTimeout(
              () => {

                try {

                  controller.abort();

                } catch {
                  // Ignore abort errors.
                }


                reject(
                  new Error(
                    `${provider.name} timeout after ${timeoutMs}ms`
                  )
                );

              },
              timeoutMs
            );

        }
      );


    const result =
      await Promise.race(
        [
          providerPromise,
          timeoutPromise
        ]
      );


    return normalizeProviderResult(
      provider,
      result,
      startedAt
    );

  } catch (
    error
  ) {

    return {

      provider:
        provider.name,

      success:
        false,

      usable:
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

      fixtureVerified:
        false,

      history:
        {

          home:
            0,

          away:
            0,

          total:
            0

        },

      durationMs:
        Date.now() -
        startedAt

    };

  } finally {

    if (
      timer
    ) {

      clearTimeout(
        timer
      );

    }

  }

}


// ==========================================================
// EXECUTE ALL PROVIDERS
// ==========================================================
//
// جميع المصادر تعمل بالتوازي.
//
// إذا فشل ESPN:
// TheSportsDB لا يتأثر.
//
// إذا فشل BSD:
// SofaScore لا يتأثر.
//
// إذا انتهى Provider بtimeout:
// البقية تستمر.
//
// ==========================================================

export async function getAllMatchData(
  home,
  away,
  env = {}
) {

  const cleanHome =
    String(
      home || ""
    ).trim();


  const cleanAway =
    String(
      away || ""
    ).trim();


  if (
    !cleanHome ||
    !cleanAway
  ) {

    return [];

  }


  const providerList =
    providers.filter(
      provider =>
        provider &&
        typeof provider.getMatchData ===
          "function"
    );


  if (
    !providerList.length
  ) {

    return [];

  }


  const results =
    await Promise.all(
      providerList.map(
        provider =>
          executeProvider(
            provider,
            cleanHome,
            cleanAway,
            env
          )
      )
    );


  return results;

}


// ==========================================================
// GET USABLE RESULTS
// ==========================================================

export function getUsableProviderResults(
  providerResults
) {

  if (
    !Array.isArray(
      providerResults
    )
  ) {

    return [];

  }


  return providerResults.filter(
    result =>
      result?.usable ===
        true ||
      isUsableProviderResult(
        result
      )
  );

}


// ==========================================================
// GET FIXTURE VERIFICATION COUNT
// ==========================================================

export function countFixtureVerifications(
  providerResults
) {

  if (
    !Array.isArray(
      providerResults
    )
  ) {

    return 0;

  }


  return providerResults.filter(
    result =>
      isFixtureVerified(
        result?.data
      )
  ).length;

}


// ==========================================================
// GET HISTORY PROVIDER COUNT
// ==========================================================

export function countHistoryProviders(
  providerResults
) {

  if (
    !Array.isArray(
      providerResults
    )
  ) {

    return 0;

  }


  return providerResults.filter(
    result => {

      const history =
        getHistoryCount(
          result?.data
        );


      return history.total >
        0;

    }
  ).length;

}


// ==========================================================
// PROVIDER STATUS SUMMARY
// ==========================================================

export function getProviderSummary(
  providerResults
) {

  const results =
    Array.isArray(
      providerResults
    )
      ? providerResults
      : [];


  const usable =
    getUsableProviderResults(
      results
    );


  const fixtureVerifiedBy =
    countFixtureVerifications(
      results
    );


  const historyProviders =
    countHistoryProviders(
      results
    );


  return {

    providerCount:
      results.length,

    usableProviderCount:
      usable.length,

    successfulProviderCount:
      results.filter(
        result =>
          result?.success
      ).length,

    fixtureVerifiedBy,

    historyProviders,

    allFailed:
      results.length > 0 &&
      usable.length === 0,

    multiProviderReady:
      fixtureVerifiedBy >= 2

  };

}


// ==========================================================
// ERROR CLASSIFICATION
// ==========================================================

function classifyProviderError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "timeout"
    )
  ) {

    return "timeout";

  }


  if (
    message.includes(
      "http 401"
    )
  ) {

    return "http_401";

  }


  if (
    message.includes(
      "http 402"
    )
  ) {

    return "http_402";

  }


  if (
    message.includes(
      "http 403"
    )
  ) {

    return "http_403";

  }


  if (
    message.includes(
      "http 404"
    )
  ) {

    return "http_404";

  }


  if (
    message.includes(
      "http 408"
    )
  ) {

    return "http_408";

  }


  if (
    message.includes(
      "http 429"
    )
  ) {

    return "rate_limited";

  }


  if (
    message.includes(
      "failed to fetch"
    ) ||

    message.includes(
      "network"
    )
  ) {

    return "network_error";

  }


  return "provider_error";

}


// ==========================================================
// RESET REGISTRY
// ==========================================================
//
// للاختبارات فقط.
//
// لا يستخدمه Worker أثناء التشغيل العادي.
// ==========================================================

export function resetProvidersForTests() {

  providers.length =
    0;

}


// ==========================================================
// CORE INFO
// ==========================================================

export function getProvidersCoreInfo() {

  return {

    version:
      CORE_VERSION,

    providerCount:
      providers.length,

    providers:
      getProviders()

  };

}


// ==========================================================
// DEFAULT EXPORT
// ==========================================================

export default {

  DataProvider,

  registerProvider,

  getProviders,

  getProviderInstances,

  getProviderCount,

  getAllMatchData,

  isUsableProviderResult,

  isFixtureVerified,

  getHistoryCount,

  getUsableProviderResults,

  countFixtureVerifications,

  countHistoryProviders,

  getProviderSummary,

  getProvidersCoreInfo

};
