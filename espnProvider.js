// Y.C.B ESPN PROVIDER 2.4.0
// Browser-safe ESPN provider
// Explicit access_blocked detection
// Never throws into the main Y.C.B engine

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";

const ESPN =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";


const REQUEST_TIMEOUT =
  12000;


/* ==========================================
   PROVIDER
========================================== */

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

    if (
      !home ||
      !away
    ) {

      return {

        status:
          "invalid_request",

        message:
          "ESPN: أسماء الفريقين غير صالحة.",

        data: {

          source:
            "espn",

          available:
            false,

          matchFound:
            false

        }

      };

    }


    const now =
      new Date();


    const from =
      shiftDate(
        now,
        -30
      );


    const to =
      shiftDate(
        now,
        30
      );


    try {

      const events =
        await getScoreboardEvents(
          from,
          to
        );


      const fixtureEvent =
        events.find(
          event =>
            eventMatches(
              event,
              home,
              away
            )
        );


      /*
       * ESPN reached successfully,
       * but fixture was not found.
       */

      if (
        !fixtureEvent
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            searchRange: {

              dateFrom:
                formatDate(
                  from
                ),

              dateTo:
                formatDate(
                  to
                )

            },

            totalEvents:
              events.length,

            recentMatches: {

              home: [],
              away: []

            }

          }

        };

      }


      const fixture =
        normalizeEvent(
          fixtureEvent
        );


      const competitors =
        fixtureEvent
          ?.competitions?.[0]
          ?.competitors ||
        [];


      const homeCompetitor =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );


      const awayCompetitor =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );


      const homeId =
        homeCompetitor
          ?.team
          ?.id ||
        null;


      const awayId =
        awayCompetitor
          ?.team
          ?.id ||
        null;


      /*
       * Fetch schedules independently.
       *
       * Failure of one schedule must not
       * destroy the ESPN fixture result.
       */

      const [
        homeSchedule,
        awaySchedule
      ] = await Promise.all([

        homeId
          ? fetchTeamSchedule(
              homeId
            )
          : Promise.resolve([]),

        awayId
          ? fetchTeamSchedule(
              awayId
            )
          : Promise.resolve([])

      ]);


      let homeRecent =
        normalizeRecentMatches(
          homeSchedule,
          fixtureEvent
        );


      let awayRecent =
        normalizeRecentMatches(
          awaySchedule,
          fixtureEvent
        );


      /*
       * Scoreboard fallback.
       */

      if (
        homeRecent.length === 0
      ) {

        homeRecent =
          normalizeRecentMatches(
            events.filter(
              event =>
                isTeamEvent(
                  event,
                  home
                )
            ),
            fixtureEvent
          );

      }


      if (
        awayRecent.length === 0
      ) {

        awayRecent =
          normalizeRecentMatches(
            events.filter(
              event =>
                isTeamEvent(
                  event,
                  away
                )
            ),
            fixtureEvent
          );

      }


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبياناتها عبر ESPN.",

        data: {

          source:
            "espn",

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

    } catch (
      error
    ) {

      const status =
        classifyESPNError(
          error
        );


      return {

        status,

        message:
          getESPNErrorMessage(
            status,
            error
          ),

        data: {

          source:
            "espn",

          available:
            false,

          matchFound:
            false,

          error:
            error?.message ||
            String(error)

        }

      };

    }

  }

}


/* ==========================================
   SCOREBOARD
========================================== */

async function getScoreboardEvents(
  from,
  to
) {

  const url =
    `${SCOREBOARD}?dates=` +
    `${formatDate(from)}-${formatDate(to)}` +
    `&limit=1000`;


  const payload =
    await fetchJSON(
      url
    );


  return Array.isArray(
    payload?.events
  )

    ? payload.events

    : [];

}


/* ==========================================
   TEAM SCHEDULE
========================================== */

