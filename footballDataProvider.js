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
// PROVIDER
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

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    if (!token) {

      return {

        status:
          "configuration_error",

        message:
          "FOOTBALL_DATA_TOKEN غير موجود في Environment Variables.",

        data:
          null

      };

    }


    const normalize =
      value =>

        String(value || "")
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /&/g,
            " and "
          )
          .replace(
            /\b(fc|cf|afc|sc|ac|fk|club)\b/gi,
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


    const homeNormalized =
      normalize(home);


    const awayNormalized =
      normalize(away);


    // ======================================
    // DATE RANGE
    // ======================================

    const now =
      new Date();


    const dateFrom =
      new Date(now);


    dateFrom.setUTCDate(
      dateFrom.getUTCDate() - 14
    );


    const dateTo =
      new Date(now);


    dateTo.setUTCDate(
      dateTo.getUTCDate() + 30
    );


    const formatDate =
      date =>

        date
          .toISOString()
          .slice(0, 10);


    const from =
      formatDate(dateFrom);


    const to =
      formatDate(dateTo);


    // ======================================
    // GET FIXTURES
    // ======================================

    const fixtureUrl =
      new URL(
        `${API_BASE}/matches`
      );


    fixtureUrl.searchParams.set(
      "dateFrom",
      from
    );


    fixtureUrl.searchParams.set(
      "dateTo",
      to
    );


    let fixtureResponse;


    try {

      fixtureResponse =
        await fetch(
          fixtureUrl.toString(),
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

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }


    const fixtureText =
      await fixtureResponse.text();


    let fixturePayload =
      null;


    try {

      fixturePayload =
        fixtureText
          ? JSON.parse(
              fixtureText
            )
          : null;

    } catch {

      fixturePayload =
        null;

    }


    if (
      !fixtureResponse.ok
    ) {

      return {

        status:
          "api_error",

        message:
          `HTTP ${fixtureResponse.status}: ${
            fixturePayload?.message ||
            fixturePayload?.error ||
            fixtureText ||
            "Football-Data.org API error"
          }`,

        data: {

          httpStatus:
            fixtureResponse.status,

          apiResponse:
            fixturePayload

        }

      };

    }


    const matches =
      Array.isArray(
        fixturePayload?.matches
      )
        ? fixturePayload.matches
        : [];


    // ======================================
    // FIND REQUESTED FIXTURE
    // ======================================

    const requestedMatch =
      matches.find(
        match => {

          const apiHome =
            normalize(
              match?.homeTeam?.name ||
              match?.homeTeam?.shortName ||
              match?.homeTeam?.tla
            );


          const apiAway =
            normalize(
              match?.awayTeam?.name ||
              match?.awayTeam?.shortName ||
              match?.awayTeam?.tla
            );


          return (

            namesMatch(
              apiHome,
              homeNormalized
            )

            &&

            namesMatch(
              apiAway,
              awayNormalized
            )

          );

        }
      );


    if (
      !requestedMatch
    ) {

      return {

        status:
          "api_ok_no_match",

        message:
          "تم الاتصال بـ Football-Data.org لكن المباراة غير موجودة داخل نطاق البحث.",

        data: {

          source:
            "football-data.org",

          available:
            true,

          matchFound:
            false,

          requested: {

            home,
            away

          },

          searchRange: {

            dateFrom:
              from,

            dateTo:
              to

          },

          totalMatchesReturned:
            matches.length

        }

      };

    }


    // ======================================
    // NORMALIZED FIXTURE
    // ======================================

    const fixture =
      normalizeMatch(
        requestedMatch
      );


    // ======================================
    // TEAM IDs
    // ======================================

    const homeId =
      requestedMatch?.homeTeam?.id;


    const awayId =
      requestedMatch?.awayTeam?.id;


    // ======================================
    // RECENT MATCHES
    // ======================================

    const homeRecent =
      homeId
        ? await getRecentTeamMatches(
            homeId,
            token
          )
        : [];


    const awayRecent =
      awayId
        ? await getRecentTeamMatches(
            awayId,
            token
          )
        : [];


    return {

      status:
        "success",

      message:
        "تم العثور على المباراة وبياناتها التاريخية عبر Football-Data.org.",

      data: {

        source:
          "football-data.org",

        available:
          true,

        matchFound:
          true,

        fixture,

        recentMatches: {

          home:
            homeRecent,

          away:
            awayRecent

        }

      }

    };

  }

}


// ==========================================
// RECENT TEAM MATCHES
// ==========================================

async function getRecentTeamMatches(
  teamId,
  token
) {

  const url =
    new URL(
      `${API_BASE}/teams/${teamId}/matches`
    );


  url.searchParams.set(
    "status",
    "FINISHED"
  );


  url.searchParams.set(
    "limit",
    "10"
  );


  try {

    const response =
      await fetch(
        url.toString(),
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


    const text =
      await response.text();


    let payload =
      null;


    try {

      payload =
        text
          ? JSON.parse(text)
          : null;

    } catch {

      payload =
        null;

    }


    if (
      !response.ok
    ) {

      return [];

    }


    const matches =
      Array.isArray(
        payload?.matches
      )
        ? payload.matches
        : [];


    return matches
      .map(
        normalizeMatch
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        10
      );

  } catch {

    return [];

  }

}


// ==========================================
// NORMALIZE MATCH
// ==========================================

function normalizeMatch(
  match
) {

  if (!match) {

    return null;

  }


  return {

    id:
      match.id ||
      null,

    utcDate:
      match.utcDate ||
      null,

    status:
      match.status ||
      null,

    homeTeam: {

      id:
        match.homeTeam?.id ||
        null,

      name:
        match.homeTeam?.name ||
        null,

      shortName:
        match.homeTeam?.shortName ||
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
        null

    },

    score: {

      fullTime: {

        home:
          Number.isFinite(
            Number(
              match.score?.fullTime?.home
            )
          )
            ? Number(
                match.score.fullTime.home
              )
            : null,

        away:
          Number.isFinite(
            Number(
              match.score?.fullTime?.away
            )
          )
            ? Number(
                match.score.fullTime.away
              )
            : null

      }

    }

  };

}


// ==========================================
// NAME MATCH
// ==========================================

function namesMatch(
  first,
  second
) {

  if (
    !first ||
    !second
  ) {

    return false;

  }


  if (
    first === second
  ) {

    return true;

  }


  if (
    first.includes(second) ||
    second.includes(first)
  ) {

    return true;

  }


  const firstTokens =
    first.split(" ");


  const secondTokens =
    second.split(" ");


  const common =
    secondTokens.filter(
      token =>
        token.length >= 3 &&
        firstTokens.includes(
          token
        )
    );


  return (
    common.length >= 1
  );

}


// ==========================================
// REGISTER
// ==========================================

const footballDataProvider =
  new FootballDataProvider();


registerProvider(
  footballDataProvider
);


export default footballDataProvider;
