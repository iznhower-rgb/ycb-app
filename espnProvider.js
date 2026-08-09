// ==========================================================
// Y.C.B ESPN PROVIDER 3.0.0
// Public ESPN soccer API - no API key required
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const SITE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";


const LEAGUES = [

  "eng.1",

  "eng.2",

  "esp.1",

  "ger.1",

  "ita.1",

  "fra.1",

  "ned.1",

  "por.1",

  "bel.1",

  "tur.1",

  "usa.1",

  "uefa.champions"

];


const TEAM_CACHE =
  new Map();


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

      const teams =
        await discoverTeams(
          home,
          away
        );


      if (
        !teams.home &&
        !teams.away
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن لم يتم العثور على الفريقين.",

          data:
            emptyData()

        };

      }


      const schedules =
        await Promise.all(

          [
            teams.home,
            teams.away
          ]

          .filter(
            Boolean
          )

          .map(
            team =>
              getTeamSchedule(
                team.league,
                team.id
              )
          )

        );


      const allEvents =
        dedupeRawEvents(
          schedules.flat()
        );


      const fixture =
        allEvents.find(
          event =>
            isExactFixture(
              event,
              home,
              away
            )
        );


      const homeRecent =
        buildRecentForTeam(
          home,
          allEvents
        );


      const awayRecent =
        buildRecentForTeam(
          away,
          allEvents
        );


      if (
        !fixture &&
        homeRecent.length === 0 &&
        awayRecent.length === 0
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن لم يتم العثور على المباراة أو تاريخ كافٍ.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            fixture:
              null,

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

            ? "تم التحقق من المباراة وبياناتها عبر ESPN."

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
              ? normalizeEvent(
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
          String(error),

        data:
          null

      };

    }

  }

}


/* ==========================================================
   DISCOVER TEAMS
========================================================== */

async function discoverTeams(
  home,
  away
) {

  const results =
    await Promise.all(

      LEAGUES.map(
        async league => {

          try {

            const teams =
              await getLeagueTeams(
                league
              );

            return teams.map(
              team => ({

                ...team,

                league

              })
            );

          } catch {

            return [];

          }

        }
      )

    );


  const all =
    results.flat();


  return {

    home:
      bestTeamMatch(
        all,
        home
      ),

    away:
      bestTeamMatch(
        all,
        away
      )

  };

}


/* ==========================================================
   BEST TEAM MATCH
========================================================== */

function bestTeamMatch(
  teams,
  name
) {

  const candidates =
    teams

      .map(
        team => ({

          team,

          score:
            nameScore(
              team.name,
              name
            )

        })
      )

      .filter(
        item =>
          item.score > 0
      )

      .sort(
        (a,b) =>
          b.score -
          a.score
      );


  return candidates[0]?.team ||
    null;

}


/* ==========================================================
   LEAGUE TEAMS
========================================================== */

async function getLeagueTeams(
  league
) {

  if (
    TEAM_CACHE.has(
      league
    )
  ) {

    return TEAM_CACHE.get(
      league
    );

  }


  const data =
    await fetchJSON(

      `${SITE}/${league}/teams`

    );


  const teams =
    [];


  for (
    const group
    of data?.sports?.[0]?.leagues || []
  ) {

    for (
      const item
      of group?.teams || []
    ) {

      const team =
        item?.team;


      if (
        team?.id &&
        team?.displayName
      ) {

        teams.push({

          id:
            String(
              team.id
            ),

          name:
            team.displayName,

          shortName:
            team.shortDisplayName ||
            team.name ||
            team.displayName

        });

      }

    }

  }


  TEAM_CACHE.set(
    league,
    teams
  );


  return teams;

}


/* ==========================================================
   TEAM SCHEDULE
========================================================== */

async function getTeamSchedule(
  league,
  teamId
) {

  const data =
    await fetchJSON(

      `${SITE}/${league}/teams/${encodeURIComponent(
        teamId
      )}/schedule`

    );


  return Array.isArray(
    data?.events
  )

    ? data.events

    : [];

}


/* ==========================================================
   EXACT FIXTURE
========================================================== */

function isExactFixture(
  event,
  home,
  away
) {

  const competitors =
    event?.competitions?.[0]
      ?.competitors || [];


  const homeTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    )
    ?.team
    ?.displayName;


  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    )
    ?.team
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


/* ==========================================================
   RECENT TEAM EVENTS
========================================================== */

