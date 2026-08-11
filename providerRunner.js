// ==========================================================
// Y.C.B PROVIDER RUNNER 3.0.1
// ==========================================================
//
// مسؤولية هذا الملف:
// تنفيذ getAllMatchData() على جميع مزودي البيانات.
//
// تم عزل هذه الوظيفة من providers.js حتى تصبح البنية:
//
// providers.js
//     ↓
// providerRunner.js
//     ↓
// statsCollector.js
//     ↓
// worker.js
//
// ==========================================================

import {
  getProviderInstances
} from "./providers.js";


/* ==========================================================
   GET ALL MATCH DATA
========================================================== */

export async function getAllMatchData(
  home,
  away,
  env
){

  const providers =
    getProviderInstances();


  /*
   * إذا لم يوجد أي Provider
   */

  if(
    !Array.isArray(providers) ||
    providers.length === 0
  ){

    return [];

  }


  /*
   * تشغيل جميع المصادر بالتوازي.
   *
   * كل Provider مستقل.
   * فشل Provider واحد لا يوقف بقية المصادر.
   */

  return Promise.all(

    providers.map(
      async provider => {

        const startedAt =
          Date.now();


        try{

          const result =
            await provider.getMatchData(
              home,
              away,
              env
            );


          /*
           * حماية إضافية إذا أعاد Provider
           * قيمة غير صالحة.
           */

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
              safeResult.data ||
              null,


            durationMs:
              Date.now() -
              startedAt

          };

        }catch(
          error
        ){

          /*
           * خطأ داخل Provider.
           *
           * لا نرمي الخطأ مرة أخرى حتى لا يتوقف
           * باقي مزودي البيانات.
           */

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
   GET SUCCESSFUL PROVIDER RESULTS
========================================================== */

export function getSuccessfulProviderResults(
  results
){

  if(
    !Array.isArray(
      results
    )
  ){

    return [];

  }


  return results.filter(
    item =>

      item &&

      item.success &&

      item.data

  );

}


/* ==========================================================
   GET PROVIDER COUNTS
========================================================== */

export function getProviderStats(
  results
){

  const safeResults =

    Array.isArray(
      results
    )

      ? results

      : [];


  const successful =
    safeResults.filter(
      item =>

        item &&

        item.success &&

        item.data

    );


  return {

    providerCount:
      safeResults.length,


    successfulProviderCount:
      successful.length

  };

}


/* ==========================================================
   DEFAULT
========================================================== */

export default {
  getAllMatchData,
  getSuccessfulProviderResults,
  getProviderStats
};
