// ==========================================================
// Y.C.B BSD PROVIDER 3.3.0
// ==========================================================
// BSD = Bzzoiro Sports Data
//
// الهدف:
// - البحث عن الفريق مباشرة عبر BSD
// - جلب Fixtures الفريق
// - جلب Events الفريق
// - البحث عن المباراة المطلوبة
// - جمع آخر 15 مباراة لكل فريق
// - جمع المباراة القادمة
// - التعامل مع pagination
// - عدم تعطيل المصدر بسبب غياب BSD_API_URL
//
// المطلوب فقط:
// BSD_API_KEY
//
// Authentication:
// Authorization: Token YOUR_API_KEY
//
// Base:
// https://sports.bzzoiro.com/api/v2
// ==========================================================

import {
  registerProvider
} from "./providers.js";


// ==========================================================
// CONFIG
// ==========================================================

const PROVIDER_VERSION =
  "3.3.0";

const API =
  "https://sports.bzzoiro.com/api/v2";

const REQUEST_TIMEOUT_MS =
  12000;

const PAGE_LIMIT =
  200;

const MAX_PAGES =
  5;

const MAX_RECENT_MATCHES =
  15;

const GLOBAL_BACK_DAYS =
  60;

const GLOBAL_FORWARD_DAYS =
  120;


// ==========================================================
// CACHE
// ==========================================================

const TEAM_CACHE =
  new Map();

const FIXTURE_CACHE =
  new Map();


// ==========================================================
// PROVIDER
// ==========================================================

