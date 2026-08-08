import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider extends DataProvider {

  constructor() {
    super("Football-Data.org");
  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(home, away) {

    const token =
      typeof FOOTBALL_DATA_TOKEN !== "undefined"
        ? FOOTBALL_DATA_TOKEN
        : null;


    if (!token) {

      return {

        provider: this.name,

        status: "not_configured",

        message:
          "FOOTBALL_DATA_TOKEN is not configured",

        home,

        away

      };

    }


    // ======================================
    // البحث في مباريات اليوم
    // ======================================

    const response = await fetch(
      "https://api.football-data.org/v4/matches",
      {

        method: "GET",

        headers: {

          "X-Auth-Token": token,

          "Accept":
            "application/json"

        }

      }
    );


    if (!response.ok) {

      throw new Error(
        `Football-Data API error: ${response.status}`
      );

    }


    const result =
      await response.json();


    const matches =
      Array.isArray(result.matches)
        ? result.matches
        : [];


    // ======================================
    // البحث عن المباراة
    // ======================================

    const homeLower =
      home.toLowerCase();


    const awayLower =
      away.toLowerCase();


    const match =
      matches.find(item => {

        const itemHome =
          String(
            item.homeTeam?.name || ""
          ).toLowerCase();


        const itemAway =
          String(
            item.awayTeam?.name || ""
          ).toLowerCase();


        return (

          itemHome.includes(homeLower) &&
          itemAway.includes(awayLower)

        );

      });


    // ======================================
    // المباراة غير موجودة
    // ======================================

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


    // ======================================
    // إرجاع البيانات الموحدة
    // ======================================

    return {

      provider: this.name,

      status: "success",

      home,

      away,

      data: {

        matchId:
          match.id,

        utcDate:
          match.utcDate,

        status:
          match.status,

        competition:
          match.competition?.name || null,

        competitionCode:
          match.competition?.code || null,

        homeTeam:
          match.homeTeam?.name || home,

        awayTeam:
          match.awayTeam?.name || away,

        score:
          match.score || null

      }

    };

  }

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
