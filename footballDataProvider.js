// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================
//
// الهدف من هذا المزود:
//
// 1. الاتصال الحقيقي بـ Football-Data.org
// 2. عدم افتراض أن المباراة في Premier League
// 3. البحث في مباريات Football-Data.org المتاحة
// 4. مطابقة اسم الفريقين بمرونة
// 5. عدم إنشاء أي توقعات وهمية
// 6. إرجاع حالة واضحة عند عدم العثور على المباراة
//
// ==========================================


import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE =
  "https://api.football-data.org/v4";


// ==========================================
// FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider extends DataProvider {

  constructor() {

    super("Football-Data.org");

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(
    home,
    away,
    env
  ) {

    // --------------------------------------
    // Validate environment
    // --------------------------------------

    if (!env) {

      return {

        provider:
          this.name,

        status:
          "environment_missing",

        home,
        away,

        data:
          null,

        message:
          "Worker environment is missing"

      };

    }


    // --------------------------------------
    // Validate token
    // --------------------------------------

    const token =
      String(
        env.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    if (!token) {

      return {

        provider:
          this.name,

        status:
          "not_configured",

        home,
        away,

        data:
          null,

        dataSource:
          "Football-Data.org",

        message:
          "FOOTBALL_DATA_TOKEN is missing"

      };

    }


    // ======================================
    // NORMALIZE SEARCH NAMES
    // ======================================

    const homeSearch =
      normalizeName(home);


    const awaySearch =
      normalizeName(away);


    if (
      !homeSearch ||
      !awaySearch
    ) {

      return {

        provider:
          this.name,

        status:
          "invalid_team_names",

        home,
        away,

        data:
          null,

        message:
          "Invalid home or away team name"

      };

    }


    // ======================================
    // DATE RANGE
    // ======================================
    //
    // نبحث في:
    //
    // - آخر 90 يومًا
    // - الـ 365 يومًا القادمة
    //
    // هذا يسمح لنا بالعثور على:
    //
    // - مباريات مكتملة
    // - مباريات حالية
    // - مباريات مستقبلية
    //
    // ولا نقيد البحث ببطولة واحدة.
    //
    // ======================================

    const today =
      new Date();


    const startDate =
      new Date(today);


    startDate.setUTCDate(
      startDate.getUTCDate() - 90
    );


    const endDate =
      new Date(today);


    endDate.setUTCDate(
      endDate.getUTCDate() + 365
    );


    const dateFrom =
      formatDate(startDate);


    const dateTo =
      formatDate(endDate);


    // ======================================
    // BUILD MATCH API URL
    // ======================================
    //
    // Football-Data.org v4 يدعم:
    //
    // /v4/matches
    //
    // مع dateFrom + dateTo.
    //
    // ======================================

    const apiUrl =
      new URL(
        `${API_BASE}/matches`
      );


    apiUrl.searchParams.set(
      "dateFrom",
      dateFrom
    );


    apiUrl.searchParams.set(
      "dateTo",
      dateTo
    );


    // نحدد عددًا كبيرًا ولكن آمنًا
    // ضمن الحد المسموح به للـ API.
    apiUrl.searchParams.set(
      "limit",
      "500"
    );


    // ======================================
    // API REQUEST
    // ======================================

    let response;


    try {

      response =
        await fetch(
          apiUrl.toString(),
          {

            method:
              "GET",

            headers: {

              "X-Auth-Token":
                token,

              "Accept":
                "application/json"

            }

          }
        );

    } catch (error) {

      return {

        provider:
          this.name,

        status:
          "network_error",

        home,
        away,

        data:
          null,

        message:
          error?.message ||
          String(error)

      };

    }


    // ======================================
    // READ RESPONSE
    // ======================================

    const responseText =
      await response.text();


    // ======================================
    // HTTP ERROR
    // ======================================

    if (!response.ok) {

      let apiMessage =
        responseText;


      try {

        const parsed =
          JSON.parse(
            responseText
          );


        if (
          parsed &&
          parsed.error
        ) {

          apiMessage =
            parsed.error;

        }

      } catch (_) {

        // Keep raw response

      }


      let status =
        "api_error";


      if (
        response.status === 401
      ) {

        status =
          "unauthorized";

      }


      if (
        response.status === 403
      ) {

        status =
          "forbidden";

      }


      if (
        response.status === 404
      ) {

        status =
          "not_found";

      }


      if (
        response.status === 429
      ) {

        status =
          "rate_limited";

      }


      return {

        provider:
          this.name,

        status:
          status,

        httpStatus:
          response.status,

        home,
        away,

        data:
          null,

        message:
          `Football-Data.org HTTP ${response.status}: ${apiMessage}`

      };

    }


    // ======================================
    // PARSE JSON
    // ======================================

    let result;


    try {

      result =
        JSON.parse(
          responseText
        );

    } catch (error) {

      return {

        provider:
          this.name,

        status:
          "invalid_json",

        httpStatus:
          response.status,

        home,
        away,

        data:
          null,

        message:
          "Football-Data.org returned invalid JSON"

      };

    }


    // ======================================
    // EXTRACT MATCHES
    // ======================================

    const matches =
      Array.isArray(
        result?.matches
      )
        ? result.matches
        : [];


    // ======================================
    // FIND MATCH
    // ======================================
    //
    // نبحث عن:
    //
    // Home = الفريق الأول
    // Away = الفريق الثاني
    //
    // مع دعم:
    //
    // - الاسم الكامل
    // - الاسم المختصر
    // - TLA
    //
    // ======================================

    const match =
      matches.find(
        item => {

          const apiHomeNames = [

            item?.homeTeam?.name,

            item?.homeTeam?.shortName,

            item?.homeTeam?.tla

          ];


          const apiAwayNames = [

            item?.awayTeam?.name,

            item?.awayTeam?.shortName,

            item?.awayTeam?.tla

          ];


          return (

            teamNamesMatch(
              apiHomeNames,
              homeSearch
            )

            &&

            teamNamesMatch(
              apiAwayNames,
              awaySearch
            )

          );

        }
      );


    // ======================================
    // MATCH NOT FOUND
    // ======================================

    if (!match) {

      return {

        provider:
          this.name,

        status:
          "api_ok_no_match",

        httpStatus:
          response.status,

        home,
        away,

        data: {

          matchesChecked:
            matches.length,

          dateFrom:
            dateFrom,

          dateTo:
            dateTo,

          competitionCount:
            getCompetitionCount(
              matches
            ),

          competitions:
            getCompetitionCodes(
              matches
            )

        },

        message:
          "Football-Data.org connection works, but the requested match was not found in the available match data"

      };

    }


    // ======================================
    // MATCH FOUND
    // ======================================

    return {

      provider:
        this.name,

      status:
        "success",

      httpStatus:
        response.status,

      home,
      away,

      data:
        normalizeMatch(
          match
        ),

      message:
        "Match data received successfully"

    };

  }

}


// ==========================================
// NORMALIZE MATCH
// ==========================================

function normalizeMatch(
  match
) {

  return {

    id:
      match?.id ||
      null,


    utcDate:
      match?.utcDate ||
      null,


    status:
      match?.status ||
      null,


    minute:
      match?.minute ||
      null,


    injuryTime:
      match?.injuryTime ||
      null,


    stage:
      match?.stage ||
      null,


    group:
      match?.group ||
      null,


    matchday:
      match?.matchday ||
      null,


    venue:
      match?.venue ||
      null,


    competition: {

      id:
        match?.competition?.id ||
        null,

      name:
        match?.competition?.name ||
        null,

      code:
        match?.competition?.code ||
        null,

      type:
        match?.competition?.type ||
        null

    },


    season: {

      id:
        match?.season?.id ||
        null,

      startDate:
        match?.season?.startDate ||
        null,

      endDate:
        match?.season?.endDate ||
        null

    },


    homeTeam: {

      id:
        match?.homeTeam?.id ||
        null,

      name:
        match?.homeTeam?.name ||
        null,

      shortName:
        match?.homeTeam?.shortName ||
        null,

      tla:
        match?.homeTeam?.tla ||
        null

    },


    awayTeam: {

      id:
        match?.awayTeam?.id ||
        null,

      name:
        match?.awayTeam?.name ||
        null,

      shortName:
        match?.awayTeam?.shortName ||
        null,

      tla:
        match?.awayTeam?.tla ||
        null

    },


    score:
      match?.score ||
      null,


    odds:
      match?.odds ||
      null

  };

}


// ==========================================
// TEAM NAME MATCH
// ==========================================

function teamNamesMatch(
  apiNames,
  searchName
) {

  if (
    !Array.isArray(apiNames) ||
    !searchName
  ) {

    return false;

  }


  return apiNames.some(
    name => {

      const normalized =
        normalizeName(
          name
        );


      return namesMatch(
        normalized,
        searchName
      );

    }
  );

}


// ==========================================
// COMPARE TEAM NAMES
// ==========================================

function namesMatch(
  apiName,
  searchName
) {

  if (
    !apiName ||
    !searchName
  ) {

    return false;

  }


  // Exact match
  if (
    apiName === searchName
  ) {

    return true;

  }


  // API name contains search
  if (
    apiName.includes(
      searchName
    )
  ) {

    return true;

  }


  // Search contains API name
  if (
    searchName.includes(
      apiName
    )
  ) {

    return true;

  }


  // --------------------------------------
  // TOKEN MATCH
  // --------------------------------------
  //
  // مثال:
  //
  // "arsenal"
  // مع
  // "arsenal fc"
  //
  // أو:
  //
  // "coventry city"
  // مع
  // "coventry"
  //
  // --------------------------------------

  const apiTokens =
    apiName
      .split(" ")
      .filter(Boolean);


  const searchTokens =
    searchName
      .split(" ")
      .filter(Boolean);


  if (
    apiTokens.length === 0 ||
    searchTokens.length === 0
  ) {

    return false;

  }


  const commonTokens =
    searchTokens.filter(
      token =>
        apiTokens.includes(
          token
        )
    );


  // يجب أن يكون هناك تطابق
  // في كلمة ذات معنى.
  //
  // الكلمات القصيرة جدًا لا نعتمد عليها.
  //

  const meaningfulTokens =
    commonTokens.filter(
      token =>
        token.length >= 3
    );


  return (
    meaningfulTokens.length >= 1
  );

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(
  name
) {

  return String(
    name || ""
  )

    .toLowerCase()

    .trim()

    // إزالة العلامات الصوتية
    // من اللغات التي تستخدم Unicode accents
    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    // توحيد بعض الرموز
    .replace(
      /&/g,
      " and "
    )

    // إزالة أسماء الشركات/الاختصارات
    // الشائعة في أسماء الأندية
    .replace(
      /\b(fc|cf|afc|sc|ac|fk|fk\.|club)\b/gi,
      ""
    )

    // إزالة علامات الترقيم
    .replace(
      /[^a-z0-9\s]/gi,
      " "
    )

    // إزالة المسافات المتكررة
    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(
  date
) {

  const year =
    date.getUTCFullYear();


  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


// ==========================================
// GET COMPETITION CODES
// ==========================================

function getCompetitionCodes(
  matches
) {

  const codes =
    matches
      .map(
        match =>
          match?.competition?.code
      )
      .filter(Boolean);


  return [
    ...new Set(
      codes
    )
  ];

}


// ==========================================
// GET COMPETITION COUNT
// ==========================================

function getCompetitionCount(
  matches
) {

  return getCompetitionCodes(
    matches
  ).length;

}


// ==========================================
// CREATE PROVIDER
// ==========================================

const footballDataProvider =
  new FootballDataProvider();


// ==========================================
// REGISTER PROVIDER
// ==========================================

registerProvider(
  footballDataProvider
);


// ==========================================
// EXPORT
// ==========================================

export default footballDataProvider;
