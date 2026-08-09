// Y.C.B SOFASCORE PROVIDER
// Browser / HTML / JavaScript compatible
// Compatible with Y.C.B PROVIDERS CORE
//
// IMPORTANT:
// Direct browser requests to SofaScore may fail because of
// CORS / WAF / anti-bot protection.
// If you have a proxy, pass it through env.sofascoreProxy
// or env.fetch.

import {
  DataProvider,
  registerProvider
} from "./providers.js";


/* ==========================================
   CONFIG
========================================== */

const SOFASCORE_API =
  "https://api.sofascore.com/api/v1";


const PROVIDER_NAME =
  "SofaScore";


/*
 * Search only a small reasonable date range.
 *
 * -1 = yesterday
 *  0 = today
 *  1 = tomorrow
 *  2 = +2 days
 *  3 = +3 days
 */
const SEARCH_FROM =
  -1;


const SEARCH_TO =
  3;


/*
 * Number of recent matches to return.
 */
const MAX_RECENT_MATCHES =
  15;


/*
 * Simple in-memory cache.
 *
 * This is very important in a browser application
 * because it prevents repeated identical requests.
 */
const CACHE_TTL =
  60 * 1000;


/* ==========================================
   PROVIDER
========================================== */

class SofaScoreProvider
  extends DataProvider {

  constructor() {

    super(
      PROVIDER_NAME
    );

  }


  async getMatchData(
    home,
    away,
    env = {}
  ) {

    const startedAt =
      Date.now();


    try {

      if (
        !home ||
        !away
      ) {

        return {

          status:
            "invalid_input",

          message:
            "SofaScore يحتاج إلى اسم الفريق المضيف والفريق الضيف.",

          data:
            null

        };

      }


      /*
       * Select the fetch implementation.
       *
       * Priority:
       *
       * 1. env.sofascoreFetch
       * 2. env.fetch
       * 3. native browser fetch
       */

      const fetchFn =
        getFetchFunction(
          env
        );


      /*
       * If a proxy URL is supplied, all SofaScore
       * requests go through it.
       */

      const proxy =
        getProxy(
          env
        );


      let match =
        null;


      const now =
        new Date();


      /*
       * Search the configured date range.
       */

      for (
        let offset = SEARCH_FROM;
        offset <= SEARCH_TO;
        offset++
      ) {

        const date =
          shiftDate(
            now,
            offset
          );


        const dateString =
          formatDate(
            date
          );


        const url =
          `${SOFASCORE_API}/sport/football/scheduled-events/${dateString}`;


        const payload =
          await fetchJSON(
            url,
            {
              fetchFn,
              proxy
            }
          );


        const events =
          Array.isArray(
            payload?.events
          )
            ? payload.events
            : [];


        match =
          findMatch(
            events,
            home,
            away
          );


        if (
          match
        ) {

          break;

        }

      }


      /*
       * No match found.
       */

      if (
        !match
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "sofascore",

            available:
              true,

            matchFound:
              false,

            requestedMatch: {

              home:
                String(
                  home
                ),

              away:
                String(
                  away
                )

            }

          }

        };

      }


      const homeId =
        match
          ?.homeTeam
          ?.id;


      const awayId =
        match
          ?.awayTeam
          ?.id;


      /*
       * Get recent matches independently.
       *
       * If one team request fails, do not destroy
       * the entire match result.
       */

      const [
        homeRecent,
        awayRecent
      ] =
        await Promise.all([

          homeId
            ? getRecentTeamMatches(
                homeId,
                {
                  fetchFn,
                  proxy
                }
              )
            : Promise.resolve([]),

          awayId
            ? getRecentTeamMatches(
                awayId,
                {
                  fetchFn,
                  proxy
                }
              )
            : Promise.resolve([])

        ]);


      const durationMs =
        Date.now() -
        startedAt;


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبياناتها عبر SofaScore.",

        data: {

          source:
            "sofascore",

          available:
            true,

          matchFound:
            true,

          durationMs,

          fixture:
            normalizeEvent(
              match
            ),

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
          classifyError(
            error
          ),

        message:
          error?.message ||
          String(
            error
          ),

        data: {

          source:
            "sofascore",

          available:
            false,

          matchFound:
            false

        }

      };

    }

  }

}


/* ==========================================
   FETCH FUNCTION
========================================== */

