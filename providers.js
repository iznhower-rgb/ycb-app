// ==========================================
// Y.C.B DATA PROVIDER SYSTEM
// ==========================================


// ==========================================
// BASE DATA PROVIDER
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


  const exists =
    providers.some(
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

  return providers.map(
    provider => ({

      name:
        provider.name,

      status:
        "registered"

    })
  );

}


// ==========================================
// CHECK PROVIDER RESULT
// ==========================================
//
// مهم جدًا:
//
// الاتصال بالمزود لا يعني أن البيانات
// المطلوبة للمباراة موجودة.
//
// success = true فقط عندما يعيد المزود
// status === "success".
//
// ==========================================

function isSuccessfulResult(result) {

  return Boolean(

    result &&

    result.status === "success"

  );

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


  // ----------------------------------------
  // لا نوقف جميع المزودين إذا فشل واحد منهم
  // ----------------------------------------

  for (const provider of providers) {

    try {

      const result =
        await provider.getMatchData(
          home,
          away,
          env
        );


      const success =
        isSuccessfulResult(result);


      results.push({

        provider:
          provider.name,

        success:
          success,

        status:
          result?.status ||
          "unknown",

        message:
          result?.message ||
          null,

        data:
          result?.data ||
          null

      });


    } catch (error) {

      results.push({

        provider:
          provider.name,

        success:
          false,

        status:
          "error",

        message:
          error?.message ||
          String(error),

        data:
          null,

        error:
          error?.message ||
          String(error)

      });

    }

  }


  return results;

}
