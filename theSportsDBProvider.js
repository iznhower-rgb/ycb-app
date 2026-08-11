// ==========================================================
// Y.C.B THESPORTSDB PROVIDER 3.1.0
// ==========================================================
//
// Independent fixture verification + recent form provider.
//
// Compatible with:
//   providers.js 3.1.0
//   providerRunner.js 3.1.0
//   statsCollector.js 3.1.0
//
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const DEFAULT_API_KEY =
  "123";


const API_BASE =
  "https://www.thesportsdb.com/api/v1/json";


const PROVIDER_VERSION =
  "3.1.0";


class TheSportsDBProvider
  extends DataProvider {


  constructor() {

    super(
      "TheSportsDB"
    );

  }


  async getMatchData(
    home,
    away,
    env
  ) {

    const startedAt =
      Date.now();


    try {

      const apiKey =
        getApiKey(
          env
        );


      const fixture =
        await findFixture(
          home,
          away,
          apiKey
        );


      if (
        !fixture
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "TheSportsDB متصل لكن لم يتم العثور على المباراة المطلوبة.",

          data: {

            source:
              "thesportsdb",

            providerVersion:
              PROVIDER_VERSION,

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

            },

            historyAvailable:
              false,

            historyCount: {

              home:
                0,

              away:
                0

            },

            durationMs:
              Date.now() -
              startedAt

          }

        };

      }


      const recent =
        await getRecentMatches(
          fixture?.idHomeTeam ||
            null,

          fixture?.idAwayTeam ||
            null,

          apiKey
        );


      const normalizedFixture =
        normalizeEvent(
          fixture
        );


      const historyAvailable =
        recent.home.length > 0 ||
        recent.away.length > 0;


      return {

        status:
          "success",

        message:
          historyAvailable

            ? "تم التحقق من المباراة وجمع بيانات النتائج السابقة عبر TheSportsDB."

            : "تم التحقق من المباراة عبر TheSportsDB، لكن النتائج السابقة غير متاحة بشكل كافٍ.",

        data: {

          source:
            "thesportsdb",

          providerVersion:
            PROVIDER_VERSION,

          available:
            true,

          matchFound:
            true,

          fixture:
            normalizedFixture,

          recentMatches: {

            home:
              recent.home,

            away:
              recent.away

          },

          historyAvailable,

          historyCount: {

            home:
              recent.home.length,

            away:
              recent.away.length

          },

          limitations: {

            freeTier:
              true,

            note:
              "TheSportsDB free V1 may restrict previous team events."

          },

          durationMs:
            Date.now() -
            startedAt

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

        data: {

          source:
            "thesportsdb",

          providerVersion:
            PROVIDER_VERSION,

          available:
            false,

          matchFound:
            false,

          fixture:
            null,

          recentMatches: {

            home:
              [],

            away:
              []

          },

          historyAvailable:
            false

        }

      };

    }

  }

}


/* ==========================================================
   API KEY
========================================================== */

function getApiKey(
  env
) {

  const envKey =
    env?.THESPORTSDB_API_KEY ||

    env?.THESPORTSDB_KEY ||

    env?.SPORTSDB_API_KEY;


  return String(
    envKey ||
    DEFAULT_API_KEY
  ).trim();

}


/* ==========================================================
   FIND FIXTURE
========================================================== */

async function findFixture(
  home,
  away,
  apiKey
) {

  const homeName =
    String(
      home ||
      ""
    ).trim();


  const awayName =
    String(
      away ||
      ""
    ).trim();


  if (
    !homeName ||
    !awayName
  ) {

    return null;

  }


  const patterns =
    buildSearchPatterns(
      homeName,
      awayName
    );


  const checked =
    new Set();


  for (
    const pattern
    of patterns
  ) {

    const key =
      pattern.toLowerCase();


    if (
      checked.has(
        key
      )
    ) {

      continue;

    }


    checked.add(
      key
    );


    try {

      const url =
        `${API_BASE}/${apiKey}/searchevents.php?e=` +

        encodeURIComponent(
          pattern
        );


      const data =
        await fetchJSON(
          url
        );


      const events =
        Array.isArray(
          data?.event
        )
          ? data.event
          : [];


      const exact =
        events.find(
          event =>
            eventMatchesTeams(
              event,
              homeName,
              awayName
            )
        );


      if (
        exact
      ) {

        return exact;

      }

    } catch {

      // Continue.

    }

  }


  return null;

}


/* ==========================================================
   SEARCH PATTERNS
========================================================== */

function buildSearchPatterns(
  home,
  away
) {

  return [

    `${home}_vs_${away}`,

    `${home}_v_${away}`,

    `${home} vs ${away}`,

    `${home} v ${away}`,

    `${home}_vs._${away}`,

    `${home} vs. ${away}`,

    `${away}_vs_${home}`,

    `${away}_v_${home}`,

    `${away} vs ${home}`,

    `${away} v ${home}`

  ];

}


/* ==========================================================
   EVENT TEAM MATCH
========================================================== */

function eventMatchesTeams(
  event,
  home,
  away
) {

  if (
    !event?.strHomeTeam ||
    !event?.strAwayTeam
  ) {

    return false;

  }


  return (

    namesMatch(
      event.strHomeTeam,
      home
    )

    &&

    namesMatch(
      event.strAwayTeam,
      away
    )

  );

}


/* ==========================================================
   RECENT MATCHES
========================================================== */

