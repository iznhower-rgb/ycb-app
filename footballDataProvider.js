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
// COMPETITIONS
// ==========================================

const COMPETITIONS = [
  "PL",
  "PD",
  "SA",
  "BL1",
  "FL1",
  "PPL",
  "DED",
  "CL"
];


// ==========================================
// FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider
  extends DataProvider {

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
    // ENV CHECK
    // --------------------------------------

    if (!env) {

      return {

        status:
          "environment_missing",

        data:
          null,

        message:
          "Worker environment is missing"

      };

    }


    // --------------------------------------
    // TOKEN
    // --------------------------------------

    const token =
      String(
        env.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    if (!token) {

      return {

        status:
          "not_configured",

        data:
          null,

        message:
          "FOOTBALL_DATA_TOKEN is missing"

      };

    }


    // --------------------------------------
    // SEARCH ALL SUPPORTED COMPETITIONS
    // --------------------------------------

    for (
      const competitionCode
      of COMPETITIONS
    ) {

      try {

        const result =
          await this.searchCompetition(
            competitionCode,
            home,
            away,
            token
          );


        if (
          result &&
          result.status === "success"
        ) {

          return result;

        }

      } catch (error) {

        // Continue with next competition.

      }

    }


    // --------------------------------------
    // NOTHING FOUND
    // --------------------------------------

    return {

      status:
        "api_ok_no_match",

      data: {

        home: home,

        away: away,

        competitionsChecked:
          COMPETITIONS

      },

      message:
        "Football-Data.org connection works, but the requested match was not found in the searched competitions"

    };

  }


  // ========================================
  // SEARCH COMPETITION
  // ========================================

  async searchCompetition(
    competitionCode,
    home,
    away,
    token
  ) {

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


    const apiUrl =
      new URL(
        `${API_BASE}/competitions/${competitionCode}/matches`
      );


    apiUrl.searchParams.set(
      "dateFrom",
      formatDate(startDate)
    );


    apiUrl.searchParams.set(
      "dateTo",
      formatDate(endDate)
    );


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

        status:
          "network_error",

        data:
          null,

        message:
          error?.message ||
          String(error)

      };

    }


    const responseText =
      await response.text();


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

      } catch (_) {}


      return {

        status:
          response.status === 401
            ? "unauthorized"
            : response.status === 403
              ? "forbidden"
              : response.status === 429
                ? "rate_limited"
                : "api_error",

        httpStatus:
          response.status,

        data:
          null,

        message:
          `Football-Data.org HTTP ${response.status}: ${apiMessage}`

      };

    }


    let result;


    try {

      result =
        JSON.parse(
          responseText
        );

    } catch (_) {

      return {

        status:
          "invalid_json",

        data:
          null,

        message:
          "Football-Data.org returned invalid JSON"

      };

    }


    const matches =
      Array.isArray(
        result?.matches
      )
        ? result.matches
        : [];


    const homeSearch =
      normalizeName(home);


    const awaySearch =
      normalizeName(away);


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


    if (!match) {

      return {

        status:
          "not_found",

        data:
          null,

        message:
          `Match not found in ${competitionCode}`

      };

    }


    return {

      status:
        "success",

      httpStatus:
        response.status,

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
            competitionCode

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
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(name) {

  return String(name || "")

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
    apiName.includes(searchName)
  ) {

    return true;

  }


  if (
    searchName.includes(apiName)
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