const provider = {

  name:
    "BSD",

  version:
    PROVIDER_VERSION,

  description:
    "Bzzoiro Sports Data football provider",

  enabled:
    true,


  async getMatchData(
    home,
    away,
    env = {}
  ) {

    const startedAt =
      Date.now();


    const homeName =
      cleanInput(home);

    const awayName =
      cleanInput(away);


    if (
      !homeName ||
      !awayName
    ) {

      return {

        status:
          "invalid_input",

        message:
          "BSD: أسماء الفرق غير صالحة.",

        data:
          null

      };

    }


    const apiKey =
      String(
        env?.BSD_API_KEY ||
        ""
      ).trim();


    // ------------------------------------------------------
    // KEY CHECK
    // ------------------------------------------------------

    if (
      !apiKey
    ) {

      return {

        status:
          "disabled",

        message:
          "BSD_API_KEY غير مضبوط.",

        data: {

          source:
            "bsd",

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

          diagnostics: {

            reason:
              "missing_api_key"

          }

        }

      };

    }


    try {

      // ----------------------------------------------------
      // 1. FIND HOME TEAM
      // ----------------------------------------------------

      const homeTeam =
        await findTeam(
          homeName,
          apiKey,
          env
        );


      // ----------------------------------------------------
      // 2. FIND AWAY TEAM
      // ----------------------------------------------------

      const awayTeam =
        await findTeam(
          awayName,
          apiKey,
          env
        );


      // ----------------------------------------------------
      // 3. COLLECT TEAM EVENTS
      // ----------------------------------------------------

      const homeEvents =
        homeTeam
          ? await collectTeamEvents(
              homeTeam,
              apiKey,
              env
            )
          : [];


      const awayEvents =
        awayTeam
          ? await collectTeamEvents(
              awayTeam,
              apiKey,
              env
            )
          : [];


      // ----------------------------------------------------
      // 4. COMBINE EVENTS
      // ----------------------------------------------------

      let allEvents =
        dedupeEvents([
          ...homeEvents,
          ...awayEvents
        ]);


      // ----------------------------------------------------
      // 5. FIND EXACT FIXTURE
      // ----------------------------------------------------

      let fixture =
        findMatchingEvent(
          allEvents,
          homeName,
          awayName
        );


      // ----------------------------------------------------
      // 6. GLOBAL EVENT FALLBACK
      // ----------------------------------------------------
      //
      // إذا لم نجد المباراة عبر الفريقين،
      // نستخدم Events API حسب التاريخ.
      //
      // هذا مهم جدًا للمباريات الجديدة أو البطولات
      // التي لا تكون مرتبطة بشكل متوقع بصفحة الفريق.
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        const globalEvents =
          await collectGlobalEvents(
            apiKey,
            env
          );


        allEvents =
          dedupeEvents([
            ...allEvents,
            ...globalEvents
          ]);


        fixture =
          findMatchingEvent(
            allEvents,
            homeName,
            awayName
          );

      }


      // ----------------------------------------------------
      // 7. BUILD HISTORY
      // ----------------------------------------------------

      const homeRecent =
        buildRecentMatchesForTeam(
          homeName,
          allEvents
        );


      const awayRecent =
        buildRecentMatchesForTeam(
          awayName,
          allEvents
        );


      // ----------------------------------------------------
      // 8. IF WE HAVE FIXTURE
      // ----------------------------------------------------

      if (
        fixture
      ) {

        const normalizedFixture =
          normalizeEvent(
            fixture
          );


        return {

          status:
            "success",

          message:
            "تم التحقق من المباراة وجمع بيانات BSD.",

          data: {

            source:
              "bsd",

            available:
              true,

            matchFound:
              true,

            fixture:
              normalizedFixture,

            recentMatches: {

              home:
                homeRecent,

              away:
                awayRecent

            },

            historyAvailable:
              homeRecent.length > 0 ||
              awayRecent.length > 0,

            diagnostics: {

              homeTeamFound:
                Boolean(
                  homeTeam
                ),

              awayTeamFound:
                Boolean(
                  awayTeam
                ),

              homeTeamId:
                homeTeam?.id ||
                null,

              awayTeamId:
                awayTeam?.id ||
                null,

              eventsCollected:
                allEvents.length,

              homeHistory:
                homeRecent.length,

              awayHistory:
                awayRecent.length,

              durationMs:
                Date.now() -
                startedAt

            }

          }

        };

      }


      // ----------------------------------------------------
      // 9. HISTORY WITHOUT FIXTURE
      // ----------------------------------------------------

      if (
        homeRecent.length > 0 ||
        awayRecent.length > 0
      ) {

        return {

          status:
            "partial_success",

          message:
            "تم جمع بيانات BSD التاريخية، لكن لم يتم العثور على المباراة المطلوبة.",

          data: {

            source:
              "bsd",

            available:
              true,

            matchFound:
              false,

            fixture:
              null,

            recentMatches: {

              home:
                homeRecent,

              away:
                awayRecent

            },

            historyAvailable:
              true,

            diagnostics: {

              homeTeamFound:
                Boolean(
                  homeTeam
                ),

              awayTeamFound:
                Boolean(
                  awayTeam
                ),

              homeTeamId:
                homeTeam?.id ||
                null,

              awayTeamId:
                awayTeam?.id ||
                null,

              eventsCollected:
                allEvents.length,

              homeHistory:
                homeRecent.length,

              awayHistory:
                awayRecent.length,

              durationMs:
                Date.now() -
                startedAt

            }

          }

        };

      }


      // ----------------------------------------------------
      // 10. NO DATA
      // ----------------------------------------------------

      return {

        status:
          "api_ok_no_match",

        message:
          "BSD متصل، لكن لم يتم العثور على المباراة أو تاريخ كافٍ للفريقين.",

        data: {

          source:
            "bsd",

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

          diagnostics: {

            homeTeamFound:
              Boolean(
                homeTeam
              ),

            awayTeamFound:
              Boolean(
                awayTeam
              ),

            eventsCollected:
              allEvents.length,

            durationMs:
              Date.now() -
              startedAt

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
          `BSD: ${
            error?.message ||
            String(error)
          }`,

        data:
          null

      };

    }

  }

};


// ==========================================================
// FIND TEAM
// ==========================================================

async function findTeam(
  wantedName,
  apiKey,
  env
) {

  const normalizedWanted =
    normalizeName(
      wantedName
    );


  if (
    TEAM_CACHE.has(
      normalizedWanted
    )
  ) {

    return TEAM_CACHE.get(
      normalizedWanted
    );

  }


  const encoded =
    encodeURIComponent(
      wantedName
    );


  const url =
    `${API}/teams/?search=${encoded}&limit=${PAGE_LIMIT}&offset=0`;


  const data =
    await fetchJSON(
      url,
      apiKey,
      env
    );


  const teams =
    extractResults(
      data
    );


  if (
    !teams.length
  ) {

    TEAM_CACHE.set(
      normalizedWanted,
      null
    );


    return null;

  }


  const candidates =
    teams

      .map(
        team => ({

          team:
            normalizeTeam(
              team
            ),

          score:
            teamNameScore(
              team,
              wantedName
            )

        })
      )

      .filter(
        item =>
          item.team &&
          item.score >= 55
      )

      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );


  const result =
    candidates.length
      ? candidates[0].team
      : null;


  TEAM_CACHE.set(
    normalizedWanted,
    result
  );


  return result;

}


