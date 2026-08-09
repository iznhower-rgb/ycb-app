// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
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
// COMPETITION
// ==========================================

// Premier League
const COMPETITION_CODE =
  "PL";


// ==========================================
// FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider
  extends DataProvider {


  constructor() {

    super(
      "Football-Data.org"
    );

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(
    home,
    away,
    env
  ) {

    // ======================================
    // VALIDATE ENVIRONMENT
    // ======================================

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


    // ======================================
    // GET API TOKEN
    // ======================================

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
    // DATE RANGE
    // ======================================

    const today =
      new Date();


    const startDate =
      new Date(today);


    startDate.setDate(
      today.getDate() - 30
    );


    const endDate =
      new Date(today);


    endDate.setDate(
      today.getDate() + 365
    );


    const dateFrom =
      formatDate(
        startDate
      );


    const dateTo =
      formatDate(
        endDate
      );


    // ======================================
    // BUILD API URL
    // ======================================

    const apiUrl =
      new URL(
        `${API_BASE}/competitions/${COMPETITION_CODE}/matches`
      );


    apiUrl.searchParams.set(
      "dateFrom",
      dateFrom
    );


    apiUrl.searchParams.set(
      "dateTo",
      dateTo
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
    // NORMALIZE SEARCH NAMES
    // ======================================

    const homeSearch =
      normalizeName(
        home
      );


    const awaySearch =
      normalizeName(
        away
      );


    // ======================================
    // FIND MATCH
    // ======================================

    const match =
      matches.find(
        item => {

          const apiHome =
            normalizeName(
              item?.homeTeam?.name ||
              item?.homeTeam?.shortName ||
              ""
            );


          const apiAway =
            normalizeName(
              item?.awayTeam?.name ||
              item?.awayTeam?.shortName ||
              ""
            );


          return (

            namesMatch(
              apiHome,
              homeSearch
            )

            &&

            namesMatch(
              apiAway,
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

          competition:
            result?.competition?.name ||
            "Premier League",

          competitionCode:
            result?.competition?.code ||
            COMPETITION_CODE

        },

        message:
          "Football-Data.org connection works, but the requested match was not found"

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

      data: {

        id:
          match.id ||
          null,

        utcDate:
          match.utcDate ||
          null,

        status:
          match.status ||
          null,

        stage:
          match.stage ||
          null,

        group:
          match.group ||
          null,

        competition: {

          id:
            match.competition?.id ||
            null,

          name:
            match.competition?.name ||
            null,

          code:
            match.competition?.code ||
            null

        },

        season: {

          id:
            match.season?.id ||
            null,

          startDate:
            match.season?.startDate ||
            null,

          endDate:
            match.season?.endDate ||
            null

        },

        homeTeam: {

          id:
            match.homeTeam?.id ||
            null,

          name:
            match.homeTeam?.name ||
            null,

          shortName:
            match.homeTeam?.shortName ||
            null,

          tla:
            match.homeTeam?.tla ||
            null

        },

        awayTeam: {

          id:
            match.awayTeam?.id ||
            null,

          name:
            match.awayTeam?.name ||
            null,

          shortName:
            match.awayTeam?.shortName ||
            null,

          tla:
            match.awayTeam?.tla ||
            null

        },

        score:
          match.score ||
          null,

        odds:
          match.odds ||
          null

      },

      message:
        "Match data received successfully"

    };

  }

}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(date) {

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
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(name) {

  return String(
    name || ""
  )

    .toLowerCase()

    .trim()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /\b(fc|cf|afc)\b/gi,
      ""
    )

    .replace(
      /[^a-z0-9\s]/gi,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

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


  if (
    apiName === searchName
  ) {

    return true;

  }


  if (
    apiName.includes(
      searchName
    )
  ) {

    return true;

  }


  if (
    searchName.includes(
      apiName
    )
  ) {

    return true;

  }


  return false;

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
