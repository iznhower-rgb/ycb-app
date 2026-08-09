// Y.C.B ESPN PROVIDER 2.4.0
// Browser-safe ESPN provider
// Explicit access_blocked / CORS handling
// Provider failure never breaks Y.C.B


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

    const homeName =
      normalizeName(
        home
      );


    const awayName =
      normalizeName(
        away
      );


    if (
      !homeName ||
      !awayName
    ) {

      return {

        status:
          "invalid_request",

        message:
          "ESPN: اسم الفريقين غير صالح.",

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
       * ESPN reachable but requested
       * fixture not found.
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
              events.length

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
       * Team schedules are optional.
       *
       * If ESPN blocks one schedule request,
       * the main fixture remains usable.
       */

      const [
        homeSchedule,
        awaySchedule
      ] = await Promise.all([

        homeId
          ? safeTeamSchedule(
              homeId
            )
          : [],

        awayId
          ? safeTeamSchedule(
              awayId
            )
          : []

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
       * Fallback to scoreboard events.
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

      const classification =
        classifyESPNError(
          error
        );


      return {

        status:
          classification.status,

        message:
          classification.message,

        data: {

          source:
            "espn",

          available:
            false,

          matchFound:
            false,

          error:

            error?.message ||
            String(
              error
            )

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
    new URL(
      SCOREBOARD
    );


  url.searchParams.set(
    "dates",
    `${formatDate(from)}-${formatDate(to)}`
  );


  url.searchParams.set(
    "limit",
    "1000"
  );


  const payload =
    await fetchJSON(
      url.toString()
    );


  return Array.isArray(
    payload?.events
  )
    ? payload.events
    : [];

}


/* ==========================================
   TEAM SCHEDULE SAFE
========================================== */

async function safeTeamSchedule(
  teamId
) {

  try {

    return await fetchTeamSchedule(
      teamId
    );

  } catch {

    return [];

  }

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
      ) =>
        getEventTimestamp(
          b
        ) -
        getEventTimestamp(
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


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url
) {

  const controller =
    typeof AbortController !==
    "undefined"

      ? new AbortController()

      : null;


  let timeoutId =
    null;


  if (
    controller
  ) {

    timeoutId =
      setTimeout(
        () => {

          controller.abort();

        },
        REQUEST_TIMEOUT
      );

  }


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
            controller?.signal

        }
      );


    const text =
      await response.text();


    const data =
      safeJsonParse(
        text
      );


    if (
      !response.ok
    ) {

      const error =
        new Error(
          `ESPN HTTP ${response.status}` +
          (
            data?.message
              ? `: ${data.message}`
              : ""
          )
        );


      error.httpStatus =
        response.status;


      error.responseData =
        data;


      throw error;

    }


    return data;

  } catch (
    error
  ) {

    /*
     * Preserve HTTP errors.
     */

    if (
      Number.isFinite(
        Number(
          error?.httpStatus
        )
      )
    ) {

      throw error;

    }


    /*
     * Browser CORS / access failure.
     *
     * Browsers often expose this as:
     * TypeError: Failed to fetch
     *
     * There may be no HTTP response at all.
     */

    const message =
      String(
        error?.message ||
        error ||
        ""
      );


    const accessError =
      new Error(
        message ||
        "ESPN access blocked by browser or network."
      );


    accessError.code =
      isBrowserAccessFailure(
        error
      )
        ? "ESPN_ACCESS_BLOCKED"
        : "ESPN_NETWORK_ERROR";


    accessError.originalError =
      error;


    throw accessError;

  } finally {

    if (
      timeoutId !== null
    ) {

      clearTimeout(
        timeoutId
      );

    }

  }

}


/* ==========================================
   SAFE JSON
========================================== */

function safeJsonParse(
  text
) {

  if (
    !text
  ) {

    return null;

  }


  try {

    return JSON.parse(
      text
    );

  } catch {

    return null;

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
    );


  const httpStatus =
    Number(
      error?.httpStatus
    );


  /*
   * Explicit HTTP access denial.
   */

  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    httpStatus === 451
  ) {

    return {

      status:
        "access_blocked",

      message:
        `ESPN رفض الوصول إلى المصدر (HTTP ${httpStatus}).`

    };

  }


  /*
   * Browser access / CORS failure.
   */

  if (
    error?.code ===
      "ESPN_ACCESS_BLOCKED" ||

    isLikelyBrowserAccessError(
      message
    )
  ) {

    return {

      status:
        "access_blocked",

      message:
        "ESPN لم يسمح للمتصفح بالوصول إلى المصدر. قد يكون السبب CORS أو حجب الوصول من بيئة التطبيق."

    };

  }


  if (
    httpStatus === 404
  ) {

    return {

      status:
        "endpoint_not_found",

      message:
        "ESPN endpoint غير موجود."

    };

  }


  if (
    httpStatus === 429
  ) {

    return {

      status:
        "rate_limited",

      message:
        "ESPN رفض الطلب مؤقتًا بسبب كثرة الطلبات."

    };

  }


  if (
    error?.name ===
      "AbortError"
  ) {

    return {

      status:
        "timeout",

      message:
        "ESPN لم يستجب خلال المهلة المحددة."

    };

  }


  return {

    status:
      "network_error",

    message:
      message ||
      "ESPN request failed."

  };

}


/* ==========================================
   ACCESS FAILURE DETECTION
========================================== */

function isBrowserAccessFailure(
  error
) {

  if (
    !error
  ) {

    return false;

  }


  if (
    error?.name ===
      "TypeError"
  ) {

    const message =
      String(
        error?.message ||
        ""
      ).toLowerCase();


    if (
      message.includes(
        "failed to fetch"
      ) ||

      message.includes(
        "networkerror"
      ) ||

      message.includes(
        "load failed"
      )
    ) {

      return true;

    }

  }


  return false;

}


/* ==========================================
   LIKELY BROWSER ACCESS ERROR
========================================== */

function isLikelyBrowserAccessError(
  message
) {

  const value =
    String(
      message ||
      ""
    ).toLowerCase();


  return (

    value.includes(
      "failed to fetch"
    )

    ||

    value.includes(
      "networkerror"
    )

    ||

    value.includes(
      "cors"
    )

    ||

    value.includes(
      "cross-origin"
    )

    ||

    value.includes(
      "access-control"
    )

    ||

    value.includes(
      "load failed"
    )

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


  return String(
    first?.id ||
    ""
  )

  ===

  String(
    second?.id ||
    ""
  );

}


/* ==========================================
   EVENT TIMESTAMP
========================================== */

function getEventTimestamp(
  event
) {

  const date =
    event?.date ||
    null;


  if (
    !date
  ) {

    return 0;

  }


  const timestamp =
    Date.parse(
      date
    );


  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;

}


/* ==========================================
   NUMBER
========================================== */

function numberOrNull(
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
      /[-_./]/g,
      " "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|women|woman|f)\b/g,
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


  const firstTokens =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const secondTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    firstTokens.size === 0 ||
    secondTokens.length === 0
  ) {

    return false;

  }


  let common =
    0;


  for (
    const token
    of secondTokens
  ) {

    if (
      firstTokens.has(
        token
      )
    ) {

      common++;

    }

  }


  /*
   * At least one meaningful token
   * must match.
   */

  return (
    common >= 1
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