async function fetchTeamSchedule(
  teamId
) {

  const leagues = [

    "eng.1",
    "eng.2",
    "eng.3",

    "esp.1",

    "ger.1",

    "ita.1",

    "fra.1",

    "usa.1",

    "bra.1",

    "arg.1",

    "mex.1",

    "ned.1",

    "por.1",

    "bel.1",

    "tur.1",

    "uefa.champions"

  ];


  for (
    const league
    of leagues
  ) {

    try {

      const url =
        `${ESPN}/${league}` +
        `/teams/${encodeURIComponent(
          teamId
        )}/schedule`;


      const data =
        await fetchJSON(
          url
        );


      const events =
        Array.isArray(
          data?.events
        )
          ? data.events
          : [];


      if (
        events.length > 0
      ) {

        return events;

      }

    } catch {

      /*
       * Continue.
       */

    }

  }


  return [];

}


/* ==========================================
   RECENT MATCHES
========================================== */

function normalizeRecentMatches(
  events,
  fixtureEvent
) {

  return (
    Array.isArray(
      events
    )
      ? events
      : []
  )

    .filter(
      event =>
        isFinished(
          event
        )
    )

    .filter(
      event =>
        !sameEvent(
          event,
          fixtureEvent
        )
    )

    .sort(
      (
        a,
        b
      ) => {

        const dateA =
          Date.parse(
            a?.date ||
            ""
          );


        const dateB =
          Date.parse(
            b?.date ||
            ""
          );


        return dateB - dateA;

      }
    )

    .slice(
      0,
      15
    )

    .map(
      normalizeEvent
    );

}


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url
) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );


  try {

    const response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            "Accept":
              "application/json"

          },

          signal:
            controller.signal

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


    if (
      !response.ok
    ) {

      throw new Error(
        `ESPN HTTP ${response.status}` +
        (
          data?.message
            ? `: ${data.message}`
            : ""
        )
      );

    }


    return data;

  } catch (
    error
  ) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "ESPN request timeout"
      );

    }


    /*
     * Browser fetch commonly reports
     * CORS / blocked requests as TypeError.
     *
     * Preserve an explicit marker so the
     * application can show access_blocked.
     */

    if (
      error instanceof TypeError
    ) {

      throw new Error(
        `ESPN access blocked or CORS failure: ${
          error?.message ||
          "Failed to fetch"
        }`
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ==========================================
   ERROR CLASSIFICATION
========================================== */

function classifyESPNError(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "access blocked"
    ) ||
    message.includes(
      "cors"
    ) ||
    message.includes(
      "access-control"
    ) ||
    message.includes(
      "forbidden"
    ) ||
    message.includes(
      "http 403"
    ) ||
    message.includes(
      " 403"
    )
  ) {

    return "access_blocked";

  }


  if (
    message.includes(
      "http 401"
    ) ||
    message.includes(
      " 401"
    ) ||
    message.includes(
      "unauthorized"
    )
  ) {

    return "auth_error";

  }


  if (
    message.includes(
      "http 404"
    ) ||
    message.includes(
      " 404"
    )
  ) {

    return "endpoint_not_found";

  }


  if (
    message.includes(
      "http 429"
    ) ||
    message.includes(
      " 429"
    )
  ) {

    return "rate_limited";

  }


  if (
    message.includes(
      "timeout"
    )
  ) {

    return "timeout";

  }


  return "network_error";

}


/* ==========================================
   ERROR MESSAGE
========================================== */

function getESPNErrorMessage(
  status,
  error
) {

  if (
    status ===
    "access_blocked"
  ) {

    return (
      "ESPN محجوب أو مرفوض من بيئة المتصفح (CORS/403). تم عزل المصدر ولن تتأثر بقية المصادر."
    );

  }


  if (
    status ===
    "timeout"
  ) {

    return (
      "ESPN لم يستجب خلال المهلة المحددة. تم تجاهل المصدر."
    );

  }


  if (
    status ===
    "rate_limited"
  ) {

    return (
      "ESPN حدّ من عدد الطلبات. تم تجاهل المصدر مؤقتًا."
    );

  }


  return (
    error?.message ||
    "ESPN request failed."
  );

}