async function getRecentMatches(
  homeId,
  awayId,
  apiKey
) {

  const result = {

    home:
      [],

    away:
      []

  };


  if (
    homeId
  ) {

    try {

      const data =
        await fetchJSON(

          `${API_BASE}/${apiKey}/eventslast.php?id=` +

          encodeURIComponent(
            String(
              homeId
            )
          )

        );


      const events =
        Array.isArray(
          data?.results
        )
          ? data.results
          : [];


      result.home =
        events

          .filter(
            isValidCompletedEvent
          )

          .map(
            normalizeRecentMatch
          )

          .filter(
            Boolean
          );

    } catch {

      result.home =
        [];

    }

  }


  if (
    awayId
  ) {

    try {

      const data =
        await fetchJSON(

          `${API_BASE}/${apiKey}/eventslast.php?id=` +

          encodeURIComponent(
            String(
              awayId
            )
          )

        );


      const events =
        Array.isArray(
          data?.results
        )
          ? data.results
          : [];


      result.away =
        events

          .filter(
            isValidCompletedEvent
          )

          .map(
            normalizeRecentMatch
          )

          .filter(
            Boolean
          );

    } catch {

      result.away =
        [];

    }

  }


  return result;

}


/* ==========================================================
   VALID COMPLETED EVENT
========================================================== */

function isValidCompletedEvent(
  event
) {

  if (
    !event
  ) {

    return false;

  }


  const homeScore =
    finiteOrNull(
      event.intHomeScore
    );


  const awayScore =
    finiteOrNull(
      event.intAwayScore
    );


  return (

    homeScore !== null &&

    awayScore !== null

  );

}


/* ==========================================================
   NORMALIZE RECENT MATCH
========================================================== */

function normalizeRecentMatch(
  event
) {

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );


  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );


  if (
    homeScore === null ||
    awayScore === null
  ) {

    return null;

  }


  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate:
      buildDateTime(
        event
      ),

    date:
      event?.dateEvent ||
      null,

    status:
      "FINISHED",

    homeTeam: {

      id:
        event?.idHomeTeam ||
        null,

      name:
        event?.strHomeTeam ||
        null,

      shortName:
        event?.strHomeTeamShort ||
        null

    },

    awayTeam: {

      id:
        event?.idAwayTeam ||
        null,

      name:
        event?.strAwayTeam ||
        null,

      shortName:
        event?.strAwayTeamShort ||
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
      event?.strLeague ||
      null

  };

}


/* ==========================================================
   NORMALIZE EVENT
========================================================== */

function normalizeEvent(
  event
) {

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );


  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );


  const finished =
    isFinishedEvent(
      event,
      homeScore,
      awayScore
    );


  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate:
      buildDateTime(
        event
      ),

    date:
      event?.dateEvent ||
      null,

    time:
      event?.strTime ||
      null,

    status:
      finished
        ? "FINISHED"
        : "SCHEDULED",

    homeTeam: {

      id:
        event?.idHomeTeam ||
        null,

      name:
        event?.strHomeTeam ||
        null,

      shortName:
        event?.strHomeTeamShort ||
        null

    },

    awayTeam: {

      id:
        event?.idAwayTeam ||
        null,

      name:
        event?.strAwayTeam ||
        null,

      shortName:
        event?.strAwayTeamShort ||
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
      event?.strLeague ||
      null

  };

}


/* ==========================================================
   FINISHED EVENT
========================================================== */

function isFinishedEvent(
  event,
  homeScore,
  awayScore
) {

  const status =
    String(
      event?.strStatus ||
      ""
    )
      .toLowerCase()
      .trim();


  const progress =
    String(
      event?.strProgress ||
      ""
    )
      .toLowerCase()
      .trim();


  return (

    status ===
      "match finished"

    ||

    status ===
      "ft"

    ||

    progress ===
      "final"

    ||

    (

      homeScore !== null &&

      awayScore !== null &&

      (
        status ===
          "finished"

        ||

        status ===
          "completed"
      )

    )

  );

}


/* ==========================================================
   DATE/TIME
========================================================== */

function buildDateTime(
  event
) {

  const timestamp =
    event?.strTimestamp;


  if (
    timestamp
  ) {

    const parsed =
      new Date(
        timestamp
      );


    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {

      return parsed.toISOString();

    }

  }


  const date =
    String(
      event?.dateEvent ||
      ""
    ).trim();


  const time =
    String(
      event?.strTime ||
      ""
    ).trim();


  if (
    !date
  ) {

    return null;

  }


  return time
    ? `${date}T${time}`
    : date;

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
            `YCB-Football-Prediction-Engine/${PROVIDER_VERSION}`

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
      "TheSportsDB returned invalid JSON"
    );

  }


  if (
    !response.ok
  ) {

    if (
      response.status ===
      429
    ) {

      throw new Error(
        "TheSportsDB rate limit reached (HTTP 429)"
      );

    }


    throw new Error(
      `TheSportsDB HTTP ${response.status}`
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
    a === b
  ) {

    return true;

  }


  if (
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
          token =>
            token.length >= 3
        )

    );


  const tb =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    tb.length === 0
  ) {

    return false;

  }


  const overlap =
    tb.filter(
      token =>
        ta.has(token)
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
   REGISTER
========================================================== */

const provider =
  new TheSportsDBProvider();


registerProvider(
  provider
);


export default provider;


// ==========================================================
// END theSportsDBProvider.js
// ==========================================================