function getFetchFunction(
  env
) {

  if (
    env &&
    typeof env.sofascoreFetch ===
    "function"
  ) {

    return env.sofascoreFetch;

  }


  if (
    env &&
    typeof env.fetch ===
    "function"
  ) {

    return env.fetch;

  }


  if (
    typeof fetch ===
    "function"
  ) {

    return fetch.bind(
      globalThis
    );

  }


  throw new Error(
    "Fetch API غير متوفر في بيئة التطبيق."
  );

}


/* ==========================================
   PROXY
========================================== */

function getProxy(
  env
) {

  const proxy =
    env?.sofascoreProxy;


  if (
    typeof proxy !==
    "string"
  ) {

    return "";

  }


  return proxy.trim();

}


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url,
  options = {}
) {

  const fetchFn =
    options.fetchFn ||
    getFetchFunction({});


  const proxy =
    options.proxy ||
    "";


  /*
   * If a proxy exists, send the target URL
   * to the proxy instead of directly to SofaScore.
   */

  const requestUrl =
    proxy
      ? buildProxyUrl(
          proxy,
          url
        )
      : url;


  /*
   * Browser-safe headers.
   *
   * Do NOT try to spoof User-Agent or Origin
   * from browser JavaScript.
   */

  const response =
    await fetchFn(
      requestUrl,
      {

        method:
          "GET",

        headers: {

          "Accept":
            "application/json"

        },

        cache:
          "no-store"

      }
    );


  const text =
    await response.text();


  if (
    response.status ===
    403
  ) {

    throw new Error(
      "SofaScore HTTP 403 - access blocked or CORS/WAF protection."
    );

  }


  if (
    response.status ===
    429
  ) {

    throw new Error(
      "SofaScore HTTP 429 - too many requests."
    );

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `SofaScore HTTP ${response.status}`
    );

  }


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

    throw new Error(
      "SofaScore returned invalid JSON."
    );

  }

}


/* ==========================================
   PROXY URL BUILDER
========================================== */

function buildProxyUrl(
  proxy,
  targetUrl
) {

  /*
   * Supports proxies such as:
   *
   * https://your-domain.com/api/sofascore
   *
   * Result:
   *
   * https://your-domain.com/api/sofascore?url=...
   */

  const separator =
    proxy.includes("?")
      ? "&"
      : "?";


  return (
    proxy +
    separator +
    "url=" +
    encodeURIComponent(
      targetUrl
    )
  );

}


/* ==========================================
   RECENT TEAM MATCHES
========================================== */

async function getRecentTeamMatches(
  teamId,
  options = {}
) {

  if (
    !teamId
  ) {

    return [];

  }


  const fetchFn =
    options.fetchFn ||
    getFetchFunction({});


  const proxy =
    options.proxy ||
    "";


  const allEvents =
    [];


  /*
   * SofaScore uses pagination.
   *
   * Fetch only a couple of pages instead of
   * repeatedly requesting the same endpoint.
   */

  for (
    let page = 0;
    page < 2;
    page++
  ) {

    const url =
      `${SOFASCORE_API}/team/${teamId}/events/last/${page}`;


    let data;


    try {

      data =
        await fetchJSON(
          url,
          {
            fetchFn,
            proxy
          }
        );

    } catch (
      error
    ) {

      /*
       * Recent form is supplementary.
       *
       * Do not fail the entire provider if
       * the recent matches endpoint fails.
       */

      break;

    }


    const events =
      Array.isArray(
        data?.events
      )
        ? data.events
        : [];


    allEvents.push(
      ...events
    );


    /*
     * If the page contains fewer events,
     * there is probably no need for another page.
     */

    if (
      events.length === 0
    ) {

      break;

    }

  }


  /*
   * Remove duplicate events.
   */

  const unique =
    uniqueEvents(
      allEvents
    );


  return unique

    .filter(
      event =>
        isFinished(
          event
        )
    )

    .sort(
      (a, b) =>
        Number(
          b?.startTimestamp ||
          0
        ) -
        Number(
          a?.startTimestamp ||
          0
        )
    )

    .slice(
      0,
      MAX_RECENT_MATCHES
    )

    .map(
      normalizeEvent
    );

}


/* ==========================================
   UNIQUE EVENTS
========================================== */

function uniqueEvents(
  events
) {

  const map =
    new Map();


  for (
    const event of events
  ) {

    const id =
      event?.id;


    if (
      id == null
    ) {

      continue;

    }


    if (
      !map.has(
        String(
          id
        )
      )
    ) {

      map.set(
        String(
          id
        ),
        event
      );

    }

  }


  return [
    ...map.values()
  ];

}


/* ==========================================
   NORMALIZE EVENT
========================================== */