/* ==========================================
   NORMALIZE EVENT
========================================== */

function normalizeEvent(
  event
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


  const home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    ) ||
    competitors[0] ||
    {};


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    ) ||
    competitors[1] ||
    {};


  const completed =
    isFinished(
      event
    );


  const homeScore =
    numberOrNull(
      home?.score
    );


  const awayScore =
    numberOrNull(
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
      completed
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type
              ?.name ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home
          ?.team
          ?.id ||
        null,

      name:
        home
          ?.team
          ?.displayName ||
        home
          ?.team
          ?.name ||
        null,

      shortName:
        home
          ?.team
          ?.shortDisplayName ||
        home
          ?.team
          ?.abbreviation ||
        null

    },

    awayTeam: {

      id:
        away
          ?.team
          ?.id ||
        null,

      name:
        away
          ?.team
          ?.displayName ||
        away
          ?.team
          ?.name ||
        null,

      shortName:
        away
          ?.team
          ?.shortDisplayName ||
        away
          ?.team
          ?.abbreviation ||
        null

    },

    score: {

      fullTime: {

        home:
          completed
            ? homeScore
            : null,

        away:
          completed
            ? awayScore
            : null

      }

    },

    tournament:
      event
        ?.league
        ?.name ||
      event
        ?.season
        ?.displayName ||
      null

  };

}


/* ==========================================
   EVENT MATCH
========================================== */

function eventMatches(
  event,
  home,
  away
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


  const homeTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    )?.team;


  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    )?.team;


  if (
    !homeTeam ||
    !awayTeam
  ) {

    return false;

  }


  return (

    namesMatch(

      normalizeName(
        homeTeam?.displayName ||
        homeTeam?.name
      ),

      normalizeName(
        home
      )

    )

    &&

    namesMatch(

      normalizeName(
        awayTeam?.displayName ||
        awayTeam?.name
      ),

      normalizeName(
        away
      )

    )

  );

}


/* ==========================================
   TEAM EVENT
========================================== */

function isTeamEvent(
  event,
  team
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


  return competitors.some(
    item =>
      namesMatch(

        normalizeName(
          item
            ?.team
            ?.displayName ||
          item
            ?.team
            ?.name
        ),

        normalizeName(
          team
        )

      )
  );

}


/* ==========================================
   FINISHED
========================================== */

function isFinished(
  event
) {

  const type =
    event
      ?.status
      ?.type;


  return (

    type?.completed ===
    true

    ||

    [

      "STATUS_FINAL",
      "STATUS_FINAL_PEN",
      "STATUS_FINAL_AET",
      "STATUS_FINAL_OT"

    ].includes(
      type?.name
    )

  );

}


/* ==========================================
   SAME EVENT
========================================== */

function sameEvent(
  first,
  second
) {

  if (
    !first ||
    !second
  ) {

    return false;

  }


  return (

    String(
      first?.id ||
      ""
    )

    ===

    String(
      second?.id ||
      ""
    )

  );

}


/* ==========================================
   NUMBER
========================================== */

function numberOrNull(
  value
) {

  if (
    value ===
    null ||
    value ===
    undefined ||
    value ===
    ""
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


/* ==========================================
   NAME NORMALIZATION
========================================== */

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


/* ==========================================
   NAME MATCH
========================================== */

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
    first.includes(
      second
    ) ||
    second.includes(
      first
    )
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


  return secondTokens.some(
    token =>
      firstTokens.has(
        token
      )
  );

}


/* ==========================================
   DATE SHIFT
========================================== */

function shiftDate(
  date,
  days
) {

  const result =
    new Date(
      date
    );


  result.setUTCDate(
    result.getUTCDate() +
    days
  );


  return result;

}


/* ==========================================
   DATE FORMAT
========================================== */

function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    )
    .replace(
      /-/g,
      ""
    );

}


/* ==========================================
   REGISTER
========================================== */

const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