// ==========================================================
// COLLECT TEAM EVENTS
// ==========================================================

async function collectTeamEvents(
  team,
  apiKey,
  env
) {

  if (
    !team?.id
  ) {

    return [];

  }


  const teamId =
    String(
      team.id
    );


  const cacheKey =
    `team:${teamId}`;


  if (
    FIXTURE_CACHE.has(
      cacheKey
    )
  ) {

    return FIXTURE_CACHE.get(
      cacheKey
    );

  }


  const urls = [

    //
    // Primary:
    //

    `${API}/teams/${encodeURIComponent(
      teamId
    )}/fixtures/?limit=${PAGE_LIMIT}&offset=0`,

    //
    // Team events fallback:
    //

    `${API}/events/?team_id=${encodeURIComponent(
      teamId
    )}&limit=${PAGE_LIMIT}&offset=0`

  ];


  const all =
    [];


  for (
    const url
      of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url,
          apiKey,
          env
        );


      const items =
        extractResults(
          data
        );


      if (
        items.length
      ) {

        all.push(
          ...items
        );

      }


      //
      // If primary endpoint gives enough
      // information, continue to next fallback
      // only for deduplication.
      //

    } catch (
      error
    ) {

      //
      // 404 on one endpoint should not kill
      // the provider.
      //

      if (
        isFatalAuthError(
          error
        )
      ) {

        throw error;

      }

    }

  }


  const result =
    dedupeEvents(
      all
    );


  FIXTURE_CACHE.set(
    cacheKey,
    result
  );


  return result;

}


// ==========================================================
// GLOBAL EVENTS
// ==========================================================

async function collectGlobalEvents(
  apiKey,
  env
) {

  const now =
    new Date();


  const from =
    new Date(
      now.getTime() -
      GLOBAL_BACK_DAYS *
      86400000
    );


  const to =
    new Date(
      now.getTime() +
      GLOBAL_FORWARD_DAYS *
      86400000
    );


  const dateFrom =
    formatDate(
      from
    );


  const dateTo =
    formatDate(
      to
    );


  const urls = [

    `${API}/events/?date_from=${dateFrom}&date_to=${dateTo}&limit=${PAGE_LIMIT}&offset=0`

  ];


  const all =
    [];


  for (
    const url
      of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url,
          apiKey,
          env
        );


      all.push(
        ...extractResults(
          data
        )
      );

    } catch (
      error
    ) {

      if (
        isFatalAuthError(
          error
        )
      ) {

        throw error;

      }

    }

  }


  return dedupeEvents(
    all
  );

}


// ==========================================================
// FIND MATCHING EVENT
// ==========================================================

function findMatchingEvent(
  events,
  home,
  away
) {

  const candidates =
    Array.isArray(
      events
    )
      ? events
      : [];


  // --------------------------------------------------------
  // EXACT HOME/AWAY
  // --------------------------------------------------------

  let match =
    candidates.find(
      event => {

        const pair =
          getEventTeams(
            event
          );


        return (

          namesMatch(
            pair.home,
            home
          ) &&

          namesMatch(
            pair.away,
            away
          )

        );

      }
    );


  if (
    match
  ) {

    return match;

  }


  // --------------------------------------------------------
  // REVERSED SEARCH
  // --------------------------------------------------------
  //
  // BSD event should normally preserve home/away.
  // We DO NOT return a reversed event as the requested
  // fixture because that would corrupt the prediction.
  //
  // Therefore only exact orientation is accepted here.
  // --------------------------------------------------------

  return null;

}


