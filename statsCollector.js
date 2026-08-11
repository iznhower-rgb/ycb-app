// ==========================================================
// Y.C.B STATS COLLECTOR 3.0.1
// ==========================================================
//
// مسؤولية هذا الملف:
//
// 1. دمج بيانات مزودي البيانات
// 2. إزالة المباريات المكررة
// 3. بناء إحصائيات الفريق
// 4. حساب xG الأساسي
// 5. توحيد أسماء الفرق
// 6. مطابقة أسماء الفرق
//
// لا يحتوي هذا الملف على:
//
// - getAllMatchData()
// - registerProvider()
// - DataProvider
// - HTTP requests
// - Worker routes
//
// ==========================================================


/* ==========================================================
   MERGE PROVIDER DATA
========================================================== */

export function mergeProviderData(
  results
){

  let fixture =
    null;


  const homeMatches =
    [];


  const awayMatches =
    [];


  const safeResults =
    Array.isArray(
      results
    )

      ? results

      : [];


  for(
    const item
    of safeResults
  ){

    if(
      !item ||
      !item.data
    ){

      continue;

    }


    const data =
      item.data;


    /*
     * أول fixture صالح.
     */

    if(
      !fixture &&
      data.fixture
    ){

      fixture =
        data.fixture;

    }


    /*
     * مباريات الفريق المضيف.
     */

    if(
      Array.isArray(
        data.recentMatches?.home
      )
    ){

      homeMatches.push(
        ...data.recentMatches.home
      );

    }


    /*
     * مباريات الفريق الضيف.
     */

    if(
      Array.isArray(
        data.recentMatches?.away
      )
    ){

      awayMatches.push(
        ...data.recentMatches.away
      );

    }

  }


  return {

    fixture,

    homeMatches:
      dedupeMatches(
        homeMatches
      ),

    awayMatches:
      dedupeMatches(
        awayMatches
      )

  };

}


/* ==========================================================
   DEDUPE MATCHES
========================================================== */

export function dedupeMatches(
  matches
){

  if(
    !Array.isArray(
      matches
    )
  ){

    return [];

  }


  const seen =
    new Set();


  return matches

    .filter(
      match => {

        if(
          !match
        ){

          return false;

        }


        const key =

          match.id

            ? String(
                match.id
              )

            : [

                match.utcDate ||
                  "",

                match.homeTeam?.name ||
                  "",

                match.awayTeam?.name ||
                  ""

              ].join(
                "|"
              );


        if(
          seen.has(
            key
          )
        ){

          return false;

        }


        seen.add(
          key
        );


        return true;

      }
    )


    /*
     * الأحدث أولاً.
     */

    .sort(
      (
        a,
        b
      ) => {

        const dateA =
          new Date(
            a.utcDate ||
            0
          ).getTime();


        const dateB =
          new Date(
            b.utcDate ||
            0
          ).getTime();


        return dateB -
               dateA;

      }
    )


    /*
     * نحتفظ بحد أقصى 15 مباراة.
     */

    .slice(
      0,
      15
    );

}


/* ==========================================================
   BUILD TEAM ANALYSIS
========================================================== */

export function buildTeamAnalysis(
  homeName,
  awayName,
  merged
){

  const safeMerged =
    merged &&
    typeof merged ===
      "object"

      ? merged

      : {};


  const home =
    calculateTeamStats(
      homeName,
      Array.isArray(
        safeMerged.homeMatches
      )
        ? safeMerged.homeMatches
        : []
    );


  const away =
    calculateTeamStats(
      awayName,
      Array.isArray(
        safeMerged.awayMatches
      )
        ? safeMerged.awayMatches
        : []
    );


  /*
   * xG المضيف:
   *
   * 55% من قوة هجومه
   * 45% من معدل استقبال الخصم
   *
   * مع أفضلية الملعب 1.08
   */

  const homeXg =
    clamp(

      (

        home.goalsForAvg *
        0.55

        +

        away.goalsAgainstAvg *
        0.45

      )

      *

      1.08,

      0.15,

      4

    );


  /*
   * xG الضيف:
   *
   * 55% من قوة هجومه
   * 45% من معدل استقبال المضيف
   *
   * مع معامل 0.92 للعب خارج الملعب.
   */

  const awayXg =
    clamp(

      (

        away.goalsForAvg *
        0.55

        +

        home.goalsAgainstAvg *
        0.45

      )

      *

      0.92,

      0.10,

      3.50

    );


  return {

    home,

    away,

    model: {

      homeXg:
        round(
          homeXg
        ),

      awayXg:
        round(
          awayXg
        )

    }

  };

}


/* ==========================================================
   CALCULATE TEAM STATS
========================================================== */

