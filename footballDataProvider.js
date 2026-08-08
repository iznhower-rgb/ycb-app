// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// PROVIDER
// ==========================================

class FootballDataProvider extends DataProvider {

  constructor() {

    super("Football-Data.org");

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(home, away, env) {

    // --------------------------------------
    // Check API token
    // --------------------------------------

    if (
      !env ||
      !env.FOOTBALL_DATA_TOKEN
    ) {

      return {

        provider: this.name,

        status: "not_configured",

        home,

        away,

        data: null,

        message:
          "FOOTBALL_DATA_TOKEN is not configured"

      };

    }


    const token =
      env.FOOTBALL_DATA_TOKEN;


    // --------------------------------------
    // Request Football-Data.org
    // --------------------------------------

    const response = await fetch(

      "https://api.football-data.org/v4/matches",

      {

        method: "GET",

        headers: {

          "X-Auth-Token":
            token,

          "Accept":
            "application/json"

        }

      }

    );


    // --------------------------------------
    // API error
    // --------------------------------------

    if (!response.ok) {

      const errorText =
        await response.text();

      throw new Error(

        `Football-Data.org error ${response.status}: ${errorText}`

      );

    }


    // --------------------------------------
    // Parse response
    // --------------------------------------

    const result =
      await response.json();


    const matches =
      Array.isArray(result.matches)
        ? result.matches
        : [];


    // --------------------------------------
    // Normalize search names
    // --------------------------------------

    const homeSearch =
      normalizeName(home);

    const awaySearch =
      normalizeName(away);


    // --------------------------------------
    // Find requested match
    // --------------------------------------

    const match =
      matches.find(item => {

        const apiHome =
          normalizeName(
            item.homeTeam?.name ||
            ""
          );

        const apiAway =
          normalizeName(
            item.awayTeam?.name ||
            ""
          );


        return (

          (
            apiHome.includes(homeSearch) ||
            homeSearch.includes(apiHome)
          )

          &&

          (
            apiAway.includes(awaySearch) ||
            awaySearch.includes(apiAway)
          )

        );

      });


    // --------------------------------------
    // Match not found
    // --------------------------------------

    if (!match) {

      return {

        provider: this.name,

        status: "no_match_found",

        home,

        away,

        data: {

          matchesChecked:
            matches.length

        }

      };

    }


    // --------------------------------------
    // Return normalized data
    // --------------------------------------

    return {

      provider: this.name,

      status: "success",

      home,

      away,

      data: {

        id:
          match.id || null,

        utcDate:
          match.utcDate || null,

        status:
          match.status || null,

        competition: {

          name:
            match.competition?.name ||
            null,

          code:
            match.competition?.code ||
            null

        },

        homeTeam: {

          id:
            match.homeTeam?.id ||
            null,

          name:
            match.homeTeam?.name ||
            null

        },

        awayTeam: {

          id:
            match.awayTeam?.id ||
            null,

          name:
            match.awayTeam?.name ||
            null

        },

        score:
          match.score || null

      }

    };

  }

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(name) {

  return String(name)

    .toLowerCase()

    .trim()

    .replace(
      /\s+/g,
      " "
    );

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