function buildRecentForTeam(
  teamName,
  events
) {

  return events

    .filter(
      event => {

        const competitors =
          event?.competitions?.[0]
            ?.competitors || [];


        const home =
          competitors.find(
            item =>
              item?.homeAway ===
              "home"
          )
          ?.team
          ?.displayName;


        const away =
          competitors.find(
            item =>
              item?.homeAway ===
              "away"
          )
          ?.team
          ?.displayName;


        return (

          (
            namesMatch(
              home,
              teamName
            )

            ||

            namesMatch(
              away,
              teamName
            )

          )

          &&

          hasFinalScore(
            event
          )

        );

      }
    )

    .sort(
      (a,b) =>
        eventTimestamp(
          b
        ) -

        eventTimestamp(
          a
        )
    )

    .slice(
      0,
      15
    )

    .map(
      normalizeEvent
    );

}


/* ==========================================================
   FINAL SCORE
========================================================== */

function hasFinalScore(
  event
) {

  const competitors =
    event?.competitions?.[0]
      ?.competitors || [];


  const values =
    competitors.map(
      item =>
        Number(
          item?.score
        )
    );


  return (

    values.length >= 2

    &&

    values.every(
      Number.isFinite
    )

  );

}


/* ==========================================================
   NORMALIZE EVENT
========================================================== */

function normalizeEvent(
  event
) {

  const competitors =
    event?.competitions?.[0]
      ?.competitors || [];


  const home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    );


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    );


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
      event?.competitions?.[0]
        ?.league?.name ||

      event?.season?.displayName ||

      null

  };

}


/* ==========================================================
   DEDUPE RAW EVENTS
========================================================== */

function dedupeRawEvents(
  events
) {

  const seen =
    new Set();


  return events.filter(
    event => {

      const key =
        String(

          event?.id ||

          [
            event?.date,
            event?.name
          ].join("|")

        );


      if (
        seen.has(
          key
        )
      ) {

        return false;

      }


      seen.add(
        key
      );


      return true;

    }
  );

}


/* ==========================================================
   EVENT TIMESTAMP
========================================================== */

function eventTimestamp(
  event
) {

  const value =
    Date.parse(
      event?.date ||
      ""
    );


  return Number.isFinite(
    value
  )

    ? value

    : 0;

}


/* ==========================================================
   FETCH JSON
========================================================== */

async function fetchJSON(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          Accept:
            "application/json",

          "User-Agent":
            "YCB-Football-Prediction-Engine/3.0"

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

    throw new Error(
      "ESPN returned invalid JSON"
    );

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `ESPN HTTP ${response.status}`
    );

  }


  return data;

}


/* ==========================================================
   NORMALIZE NAME
========================================================== */

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
      /\b(fc|cf|afc|sc|ac|fk|club|the)\b/g,
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


/* ==========================================================
   NAMES MATCH
========================================================== */

function namesMatch(
  first,
  second
) {

  const a =
    normalizeName(
      first
    );


  const b =
    normalizeName(
      second
    );


  if (
    !a ||
    !b
  ) {

    return false;

  }


  if (
    a === b ||
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }


  const tokensA =
    new Set(

      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )

    );


  const tokensB =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    !tokensA.size ||
    !tokensB.length
  ) {

    return false;

  }


  const overlap =
    tokensB.filter(
      token =>
        tokensA.has(
          token
        )
    ).length;


  return (
    overlap >=
    Math.min(
      2,
      tokensB.length
    )
  );

}


/* ==========================================================
   NAME SCORE
========================================================== */

function nameScore(
  candidate,
  wanted
) {

  const a =
    normalizeName(
      candidate
    );


  const b =
    normalizeName(
      wanted
    );


  if (
    !a ||
    !b
  ) {

    return 0;

  }


  if (
    a === b
  ) {

    return 100;

  }


  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return 85;

  }


  const ta =
    new Set(
      a
        .split(" ")
        .filter(
          x =>
            x.length >= 3
        )
    );


  const tb =
    b
      .split(" ")
      .filter(
        x =>
          x.length >= 3
      );


  const overlap =
    tb.filter(
      x =>
        ta.has(
          x
        )
    ).length;


  return overlap
    ? 40 + overlap * 10
    : 0;

}


/* ==========================================================
   NUMBER
========================================================== */

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


/* ==========================================================
   EMPTY DATA
========================================================== */

function emptyData() {

  return {

    source:
      "espn",

    available:
      true,

    matchFound:
      false,

    fixture:
      null,

    recentMatches: {

      home: [],

      away: []

    }

  };

}


/* ==========================================================
   REGISTER
========================================================== */

const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
