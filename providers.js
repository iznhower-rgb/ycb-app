// ==========================================================
// Y.C.B PROVIDERS CORE 3.0.1
// ==========================================================
//
// مسؤولية هذا الملف:
//
// 1. تعريف DataProvider
// 2. تسجيل مزودي البيانات
// 3. الحصول على قائمة المزودين
// 4. الحصول على Instances الخاصة بالمزودين
// 5. حساب عدد المزودين
//
// لا يحتوي هذا الملف على:
//
// - getAllMatchData()
// - جمع الإحصائيات
// - mergeProviderData()
// - dedupeMatches()
// - buildTeamAnalysis()
// - calculateTeamStats()
//
// ==========================================================


const providers = [];


/* ==========================================================
   DATA PROVIDER
========================================================== */

export class DataProvider {

  constructor(
    name
  ){

    this.name =
      String(
        name ||
        ""
      ).trim();

  }


  async getMatchData(
    home,
    away,
    env
  ){

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
){

  if(
    !provider ||

    typeof provider.getMatchData !==
      "function" ||

    !provider.name
  ){

    throw new Error(
      "Invalid data provider"
    );

  }


  /*
   * منع تسجيل نفس Provider مرتين.
   */

  if(
    !providers.some(
      item =>
        item.name ===
        provider.name
    )
  ){

    providers.push(
      provider
    );

  }


  return provider;

}


/* ==========================================================
   GET PROVIDERS
========================================================== */

export function getProviders(){

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

export function getProviderInstances(){

  return [
    ...providers
  ];

}


/* ==========================================================
   COUNT
========================================================== */

export function getProviderCount(){

  return providers.length;

}


/* ==========================================================
   DEFAULT EXPORT
========================================================== */

export default {

  DataProvider,

  registerProvider,

  getProviders,

  getProviderInstances,

  getProviderCount

};