export function calculateTeamStats(
  teamName,
  matches
){

  const team =
    normalizeName(
      teamName
    );


  const safeMatches =
    Array.isArray(
      matches
    )
      ? matches
      : [];


  const usable =
    safeMatches

      .map(
        match => {

          if(
            !match
          ){

            return null;

          }


          const home =
            normalizeName(
              match.homeTeam?.name
            );


          const away =
            normalizeName(
              match.awayTeam?.name
            );


          const homeGoals =
            finiteOrNull(
              match.score?.fullTime?.home
            );


          const awayGoals =
            finiteOrNull(
              match.score?.fullTime?.away
            );


          /*
           * لا نستخدم المباراة إذا لم تكن
           * النتيجة رقمية.
           */

          if(

            homeGoals ===
              null

            ||

            awayGoals ===
              null

          ){

            return null;

          }


          /*
           * المباراة يجب أن تخص الفريق المطلوب.
           */

          if(

            !namesMatch(
              home,
              team
            )

            &&

            !namesMatch(
              away,
              team
            )

          ){

            return null;

          }


          const isHome =
            namesMatch(
              home,
              team
            );


          const gf =
            isHome

              ? homeGoals

              : awayGoals;


          const ga =
            isHome

              ? awayGoals

              : homeGoals;


          let result;


          if(
            gf > ga
          ){

            result =
              "W";

          }

          else if(
            gf < ga
          ){

            result =
              "L";

          }

          else{

            result =
              "D";

          }


          return {

            gf,

            ga,

            result

          };

        }
      )

      .filter(
        Boolean
      );


  /*
   * آخر 5 مباريات.
   */

  const last5 =
    usable.slice(
      0,
      5
    );


  /*
   * آخر 10 مباريات.
   */

  const last10 =
    usable.slice(
      0,
      10
    );


  /*
   * متوسط قيمة معينة.
   */

  const average =
    (
      items,
      key
    ) => {

      if(
        !items.length
      ){

        return 0;

      }


      const total =
        items.reduce(
          (
            sum,
            item
          ) =>

            sum +
            Number(
              item[key] ||
              0
            ),

          0
        );


      return (
        total /
        items.length
      );

    };


  const gf5 =
    average(
      last5,
      "gf"
    );


  const gf10 =
    average(
      last10,
      "gf"
    );


  const ga5 =
    average(
      last5,
      "ga"
    );


  const ga10 =
    average(
      last10,
      "ga"
    );


  const wins =
    usable.filter(
      item =>
        item.result ===
        "W"
    ).length;


  const draws =
    usable.filter(
      item =>
        item.result ===
        "D"
    ).length;


  const losses =
    usable.filter(
      item =>
        item.result ===
        "L"
    ).length;


  const formPoints =
    wins * 3 +
    draws;


  const formRate =

    usable.length

      ? formPoints /
        (
          usable.length *
          3
        )

      : 0;


  /*
   * نعطي آخر 5 مباريات وزناً أكبر.
   */

  const goalsForAvg =

    last5.length

      ? gf5 * 0.60 +
        gf10 * 0.40

      : gf10;


  const goalsAgainstAvg =

    last5.length

      ? ga5 * 0.60 +
        ga10 * 0.40

      : ga10;


  return {

    team:
      teamName,

    games:
      usable.length,

    wins,

    draws,

    losses,

    formPoints,

    formRate:
      round(
        formRate
      ),

    goalsForAvg:
      round(
        goalsForAvg
      ),

    goalsAgainstAvg:
      round(
        goalsAgainstAvg
      )

  };

}


/* ==========================================================
   NORMALIZE TEAM NAME
========================================================== */

export function normalizeName(
  value
){

  return String(
    value ||
    ""
  )

    .toLowerCase()

    .trim()


    /*
     * إزالة علامات التشكيل.
     */

    .normalize(
      "NFD"
    )

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )


    /*
     * توحيد &.
     */

    .replace(
      /&/g,
      " and "
    )


    /*
     * إزالة الاختصارات الشائعة للأندية.
     */

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|the)\b/g,
      " "
    )


    /*
     * الإبقاء على الحروف الإنجليزية
     * والأرقام والحروف العربية والمسافات.
     */

    .replace(
      /[^a-z0-9\u0600-\u06ff\s]/gi,
      " "
    )


    /*
     * إزالة المسافات الزائدة.
     */

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* ==========================================================
   NAME MATCH
========================================================== */

export function namesMatch(
  first,
  second
){

  const a =
    normalizeName(
      first
    );


  const b =
    normalizeName(
      second
    );


  if(
    !a ||
    !b
  ){

    return false;

  }


  /*
   * تطابق كامل.
   */

  if(
    a === b
  ){

    return true;

  }


  /*
   * أحد الاسمين يحتوي الآخر.
   */

  if(
    a.includes(b) ||
    b.includes(a)
  ){

    return true;

  }


  /*
   * مقارنة الكلمات.
   */

  const ta =
    new Set(

      a
        .split(" ")
        .filter(
          item =>
            item.length >= 3
        )

    );


  const tb =
    b
      .split(" ")
      .filter(
        item =>
          item.length >= 3
      );


  if(
    tb.length === 0
  ){

    return false;

  }


  const overlap =
    tb.filter(
      item =>
        ta.has(
          item
        )
    ).length;


  return (

    overlap >=

    Math.min(
      2,
      tb.length
    )

  );

}


/* ==========================================================
   FINITE NUMBER
========================================================== */

function finiteOrNull(
  value
){

  if(
    value === null ||
    value === undefined ||
    value === ""
  ){

    return null;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )

    ? number

    : null;

}


/* ==========================================================
   CLAMP
========================================================== */

function clamp(
  value,
  min,
  max
){

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ){

    return min;

  }


  return Math.min(

    Math.max(
      number,
      min
    ),

    max

  );

}


/* ==========================================================
   ROUND
========================================================== */

function round(
  value
){

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ){

    return 0;

  }


  return Math.round(
    number *
    100
  ) / 100;

}


/* ==========================================================
   DEFAULT EXPORT
========================================================== */

export default {

  mergeProviderData,

  dedupeMatches,

  buildTeamAnalysis,

  calculateTeamStats,

  normalizeName,

  namesMatch

};
