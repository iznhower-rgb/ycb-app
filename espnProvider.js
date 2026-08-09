// ==========================================================
// Y.C.B ESPN PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";


const LEAGUES = [

  "eng.1",
  "esp.1",
  "ger.1",
  "ita.1",
  "fra.1",
  "uefa.champions",
  "usa.1",
  "ned.1",
  "por.1",
  "bel.1",
  "tur.1",
  "sco.1",
  "mex.1",
  "bra.1"

];


// ==========================================================
// PROVIDER
// ==========================================================

class ESPNProvider
  extends DataProvider {

  constructor() {

    super(
      "ESPN"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    try {

      let fixture =
        null;


      let homeTeam =
        null;


      let awayTeam =
        null;


      /*
       * Find teams across major competitions.
       */

      const results =
        await Promise.all(

          LEAGUES.map(
            async league => {

              try {

                const data =
                  await fetchJSON(
                    `${API}/${league}/teams`
                  );


                return {

                  league,

                  data

                };

              } catch {

                return null;

              }

            }
          )

        );


      for (
        const result
        of results
      ) {

        if (
          !result
        ) {

          continue;

        }


        const teams =
          flattenTeams(
            result.data,
            result.league
          );


        if (
          !homeTeam
        ) {

          homeTeam =
            teams.find(
              team =>
                namesMatch(
                  team?.displayName ||
                    team?.name,

                  home
                )
            ) || null;

        }


        if (
          !awayTeam
        ) {

          awayTeam =
            teams.find(
              team =>
                namesMatch(
                  team?.displayName ||
                    team?.name,

                  away
                )
            ) || null;

        }


        if (
          homeTeam &&
          awayTeam
        ) {

          break;

        }

      }


      /*
       * Team schedule is preferred.
       */

      if (
        homeTeam?.id
      ) {

        fixture =
          await findFixtureByTeamSchedule(
            homeTeam.id,
            home,
            away,
            homeTeam.league
          );

      }


      if (
        !fixture &&
        awayTeam?.id
      ) {

        fixture =
          await findFixtureByTeamSchedule(
            awayTeam.id,
            home,
            away,
            awayTeam.league
          );

      }


      /*
       * Fallback: league scoreboards.
       */

      if (
        !fixture
      ) {

        fixture =
          await findFixtureByScoreboards(
            home,
            away
          );

      }


      /*
       * Historical data.
       */

      const [
        homeMatches,
        awayMatches
      ] =
        await Promise.all([

          homeTeam?.id

            ? getSchedule(
                homeTeam.id,
                homeTeam.league
              )

            : Promise.resolve([]),

          awayTeam?.id

            ? getSchedule(
                awayTeam.id,
                awayTeam.league
              )

            : Promise.resolve([])

        ]);


      const homeRecent =
        homeMatches.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            String(
              fixture?.id ||
              ""
            )
        );


      const awayRecent =
        awayMatches.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            String(
              fixture?.id ||
              ""
            )
        );


      if (
        !fixture &&
        !homeRecent.length &&
        !awayRecent.length
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            recentMatches: {

              home: [],
              away: []

            }

          }

        };

      }


      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture

            ? "تم العثور على المباراة وبياناتها عبر ESPN."

            : "تم العثور على بيانات تاريخية عبر ESPN لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "espn",

          available:
            true,

          matchFound:
            Boolean(
              fixture
            ),

          fixture:
            fixture
              ? normalizeCompetition(
                  fixture
                )
              : null,

          recentMatches: {

            home:
              homeRecent,

            away:
              awayRecent

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          "network_error",

        message:
          error?.message ||
          String(
            error
          ),

        data:
          null

      };

    }

  }

}


// ==========================================================
// TEAM LIST
// ==========================================================

function flattenTeams(
  data,
  league
) {

  const teams =
    Array.isArray(
      data?.sports?.[0]?.leagues?.[0]?.teams
    )

      ? data
          .sports[0]
          .leagues[0]
          .teams

      : [];


  return teams

    .map(
      item => ({

        ...(
          item?.team ||
          item
        ),

        league

      })
    )

    .filter(
      Boolean
    );

}


// ==========================================================
// FIND FIXTURE FROM TEAM SCHEDULE
// ==========================================================

