// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const BASE =
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
        env?.FOOTBALL_DATA_TOKEN ||
        ""
      ).trim();


    if (!token) {

      return {

        status:
          "not_configured",

        message:
          "FOOTBALL_DATA_TOKEN غير مضبوط؛ سيتم الاعتماد على المصادر الأخرى.",

        data:
          null

      };

    }


    try {

      const now =
        new Date();


      const fromDate =
        new Date(
          now
        );


      fromDate.setUTCDate(
        fromDate.getUTCDate() - 14
      );


      const toDate =
        new Date(
          now
        );


      toDate.setUTCDate(
        toDate.getUTCDate() + 45
      );


      const formatDate =
        date =>
          date
            .toISOString()
            .slice(
              0,
              10
            );


      const from =
        formatDate(
          fromDate
        );


      const to =
        formatDate(
          toDate
        );


      const url =
        new URL(
          `${BASE}/matches`
        );


      url.searchParams.set(
        "dateFrom",
        from
      );


      url.searchParams.set(
        "dateTo",
        to
      );


      const upcoming =
        await fetchJSON(
          url,
          token
        );


      const matches =
        Array.isArray(
          upcoming?.matches
        )
          ? upcoming.matches
          : [];


      const fixtureMatch =
        matches.find(
          match =>

            namesMatch(
              normalize(
                match?.homeTeam?.name
              ),
              normalize(
                home
              )
            )

            &&

            namesMatch(
              normalize(
                match?.awayTeam?.name
              ),
              normalize(
                away
              )
            )
        );


      let fixture =
        fixtureMatch
          ? normalizeFixture(
              fixtureMatch
            )
          : null;


      let recentHome =
        [];


      let recentAway =
        [];


      if (
        fixtureMatch?.homeTeam?.id
      ) {

        recentHome =
          await getTeamFinished(
            fixtureMatch.homeTeam.id,
            token
          );

      }


      if (
        fixtureMatch?.awayTeam?.id
      ) {

        recentAway =
          await getTeamFinished(
            fixtureMatch.awayTeam.id,
            token
          );

      }


      if (!fixture) {

        return {

          status:
            "api_ok_no_match",

          message:
            "Football-Data.org متصل لكن المباراة غير موجودة في نطاق البحث.",

          data: {

            source:
              "football-data.org",

            available:
              true,

            matchFound:
              false,

            searchRange: {

              dateFrom:
                from,

              dateTo:
                to

            }

          }

        };

      }


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبياناتها عبر Football-Data.org.",

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
              recentHome,

            away:
              recentAway

          }

        }

      };

    } catch (error) {

      return {

        status:
          "api_error",

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }

  }

}


// ==========================================
// FETCH JSON
// ==========================================

async function fetchJSON(
  url,
  token
) {

  const response =
    await fetch(
      url.toString(),
      {

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


  let data =
    null;


  try {

    data =
      text
        ? JSON.parse(
            text
          )
        : null;

  } catch {

    data =
      null;

  }


  if (!response.ok) {

    throw new Error(

      `Football-Data.org HTTP ${response.status}: ` +

      (
        data?.message ||
        text ||
        "API error"
      )

    );

  }


  return data;

}


// ==========================================
// RECENT TEAM MATCHES
// ==========================================

async function getTeamFinished(
  teamId,
  token
) {

  try {

    const url =
      new URL(
        `${BASE}/teams/${teamId}/matches`
      );


    url.searchParams.set(
      "status",
      "FINISHED"
    );


    url.searchParams.set(
      "limit",
      "10"
    );


    const data =
      await fetchJSON(
        url,
        token
      );


    return (

      Array.isArray(
        data?.matches
      )
        ? data.matches
        : []

    )

      .map(
        normalizeRecent
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
// NORMALIZE FIXTURE
// ==========================================

function normalizeFixture(
  match
) {

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

    competition:
      match.competition?.name ||
      null,

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

    }

  };

}


// ==========================================
// NORMALIZE RECENT MATCH
// ==========================================

function normalizeRecent(
  match
) {

  const homeGoals =
    Number(
      match.score?.fullTime?.home
    );


  const awayGoals =
    Number(
      match.score?.fullTime?.away
    );


  if (
    !Number.isFinite(
      homeGoals
    ) ||
    !Number.isFinite(
      awayGoals
    )
  ) {

    return null;

  }


  return {

    id:
      match.id ||
      null,

    utcDate:
      match.utcDate ||
      null,

    homeTeam: {

      name:
        match.homeTeam?.name ||
        null

    },

    awayTeam: {

      name:
        match.awayTeam?.name ||
        null

    },

    score: {

      fullTime: {

        home:
          homeGoals,

        away:
          awayGoals

      }

    }

  };

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalize(
  value
) {

  return String(
    value || ""
  )

    .toLowerCase()

    .normalize(
      "NFD"
    )

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /&/g,
      " and "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club)\b/g,
      " "
    )

    .replace(
      /[^a-z0-9\u0600-\u06ff\s]/gi,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ==========================================
// TEAM NAME MATCH
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
    first === second ||
    first.includes(second) ||
    second.includes(first)
  ) {

    return true;

  }


  const tokens =
    new Set(
      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  return second
    .split(" ")
    .some(
      token =>
        token.length >= 3 &&
        tokens.has(
          token
        )
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