function normalizeEvent(
  event
) {

  const home =
    event?.homeTeam ||
    {};


  const away =
    event?.awayTeam ||
    {};


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.startTimestamp
        ? new Date(
            Number(
              event.startTimestamp
            ) * 1000
          ).toISOString()
        : null,

    status:
      isFinished(
        event
      )
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home?.id ||
        null,

      name:
        home?.name ||
        null,

      shortName:
        home?.shortName ||
        null

    },

    awayTeam: {

      id:
        away?.id ||
        null,

      name:
        away?.name ||
        null,

      shortName:
        away?.shortName ||
        null

    },

    score: {

      fullTime: {

        home:
          finiteOrNull(
            event
              ?.homeScore
              ?.normaltime ??
            event
              ?.homeScore
              ?.current
          ),

        away:
          finiteOrNull(
            event
              ?.awayScore
              ?.normaltime ??
            event
              ?.awayScore
              ?.current
          )

      }

    },

    tournament:
      event
        ?.tournament
        ?.name ||
      null

  };

}


/* ==========================================
   FIND MATCH
========================================== */

function findMatch(
  events,
  home,
  away
) {

  if (
    !Array.isArray(
      events
    )
  ) {

    return null;

  }


  const homeName =
    normalizeName(
      home
    );


  const awayName =
    normalizeName(
      away
    );


  /*
   * First try exact normalized matching.
   */

  let match =
    events.find(
      event => {

        const eventHome =
          normalizeName(
            event
              ?.homeTeam
              ?.name
          );


        const eventAway =
          normalizeName(
            event
              ?.awayTeam
              ?.name
          );


        return (
          eventHome === homeName &&
          eventAway === awayName
        );

      }
    );


  if (
    match
  ) {

    return match;

  }


  /*
   * Second attempt: flexible matching.
   */

  match =
    events.find(
      event => {

        const eventHome =
          normalizeName(
            event
              ?.homeTeam
              ?.name
          );


        const eventAway =
          normalizeName(
            event
              ?.awayTeam
              ?.name
          );


        return (

          namesMatch(
            eventHome,
            homeName
          )

          &&

          namesMatch(
            eventAway,
            awayName
          )

        );

      }
    );


  return (
    match ||
    null
  );

}


/* ==========================================
   FINISHED
========================================== */

function isFinished(
  event
) {

  const type =
    String(
      event
        ?.status
        ?.type ||
      ""
    ).toLowerCase();


  return (

    type ===
    "finished"

    ||

    type ===
    "after_penalties"

    ||

    type ===
    "after_extra_time"

  );

}


/* ==========================================
   NUMBER
========================================== */

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
    Number(
      days
    )
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
    );

}


/* ==========================================
   NORMALIZE TEAM NAME
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

    /*
     * Common football club prefixes/suffixes.
     */

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club)\b/g,
      " "
    )

    /*
     * Keep Latin, Arabic and numbers.
     */

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
   TEAM NAME MATCH
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


  /*
   * Avoid matching extremely short names.
   */

  if (
    first.length < 3 ||
    second.length < 3
  ) {

    return false;

  }


  /*
   * Full substring match.
   */

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


  /*
   * Token based comparison.
   *
   * Requires at least one meaningful token.
   */

  const firstTokens =
    first
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  const secondTokens =
    second
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    !firstTokens.length ||
    !secondTokens.length
  ) {

    return false;

  }


  const firstSet =
    new Set(
      firstTokens
    );


  const common =
    secondTokens.filter(
      token =>
        firstSet.has(
          token
        )
    );


  /*
   * One common token is allowed only when
   * it is reasonably distinctive.
   */

  if (
    common.length >= 2
  ) {

    return true;

  }


  if (
    common.length === 1
  ) {

    const token =
      common[0];


    return (
      token.length >= 5
    );

  }


  return false;

}


/* ==========================================
   ERROR CLASSIFICATION
========================================== */

function classifyError(
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
      "403"
    ) ||

    message.includes(
      "blocked"
    ) ||

    message.includes(
      "waf"
    )
  ) {

    return "access_blocked";

  }


  if (
    message.includes(
      "429"
    ) ||

    message.includes(
      "too many"
    )
  ) {

    return "rate_limited";

  }


  if (
    message.includes(
      "failed to fetch"
    ) ||

    message.includes(
      "cors"
    ) ||

    message.includes(
      "network"
    )
  ) {

    return "network_error";

  }


  return "provider_error";

}


/* ==========================================
   CREATE + REGISTER
========================================== */

const provider =
  new SofaScoreProvider();


registerProvider(
  provider
);


export default provider;