async function findFixtureByTeamSchedule(
  teamId,
  home,
  away,
  league
) {

  if (
    !league
  ) {

    return null;

  }


  try {

    const data =
      await fetchJSON(

        `${API}/${league}/teams/` +
        `${encodeURIComponent(
          teamId
        )}/schedule`

      );


    const events =
      Array.isArray(
        data?.events
      )

        ? data.events

        : [];


    return (

      events.find(
        event =>
          sameTeams(
            event,
            home,
            away
          )
      )

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// SCOREBOARD SEARCH
// ==========================================================

async function findFixtureByScoreboards(
  home,
  away
) {

  for (
    const league
    of LEAGUES
  ) {

    try {

      const data =
        await fetchJSON(

          `${API}/${league}/scoreboard` +
          `?limit=200`

        );


      const events =
        Array.isArray(
          data?.events
        )

          ? data.events

          : [];


      const fixture =
        events.find(
          event =>
            sameTeams(
              event,
              home,
              away
            )
        );


      if (
        fixture
      ) {

        return fixture;

      }

    } catch {

      /*
       * Try next league.
       */

    }

  }


  return null;

}


// ==========================================================
// TEAM SCHEDULE
// ==========================================================

async function getSchedule(
  teamId,
  league
) {

  if (
    !league
  ) {

    return [];

  }


  try {

    const data =
      await fetchJSON(

        `${API}/${league}/teams/` +
        `${encodeURIComponent(
          teamId
        )}/schedule`

      );


    const events =
      Array.isArray(
        data?.events
      )

        ? data.events

        : [];


    return events

      .filter(
        event =>
          eventHasTeam(
            event,
            teamId
          )
      )

      .filter(
        isFinished
      )

      .sort(
        (a,b) =>
          new Date(
            b?.date ||
            0
          ) -

          new Date(
            a?.date ||
            0
          )
      )

      .slice(
        0,
        15
      )

      .map(
        normalizeCompetition
      );

  } catch {

    return [];

  }

}


// ==========================================================
// EVENT TEAM CHECK
// ==========================================================

function eventHasTeam(
  event,
  teamId
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors || [];


  return competitors.some(
    item =>
      String(
        item?.team?.id ||
        ""
      ) ===
      String(
        teamId
      )
  );

}


// ==========================================================
// SAME TEAMS
// ==========================================================

function sameTeams(
  event,
  home,
  away
) {

  const competition =
    event?.competitions?.[0] ||
    event;


  const competitors =
    Array.isArray(
      competition?.competitors
    )

      ? competition.competitors

      : [];


  const homeTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    )
      ?.team
      ?.displayName

    ||

    competition
      ?.homeTeam
      ?.displayName;


  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    )
      ?.team
      ?.displayName

    ||

    competition
      ?.awayTeam
      ?.displayName;


  return (

    namesMatch(
      homeTeam,
      home
    )

    &&

    namesMatch(
      awayTeam,
      away
    )

  );

}


// ==========================================================
// NORMALIZE
// ==========================================================

function normalizeCompetition(
  event
) {

  const competition =
    event?.competitions?.[0] ||
    {};


  const competitors =
    Array.isArray(
      competition?.competitors
    )

      ? competition.competitors

      : [];


  const home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    ) || {};


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    ) || {};


  const homeScore =
    finiteOrNull(
      home?.score
    );


  const awayScore =
    finiteOrNull(
      away?.score
    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.date ||
      null,

    status:
      homeScore !== null &&
      awayScore !== null

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        home?.team?.id ||
        null,

      name:
        home?.team?.displayName ||
        null,

      shortName:
        home?.team?.shortDisplayName ||
        null

    },

    awayTeam: {

      id:
        away?.team?.id ||
        null,

      name:
        away?.team?.displayName ||
        null,

      shortName:
        away?.team?.shortDisplayName ||
        null

    },

    score: {

      fullTime: {

        home:
          homeScore,

        away:
          awayScore

      }

    },

    tournament:
      event?.league?.name ||
      competition?.league?.name ||
      null

  };

}


// ==========================================================
// FINISHED
// ==========================================================

function isFinished(
  event
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors || [];


  return (

    competitors.length >= 2 &&

    competitors.every(
      item =>
        finiteOrNull(
          item?.score
        ) !== null
    )

  );

}


// ==========================================================
// FETCH
// ==========================================================

async function fetchJSON(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          Accept:
            "application/json"

        }

      }
    );


  const text =
    await response.text();


  if (
    !response.ok
  ) {

    throw new Error(
      `ESPN HTTP ${response.status}`
    );

  }


  try {

    return text
      ? JSON.parse(
          text
        )
      : null;

  } catch {

    throw new Error(
      "ESPN invalid JSON"
    );

  }

}


// ==========================================================
// NAME NORMALIZATION
// ==========================================================

function normalizeName(
  value
) {

  return String(
    value ||
    ""
  )

    .toLowerCase()

    .trim()

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


// ==========================================================
// NAME MATCH
// ==========================================================

function namesMatch(
  first,
  second
) {

  first =
    normalizeName(
      first
    );


  second =
    normalizeName(
      second
    );


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


  const firstTokens =
    new Set(

      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )

    );


  const secondTokens =
    second
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  return (

    secondTokens.length > 0 &&

    secondTokens.filter(
      token =>
        firstTokens.has(
          token
        )
    ).length >=
      Math.min(
        2,
        secondTokens.length
      )

  );

}


// ==========================================================
// NUMBER
// ==========================================================

function finiteOrNull(
  value
) {

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


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