// ==========================================================
// BUILD RECENT MATCHES
// ==========================================================

function buildRecentMatchesForTeam(
  teamName,
  events
) {

  const normalized =
    normalizeName(
      teamName
    );


  const matches =
    events

      .filter(
        event => {

          const pair =
            getEventTeams(
              event
            );


          return (

            namesMatch(
              pair.home,
              normalized
            ) ||

            namesMatch(
              pair.away,
              normalized
            )

          );

        }
      )

      .filter(
        event =>
          isFinishedEvent(
            event
          )
      )

      .sort(
        (
          a,
          b
        ) =>
          eventTimestamp(
            b
          ) -
          eventTimestamp(
            a
          )
      )

      .slice(
        0,
        MAX_RECENT_MATCHES
      )

      .map(
        normalizeEvent
      );


  return dedupeNormalizedMatches(
    matches
  );

}


// ==========================================================
// GET EVENT TEAMS
// ==========================================================

function getEventTeams(
  event
) {

  const home =
    getTeamFromEvent(
      event,
      "home"
    );


  const away =
    getTeamFromEvent(
      event,
      "away"
    );


  //
  // Common BSD fields:
  //

  const homeName =
    home?.name ||

    event?.home_team?.name ||

    event?.homeTeam?.name ||

    event?.home_team_name ||

    event?.strHomeTeam ||

    null;


  const awayName =
    away?.name ||

    event?.away_team?.name ||

    event?.awayTeam?.name ||

    event?.away_team_name ||

    event?.strAwayTeam ||

    null;


  return {

    home:
      homeName,

    away:
      awayName

  };

}


// ==========================================================
// GET TEAM OBJECT
// ==========================================================

function getTeamFromEvent(
  event,
  side
) {

  if (
    side ===
    "home"
  ) {

    return (

      event?.home_team_obj ||

      event?.homeTeam ||

      event?.home_team ||

      null

    );

  }


  return (

    event?.away_team_obj ||

    event?.awayTeam ||

    event?.away_team ||

    null

  );

}


// ==========================================================
// NORMALIZE EVENT
// ==========================================================

