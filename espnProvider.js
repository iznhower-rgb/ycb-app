// ==========================================================
// Y.C.B ESPN PROVIDER 3.0.1
// ==========================================================
// ESPN is used for:
// - fixture verification
// - recent historical matches
// - team discovery
//
// No API key required.
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
  "ger.2",

  "ita.1",

  "fra.1",

  "ned.1",

  "por.1",

  "bel.1",

  "tur.1",

  "usa.1",

  "sco.1",

  "uefa.champions"

];


const TEAM_CACHE =
  new Map();


const SCHEDULE_CACHE =
  new Map();


/* ==========================================================
   PROVIDER
========================================================== */

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


      const selected =
        [
          teams.home,
          teams.away
        ]
        .filter(Boolean);


      /*
       * Search all leagues in which the selected
       * team appears. This helps promoted/relegated teams.
       */

      const scheduleTargets =
        unique(

          selected.flatMap(
            team =>
              team.leagues.map(
                league =>
                  `${league}:${team.id}`
              )
          )

        );


      const schedules =
        await Promise.all(

          scheduleTargets.map(
            key => {

              const [
                league,
                teamId
              ] =
                key.split(":");


              return getTeamSchedule(
                league,
                teamId
              );

            }
          )

        );


      let allEvents =
        dedupeRawEvents(
          schedules.flat()
        );


      /*
       * Primary fixture search.
       */

      let fixture =
        allEvents.find(
          event =>
            isExactFixture(
              event,
              home,
              away
            )
        );


      /*
       * Fallback:
       * search upcoming scoreboard data.
       */

      if (
        !fixture
      ) {

        const leagues =
          unique(

            selected.flatMap(
              team =>
                team.leagues
            )

          );


        const scoreboardEvents =
          await Promise.all(

            leagues.map(
              league =>
                getScoreboardRange(
                  league,
                  60
                )
            )

          );


        allEvents =
          dedupeRawEvents(

            [
              ...allEvents,
              ...scoreboardEvents.flat()
            ]

          );


        fixture =
          allEvents.find(
            event =>
              isExactFixture(
                event,
                home,
                away
              )
          );

      }


      /*
       * Historical fallback.
       */

      const historyRanges =
        await Promise.all(

          unique(

            selected.flatMap(
              team =>
                team.leagues
            )

          ).map(

            league =>
              getScoreboardPastRange(
                league,
                120
              )

          )

        );


      allEvents =
        dedupeRawEvents(

          [
            ...allEvents,
            ...historyRanges.flat()
          ]

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


      /*
       * Nothing useful.
       */

      if (
        !fixture &&
        homeRecent.length === 0 &&
        awayRecent.length === 0
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

            fixture:
              null,

            recentMatches: {

              home:
                [],

              away:
                []

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
          item.score >=
          70
      )

      .sort(
        (a,b) =>
          b.score -
          a.score
      );


  if (
    !candidates.length
  ) {

    return null;

  }


  const best =
    candidates[0].team;


  const leagues =
    unique(

      candidates

        .filter(
          item =>
            item.score >=
            Math.max(
              70,
              candidates[0].score - 15
            )
        )

        .map(
          item =>
            item.team.league
        )

    );


  return {

    ...best,

    leagues:
      leagues.length
        ? leagues
        : [best.league]

  };

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
    of
    data?.sports?.[0]?.leagues ||
    []
  ) {

    for (
      const item
      of
      group?.teams ||
      []
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

  const key =
    `${league}:${teamId}`;


  if (
    SCHEDULE_CACHE.has(
      key
    )
  ) {

    return SCHEDULE_CACHE.get(
      key
    );

  }


  const data =
    await fetchJSON(

      `${SITE}/${league}/teams/${encodeURIComponent(teamId)}/schedule?limit=100`

    );


  const events =
    Array.isArray(
      data?.events
    )
      ? data.events
      : [];


  SCHEDULE_CACHE.set(
    key,
    events
  );


  return events;

}


/* ==========================================================
   SCOREBOARD FUTURE
========================================================== */

async function getScoreboardRange(
  league,
  daysForward
) {

  const start =
    new Date();


  const end =
    new Date(

      start.getTime() +
      daysForward *
      86400000

    );


  return getScoreboardByDates(

    league,

    formatDate(
      start
    ),

    formatDate(
      end
    )

  );

}


/* ==========================================================
   SCOREBOARD HISTORY
========================================================== */

async function getScoreboardPastRange(
  league,
  daysBack
) {

  const end =
    new Date();


  const start =
    new Date(

      end.getTime() -
      daysBack *
      86400000

    );


  return getScoreboardByDates(

    league,

    formatDate(
      start
    ),

    formatDate(
      end
    )

  );

}


/* ==========================================================
   SCOREBOARD REQUEST
========================================================== */

async function getScoreboardByDates(
  league,
  from,
  to
) {

  try {

    const fixedUrl =
      `${SITE}/${league}/scoreboard?dates=` +
      `${from.replaceAll("-", "")}` +
      "-" +
      `${to.replaceAll("-", "")}`;


    const data =
      await fetchJSON(
        fixedUrl
      );


    return Array.isArray(
      data?.events
    )
      ? data.events
      : [];

  } catch {

    return [];

  }

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
    event?.competitions?.[0]?.competitors ||
    [];


  const homeTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    )?.team?.displayName;


  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    )?.team?.displayName;


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
   RECENT MATCHES
========================================================== */

function buildRecentForTeam(
  teamName,
  events
) {

  return events

    .filter(
      event => {

        const competitors =
          event?.competitions?.[0]?.competitors ||
          [];


        const home =
          competitors.find(
            item =>
              item?.homeAway ===
              "home"
          )?.team?.displayName;


        const away =
          competitors.find(
            item =>
              item?.homeAway ===
              "away"
          )?.team?.displayName;


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
   FINAL SCORE CHECK
========================================================== */

function hasFinalScore(
  event
) {

  const competitors =
    event?.competitions?.[0]?.competitors ||
    [];


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

    &&

    event?.competitions?.[0]?.status?.type?.completed === true

  );

}


/* ==========================================================
   NORMALIZE EVENT
========================================================== */

function normalizeEvent(
  event
) {

  const competitors =
    event?.competitions?.[0]?.competitors ||
    [];


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


  const completed =
    event?.competitions?.[0]?.status?.type?.completed === true;


  const finished =
    completed &&
    homeScore !== null &&
    awayScore !== null;


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
      finished
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
          finished
            ? homeScore
            : null,

        away:
          finished
            ? awayScore
            : null

      }

    },

    tournament:

      event?.competitions?.[0]?.league?.name ||

      event?.season?.displayName ||

      null

  };

}


/* ==========================================================
   DEDUPE
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
   TIMESTAMP
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
            "YCB-Football-Prediction-Engine/3.0.1"

        }

      }
    );


  const text =
    await response.text();


  let data;


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
   NAME MATCH
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
        ta.has(x)
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
        ta.has(x)
    ).length;


  return overlap
    ? 40 +
      overlap * 10
    : 0;

}


/* ==========================================================
   NUMBER
========================================================== */

function finiteOrNull(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

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
   DATE
========================================================== */

function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


/* ==========================================================
   UNIQUE
========================================================== */

function unique(
  values
) {

  return [
    ...new Set(
      values.filter(
        Boolean
      )
    )
  ];

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

      home:
        [],

      away:
        []

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