function normalizeEvent(
  event
) {

  const pair =
    getEventTeams(
      event
    );


  const homeObject =
    getTeamFromEvent(
      event,
      "home"
    );


  const awayObject =
    getTeamFromEvent(
      event,
      "away"
    );


  const homeScore =
    extractScore(
      event,
      "home"
    );


  const awayScore =
    extractScore(
      event,
      "away"
    );


  const date =
    getEventDate(
      event
    );


  const status =
    normalizeStatus(
      event
    );


  const finished =
    isFinishedEvent(
      event
    );


  return {

    id:
      String(
        event?.id ??
        event?.event_id ??
        event?.match_id ??
        ""
      ),


    utcDate:
      date,


    status:
      finished
        ? "FINISHED"
        : status,


    homeTeam: {

      id:
        homeObject?.id != null
          ? String(
              homeObject.id
            )
          : null,

      name:
        pair.home,

      shortName:
        homeObject?.short_name ||
        homeObject?.shortName ||
        null

    },


    awayTeam: {

      id:
        awayObject?.id != null
          ? String(
              awayObject.id
            )
          : null,

      name:
        pair.away,

      shortName:
        awayObject?.short_name ||
        awayObject?.shortName ||
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

      event?.league_name ||

      event?.competition?.name ||

      event?.competition_name ||

      event?.tournament?.name ||

      event?.strLeague ||

      null

  };

}


// ==========================================================
// SCORE EXTRACTION
// ==========================================================

function extractScore(
  event,
  side
) {

  const sideObject =
    side === "home"
      ? getTeamFromEvent(
          event,
          "home"
        )
      : getTeamFromEvent(
          event,
          "away"
        );


  const candidates =
    side === "home"

      ? [

          event?.home_score,

          event?.homeScore,

          event?.score?.home,

          event?.scores?.home,

          event?.home_team_score,

          sideObject?.score,

          sideObject?.goals,

          event?.intHomeScore

        ]

      : [

          event?.away_score,

          event?.awayScore,

          event?.score?.away,

          event?.scores?.away,

          event?.away_team_score,

          sideObject?.score,

          sideObject?.goals,

          event?.intAwayScore

        ];


  for (
    const value
      of candidates
  ) {

    const number =
      finiteOrNull(
        value
      );


    if (
      number !== null
    ) {

      return number;

    }

  }


  return null;

}


// ==========================================================
// EVENT DATE
// ==========================================================

function getEventDate(
  event
) {

  const value =

    event?.date ||

    event?.datetime ||

    event?.start_time ||

    event?.start_datetime ||

    event?.dateEvent ||

    event?.utcDate ||

    null;


  if (
    !value
  ) {

    return null;

  }


  const date =
    new Date(
      value
    );


  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {

    return null;

  }


  return date.toISOString();

}


// ==========================================================
// STATUS
// ==========================================================

function normalizeStatus(
  event
) {

  const raw =
    String(

      event?.status ||

      event?.match_status ||

      event?.state ||

      event?.strStatus ||

      ""

    )
      .toLowerCase()
      .trim();


  if (
    raw.includes(
      "finish"
    ) ||

    raw ===
      "ft" ||

    raw ===
      "ended"
  ) {

    return "FINISHED";

  }


  if (
    raw.includes(
      "live"
    ) ||

    raw.includes(
      "progress"
    )
  ) {

    return "LIVE";

  }


  if (
    raw.includes(
      "cancel"
    )
  ) {

    return "CANCELLED";

  }


  if (
    raw.includes(
      "postpon"
    )
  ) {

    return "POSTPONED";

  }


  return "SCHEDULED";

}


// ==========================================================
// FINISHED EVENT
// ==========================================================

function isFinishedEvent(
  event
) {

  const raw =
    String(

      event?.status ||

      event?.match_status ||

      event?.state ||

      event?.strStatus ||

      ""

    )
      .toLowerCase()
      .trim();


  if (
    [
      "finished",
      "ft",
      "ended",
      "completed",
      "final"
    ].some(
      value =>
        raw.includes(
          value
        )
    )
  ) {

    return true;

  }


  const home =
    extractScore(
      event,
      "home"
    );


  const away =
    extractScore(
      event,
      "away"
    );


  //
  // Do not consider a score alone enough for
  // an upcoming match. We only use it as fallback
  // when the event has no explicit status.
  //

  if (
    !raw &&
    home !== null &&
    away !== null
  ) {

    const date =
      getEventDate(
        event
      );


    if (
      date &&
      Date.parse(
        date
      ) <
      Date.now()
    ) {

      return true;

    }

  }


  return false;

}


// ==========================================================
// EXTRACT RESULTS
// ==========================================================

function extractResults(
  data
) {

  if (
    !data
  ) {

    return [];

  }


  if (
    Array.isArray(
      data.results
    )
  ) {

    return data.results;

  }


  if (
    Array.isArray(
      data.events
    )
  ) {

    return data.events;

  }


  if (
    Array.isArray(
      data.matches
    )
  ) {

    return data.matches;

  }


  if (
    Array.isArray(
      data.data
    )
  ) {

    return data.data;

  }


  //
  // Some APIs return a single event object.
  //

  if (
    data.id ||
    data.event_id ||
    data.match_id
  ) {

    return [
      data
    ];

  }


  return [];

}


// ==========================================================
// PAGINATION
// ==========================================================
//
// BSD uses limit/offset pagination. The docs state that
// list endpoints return results plus next/previous.
// We still use a conservative page limit to avoid excessive
// requests inside Cloudflare Workers.
// ==========================================================

async function getAllPages(
  baseUrl,
  apiKey,
  env
) {

  const output =
    [];


  let offset =
    0;


  for (
    let page = 0;
    page < MAX_PAGES;
    page++
  ) {

    const separator =
      baseUrl.includes(
        "?"
      )
        ? "&"
        : "?";


    const url =
      `${baseUrl}${separator}` +
      `limit=${PAGE_LIMIT}&offset=${offset}`;


    const data =
      await fetchJSON(
        url,
        apiKey,
        env
      );


    const items =
      extractResults(
        data
      );


    output.push(
      ...items
    );


    //
    // No more pages.
    //

    if (
      !items.length
    ) {

      break;

    }


    //
    // BSD returns next=null at last page.
    //

    if (
      data?.next === null ||
      data?.next === undefined
    ) {

      //
      // If count is known and we've not reached it,
      // continue. Otherwise stop.
      //

      const count =
        Number(
          data?.count
        );


      if (
        !Number.isFinite(
          count
        ) ||
        output.length >=
        count
      ) {

        break;

      }

    }


    offset +=
      PAGE_LIMIT;

  }


  return output;

}


// ==========================================================
// FETCH JSON
// ==========================================================

async function fetchJSON(
  url,
  apiKey,
  env = {}
) {

  const controller =
    new AbortController();


  const timeout =
    Number(
      env?.YCB_BSD_TIMEOUT_MS
    ) ||
    REQUEST_TIMEOUT_MS;


  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );


  try {

    const response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            Accept:
              "application/json",

            Authorization:
              `Token ${apiKey}`,

            "User-Agent":
              `YCB-Football-Prediction-Engine/${PROVIDER_VERSION}`

          },

          signal:
            controller.signal

        }
      );


    const text =
      await response.text();


    let data =
      null;


    if (
      text
    ) {

      try {

        data =
          JSON.parse(
            text
          );

      } catch {

        throw new Error(
          `BSD invalid JSON (${response.status})`
        );

      }

    }


    if (
      !response.ok
    ) {

      const detail =
        data?.detail ||
        data?.error ||
        data?.message ||
        "";


      throw new Error(

        `BSD HTTP ${response.status}` +

        (
          detail
            ? `: ${detail}`
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
        "BSD request timeout"
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timer
    );

  }

}


// ==========================================================
// NORMALIZE TEAM
// ==========================================================

function normalizeTeam(
  team
) {

  if (
    !team ||
    typeof team !==
      "object"
  ) {

    return null;

  }


  const id =
    team.id ??
    team.team_id ??
    team.pk ??
    null;


  const name =
    team.name ||

    team.team_name ||

    team.display_name ||

    team.displayName ||

    team.strTeam ||

    null;


  if (
    id === null ||
    !name
  ) {

    return null;

  }


  return {

    id:
      String(
        id
      ),

    name:
      String(
        name
      ),

    shortName:
      team.short_name ||

      team.shortName ||

      team.abbreviation ||

      null,

    country:
      team.country ||

      team.country_name ||

      null

  };

}


// ==========================================================
// TEAM NAME SCORE
// ==========================================================

function teamNameScore(
  team,
  wanted
) {

  const candidate =
    normalizeName(
      team?.name ||
      team?.team_name ||
      team?.display_name ||
      ""
    );


  const target =
    normalizeName(
      wanted
    );


  if (
    !candidate ||
    !target
  ) {

    return 0;

  }


  if (
    candidate ===
    target
  ) {

    return 100;

  }


  if (
    candidate.includes(
      target
    ) ||
    target.includes(
      candidate
    )
  ) {

    return 90;

  }


  const a =
    new Set(
      candidate
        .split(
          " "
        )
        .filter(
          token =>
            token.length >=
            3
        )
    );


  const b =
    target
      .split(
        " "
      )
      .filter(
        token =>
          token.length >=
          3
      );


  if (
    !a.size ||
    !b.length
  ) {

    return 0;

  }


  let overlap =
    0;


  for (
    const token
      of b
  ) {

    if (
      a.has(
        token
      )
    ) {

      overlap++;

    }

  }


  if (
    overlap === 0
  ) {

    return 0;

  }


  return Math.min(
    85,
    45 +
    overlap *
    15
  );

}


// ==========================================================
// NORMALIZE NAME
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


// ==========================================================
// NAMES MATCH
// ==========================================================

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
    a.includes(
      b
    ) ||
    b.includes(
      a
    )
  ) {

    return true;

  }


  const aliases = {

    "sporting lisbon":
      [
        "sporting cp",
        "sporting"
      ],

    "inter milan":
      [
        "internazionale",
        "inter"
      ],

    "paris saint germain":
      [
        "psg",
        "paris sg"
      ],

    "psv eindhoven":
      [
        "psv"
      ],

    "manchester united":
      [
        "man united",
        "man utd"
      ],

    "manchester city":
      [
        "man city"
      ],

    "tottenham hotspur":
      [
        "tottenham"
      ],

    "newcastle united":
      [
        "newcastle"
      ],

    "atletico madrid":
      [
        "atletico"
      ],

    "athletic club":
      [
        "athletic bilbao"
      ],

    "red bull salzburg":
      [
        "rb salzburg",
        "salzburg"
      ],

    "psv":
      [
        "psv eindhoven"
      ]

  };


  if (
    aliases[a]
      ?.some(
        alias =>
          normalizeName(
            alias
          ) === b
      )
  ) {

    return true;

  }


  if (
    aliases[b]
      ?.some(
        alias =>
          normalizeName(
            alias
          ) === a
      )
  ) {

    return true;

  }


  const ta =
    new Set(
      a
        .split(
          " "
        )
        .filter(
          token =>
            token.length >=
            3
        )
    );


  const tb =
    b
      .split(
        " "
      )
      .filter(
        token =>
          token.length >=
          3
        )
    ;


  const overlap =
    tb.filter(
      token =>
        ta.has(
          token
        )
    ).length;


  return (
    overlap >=
    Math.min(
      2,
      tb.length
    )
  );

}


// ==========================================================
// DEDUPE EVENTS
// ==========================================================

function dedupeEvents(
  events
) {

  const seen =
    new Set();


  const output =
    [];


  for (
    const event
      of Array.isArray(
        events
      )
        ? events
        : []
  ) {

    if (
      !event
    ) {

      continue;

    }


    const pair =
      getEventTeams(
        event
      );


    const id =
      String(

        event.id ??

        event.event_id ??

        event.match_id ??

        ""

      ).trim();


    const key =
      id

        ? `id:${id}`

        : [

            getEventDate(
              event
            ) || "",

            normalizeName(
              pair.home
            ),

            normalizeName(
              pair.away
            )

          ].join(
            "|"
          );


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    output.push(
      event
    );

  }


  return output;

}


// ==========================================================
// DEDUPE NORMALIZED MATCHES
// ==========================================================

function dedupeNormalizedMatches(
  matches
) {

  const seen =
    new Set();


  return (
    Array.isArray(
      matches
    )
      ? matches
      : []
  )
    .filter(
      match => {

        const key =
          String(

            match?.id ||

            [

              match?.utcDate,

              normalizeName(
                match?.homeTeam?.name
              ),

              normalizeName(
                match?.awayTeam?.name
              )

            ].join(
              "|"
            )

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


// ==========================================================
// EVENT TIMESTAMP
// ==========================================================

function eventTimestamp(
  event
) {

  const date =
    getEventDate(
      event
    );


  const value =
    date
      ? Date.parse(
          date
        )
      : 0;


  return Number.isFinite(
    value
  )
    ? value
    : 0;

}


// ==========================================================
// FINITE NUMBER
// ==========================================================

function finiteOrNull(
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


// ==========================================================
// FORMAT DATE
// ==========================================================

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


// ==========================================================
// CLEAN INPUT
// ==========================================================

function cleanInput(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


// ==========================================================
// FATAL AUTH ERROR
// ==========================================================

function isFatalAuthError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    );


  return (

    message.includes(
      "BSD HTTP 401"
    ) ||

    message.includes(
      "BSD HTTP 402"
    )

  );

}


// ==========================================================
// ERROR CLASSIFICATION
// ==========================================================

function classifyError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "timeout"
    )
  ) {

    return "timeout";

  }


  if (
    message.includes(
      "http 401"
    )
  ) {

    return "http_401";

  }


  if (
    message.includes(
      "http 402"
    )
  ) {

    return "http_402";

  }


  if (
    message.includes(
      "http 403"
    )
  ) {

    return "http_403";

  }


  if (
    message.includes(
      "http 404"
    )
  ) {

    return "http_404";

  }


  if (
    message.includes(
      "http 429"
    )
  ) {

    return "rate_limited";

  }


  return "network_error";

}


// ==========================================================
// REGISTER
// ==========================================================

registerProvider(
  provider
);


// ==========================================================
// EXPORT
// ==========================================================

export {
  provider,
  findTeam,
  normalizeEvent,
  namesMatch
};

export default provider;
