// ==========================================================
// Y.C.B BSD PROVIDER 3.1.0
// ==========================================================
//
// BSD = Bzzoiro Sports Data
//
// Corrected for BSD Football API v2
//
// API:
//   https://sports.bzzoiro.com/api/v2
//
// AUTH:
//   Authorization: Token YOUR_API_KEY
//
// Required ENV:
//   BSD_API_KEY
//
// Main endpoints used:
//   GET /teams/?search=TEAM
//   GET /teams/{id}/
//   GET /teams/{id}/fixtures/
//   GET /events/?team_id={id}
//   GET /events/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
//
// ==========================================================


import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================================
// CONFIG
// ==========================================================

const API =
  "https://sports.bzzoiro.com/api/v2";

const PROVIDER_VERSION =
  "3.1.0";

const PAGE_LIMIT =
  200;

const MAX_PAGES =
  5;

const MAX_RECENT_MATCHES =
  15;


// ==========================================================
// PROVIDER
// ==========================================================

class BSDProvider extends DataProvider {

  constructor() {

    super("BSD");

  }


  // ========================================================
  // GET MATCH DATA
  // ========================================================

  async getMatchData(
    home,
    away,
    env
  ) {

    const startedAt =
      Date.now();


    const homeName =
      cleanString(home);

    const awayName =
      cleanString(away);


    if (
      !homeName ||
      !awayName
    ) {

      return buildResponse(
        "configuration_error",
        "اسم الفريق المضيف أو الضيف مفقود.",
        startedAt,
        emptyData()
      );

    }


    const apiKey =
      getApiKey(env);


    if (!apiKey) {

      return buildResponse(
        "configuration_error",
        "BSD_API_KEY غير موجود في Environment Variables.",
        startedAt,
        emptyData()
      );

    }


    try {

      // ----------------------------------------------------
      // 1. Find both teams
      // ----------------------------------------------------

      const [
        homeResult,
        awayResult
      ] =
        await Promise.all([

          findTeam(
            homeName,
            apiKey
          ),

          findTeam(
            awayName,
            apiKey
          )

        ]);


      const homeTeam =
        homeResult.team;

      const awayTeam =
        awayResult.team;


      // ----------------------------------------------------
      // 2. Collect events from both teams
      // ----------------------------------------------------

      const homeEventsResult =
        homeTeam?.id

          ? await collectTeamEvents(
              homeTeam.id,
              apiKey
            )

          : {
              events: [],
              errors: []
            };


      const awayEventsResult =
        awayTeam?.id

          ? await collectTeamEvents(
              awayTeam.id,
              apiKey
            )

          : {
              events: [],
              errors: []
            };


      // ----------------------------------------------------
      // 3. Merge events
      // ----------------------------------------------------

      let allEvents =
        dedupeEvents([
          ...homeEventsResult.events,
          ...awayEventsResult.events
        ]);


      // ----------------------------------------------------
      // 4. Find requested fixture
      // ----------------------------------------------------

      let fixture =
        findMatchingEvent(
          allEvents,
          homeName,
          awayName,
          homeTeam,
          awayTeam
        );


      // ----------------------------------------------------
      // 5. Global date fallback
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        const globalResult =
          await collectGlobalEvents(
            apiKey
          );


        allEvents =
          dedupeEvents([
            ...allEvents,
            ...globalResult.events
          ]);


        fixture =
          findMatchingEvent(
            allEvents,
            homeName,
            awayName,
            homeTeam,
            awayTeam
          );

      }


      // ----------------------------------------------------
      // 6. Normalize recent history
      // ----------------------------------------------------

      const homeHistory =
        normalizeRecentMatches(
          allEvents,
          homeName,
          homeTeam
        );


      const awayHistory =
        normalizeRecentMatches(
          allEvents,
          awayName,
          awayTeam
        );


      const historyAvailable =
        homeHistory.length > 0 ||
        awayHistory.length > 0;


      // ----------------------------------------------------
      // 7. Diagnostics
      // ----------------------------------------------------

      const diagnostics = {

        homeTeamFound:
          Boolean(homeTeam),

        awayTeamFound:
          Boolean(awayTeam),

        homeTeamId:
          homeTeam?.id ||
          null,

        awayTeamId:
          awayTeam?.id ||
          null,

        homeTeamSearch:
          homeResult.diagnostics,

        awayTeamSearch:
          awayResult.diagnostics,

        eventsCollected:
          allEvents.length,

        homeEvents:
          homeEventsResult.events.length,

        awayEvents:
          awayEventsResult.events.length,

        homeErrors:
          homeEventsResult.errors,

        awayErrors:
          awayEventsResult.errors

      };


      // ----------------------------------------------------
      // 8. Nothing found
      // ----------------------------------------------------

      if (
        !fixture &&
        !historyAvailable
      ) {

        return buildResponse(
          "api_ok_no_match",
          "BSD متصل، لكن لم يتم العثور على المباراة أو بيانات تاريخية قابلة للاستخدام.",
          startedAt,
          {

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

            teams: {

              home:
                homeTeam
                  ? normalizeTeam(homeTeam)
                  : null,

              away:
                awayTeam
                  ? normalizeTeam(awayTeam)
                  : null

            },

            diagnostics

          }
        );

      }


      // ----------------------------------------------------
      // 9. Success
      // ----------------------------------------------------

      return buildResponse(
        fixture
          ? "success"
          : "partial_success",

        fixture

          ? "تم العثور على المباراة وبيانات BSD بنجاح."

          : "تم العثور على بيانات تاريخية عبر BSD، لكن لم يتم العثور على المباراة المطلوبة.",

        startedAt,
        {

          available:
            true,

          matchFound:
            Boolean(fixture),

          fixture:
            fixture
              ? normalizeEvent(fixture)
              : null,

          recentMatches: {

            home:
              homeHistory,

            away:
              awayHistory

          },

          historyAvailable,

          historyCount: {

            home:
              homeHistory.length,

            away:
              awayHistory.length

          },

          teams: {

            home:
              homeTeam
                ? normalizeTeam(homeTeam)
                : null,

            away:
              awayTeam
                ? normalizeTeam(awayTeam)
                : null

          },

          diagnostics

        }
      );

    } catch (
      error
    ) {

      return buildResponse(
        "network_error",
        error?.message ||
          String(error),
        startedAt,
        {

          ...emptyData(),

          diagnostics: {

            error:
              error?.message ||
              String(error)

          }

        }
      );

    }

  }

}


// ==========================================================
// API KEY
// ==========================================================

function getApiKey(
  env
) {

  return cleanString(

    env?.BSD_API_KEY ||

    env?.BSD_KEY ||

    env?.SPORTS_BSD_API_KEY ||

    ""

  );

}


// ==========================================================
// EMPTY DATA
// ==========================================================

function emptyData() {

  return {

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
      false,

    historyCount: {

      home:
        0,

      away:
        0

    }

  };

}


// ==========================================================
// BUILD RESPONSE
// ==========================================================

function buildResponse(
  status,
  message,
  startedAt,
  data
) {

  return {

    status,

    message,

    data: {

      source:
        "bsd",

      providerVersion:
        PROVIDER_VERSION,

      ...data,

      durationMs:
        Date.now() -
        startedAt

    }

  };

}


// ==========================================================
// FIND TEAM
// ==========================================================

async function findTeam(
  name,
  apiKey
) {

  const diagnostics = {

    requestedName:
      name,

    endpoint:
      null,

    candidates:
      0,

    error:
      null

  };


  const target =
    normalizeName(name);


  if (!target) {

    return {

      team:
        null,

      diagnostics

    };

  }


  const url =
    `${API}/teams/?search=` +

    encodeURIComponent(name) +

    `&limit=${PAGE_LIMIT}`;


  diagnostics.endpoint =
    url;


  try {

    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const teams =
      extractResults(data);


    diagnostics.candidates =
      teams.length;


    if (
      teams.length === 0
    ) {

      return {

        team:
          null,

        diagnostics

      };

    }


    // ------------------------------------------------------
    // Exact normalized match
    // ------------------------------------------------------

    const exact =
      teams.find(
        team =>

          normalizeName(
            teamName(team)
          ) === target

      );


    if (exact) {

      return {

        team:
          exact,

        diagnostics

      };

    }


    // ------------------------------------------------------
    // Strong match
    // ------------------------------------------------------

    const strong =
      teams.find(
        team =>

          strongNameMatch(
            teamName(team),
            name
          )

      );


    if (strong) {

      return {

        team:
          strong,

        diagnostics

      };

    }


    // ------------------------------------------------------
    // Normal match
    // ------------------------------------------------------

    const normal =
      teams.find(
        team =>

          namesMatch(
            teamName(team),
            name
          )

      );


    if (normal) {

      return {

        team:
          normal,

        diagnostics

      };

    }


    // Never blindly select first team.

    return {

      team:
        null,

      diagnostics

    };

  } catch (
    error
  ) {

    diagnostics.error =
      error?.message ||
      String(error);


    return {

      team:
        null,

      diagnostics

    };

  }

}


// ==========================================================
// COLLECT TEAM EVENTS
// ==========================================================

async function collectTeamEvents(
  teamId,
  apiKey
) {

  const events =
    [];

  const errors =
    [];


  // --------------------------------------------------------
  // Endpoint A
  // /teams/{id}/fixtures/
  // --------------------------------------------------------

  try {

    const fixtureEvents =
      await getAllPages(
        `${API}/teams/${encodeURIComponent(
          String(teamId)
        )}/fixtures/`,
        apiKey
      );


    events.push(
      ...fixtureEvents
    );

  } catch (
    error
  ) {

    errors.push({

      endpoint:
        "team_fixtures",

      error:
        error?.message ||
        String(error)

    });

  }


  // --------------------------------------------------------
  // Endpoint B
  // /events/?team_id={id}
  // --------------------------------------------------------

  try {

    const teamEvents =
      await getAllPages(

        `${API}/events/?team_id=` +

        encodeURIComponent(
          String(teamId)
        ),

        apiKey

      );


    events.push(
      ...teamEvents
    );

  } catch (
    error
  ) {

    errors.push({

      endpoint:
        "team_events",

      error:
        error?.message ||
        String(error)

    });

  }


  return {

    events:
      dedupeEvents(events),

    errors

  };

}


// ==========================================================
// COLLECT GLOBAL EVENTS
// ==========================================================

async function collectGlobalEvents(
  apiKey
) {

  const errors =
    [];

  const events =
    [];


  const now =
    new Date();


  const from =
    new Date(now);


  from.setDate(
    from.getDate() - 45
  );


  const to =
    new Date(now);


  to.setDate(
    to.getDate() + 90
  );


  const url =
    `${API}/events/?date_from=` +

    encodeURIComponent(
      formatDate(from)
    ) +

    `&date_to=` +

    encodeURIComponent(
      formatDate(to)
    );


  try {

    const results =
      await getAllPages(
        url,
        apiKey
      );


    events.push(
      ...results
    );

  } catch (
    error
  ) {

    errors.push(
      error?.message ||
      String(error)
    );

  }


  return {

    events:
      dedupeEvents(events),

    errors

  };

}


// ==========================================================
// PAGINATION
// ==========================================================

async function getAllPages(
  firstUrl,
  apiKey
) {

  const all =
    [];

  let url =
    firstUrl;

  let pages =
    0;


  while (
    url &&
    pages < MAX_PAGES
  ) {

    pages++;


    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const results =
      extractResults(data);


    all.push(
      ...results
    );


    // ------------------------------------------------------
    // BSD normally returns "next".
    // ------------------------------------------------------

    if (
      data?.next
    ) {

      url =
        data.next;

      continue;

    }


    // ------------------------------------------------------
    // If next is unavailable, stop.
    // ------------------------------------------------------

    break;

  }


  return all;

}


// ==========================================================
// FIND MATCHING EVENT
// ==========================================================

function findMatchingEvent(
  events,
  home,
  away,
  homeTeam,
  awayTeam
) {

  if (
    !Array.isArray(events) ||
    events.length === 0
  ) {

    return null;

  }


  const targetHome =
    normalizeName(home);


  const targetAway =
    normalizeName(away);


  const homeId =
    normalizeId(
      homeTeam?.id
    );


  const awayId =
    normalizeId(
      awayTeam?.id
    );


  // --------------------------------------------------------
  // 1. Exact team IDs
  // --------------------------------------------------------

  if (
    homeId &&
    awayId
  ) {

    const byId =
      events.find(
        event => {

          const eventHomeId =
            getEventTeamId(
              event,
              "home"
            );


          const eventAwayId =
            getEventTeamId(
              event,
              "away"
            );


          return (

            eventHomeId === homeId &&

            eventAwayId === awayId

          );

        }
      );


    if (byId) {

      return byId;

    }

  }


  // --------------------------------------------------------
  // 2. Exact names
  // --------------------------------------------------------

  const exact =
    events.find(
      event => {

        const eventHome =
          eventHomeName(event);


        const eventAway =
          eventAwayName(event);


        return (

          namesMatch(
            eventHome,
            targetHome
          ) &&

          namesMatch(
            eventAway,
            targetAway
          )

        );

      }
    );


  if (exact) {

    return exact;

  }


  // --------------------------------------------------------
  // 3. Strong names
  // --------------------------------------------------------

  const candidates =
    events.filter(
      event => {

        return (

          strongNameMatch(
            eventHomeName(event),
            targetHome
          ) &&

          strongNameMatch(
            eventAwayName(event),
            targetAway
          )

        );

      }
    );


  if (
    candidates.length === 1
  ) {

    return candidates[0];

  }


  return null;

}


// ==========================================================
// NORMALIZE RECENT MATCHES
// ==========================================================

function normalizeRecentMatches(
  events,
  requestedName,
  team
) {

  if (
    !Array.isArray(events)
  ) {

    return [];

  }


  const target =
    normalizeName(
      requestedName
    );


  const targetId =
    normalizeId(
      team?.id
    );


  const matches =
    events

      .filter(
        event =>
          hasValidScore(event)
      )

      .filter(
        event => {

          if (targetId) {

            const homeId =
              getEventTeamId(
                event,
                "home"
              );


            const awayId =
              getEventTeamId(
                event,
                "away"
              );


            if (
              homeId === targetId ||
              awayId === targetId
            ) {

              return true;

            }

          }


          return (

            namesMatch(
              eventHomeName(event),
              target
            ) ||

            namesMatch(
              eventAwayName(event),
              target
            )

          );

        }
      );


  matches.sort(
    (
      a,
      b
    ) => {

      const aTime =
        getEventDate(a)
          ? new Date(
              getEventDate(a)
            ).getTime()
          : 0;


      const bTime =
        getEventDate(b)
          ? new Date(
              getEventDate(b)
            ).getTime()
          : 0;


      return bTime - aTime;

    }
  );


  return matches

    .slice(
      0,
      MAX_RECENT_MATCHES
    )

    .map(
      normalizeEvent
    )

    .filter(
      Boolean
    );

}


// ==========================================================
// EXTRACT RESULTS
// ==========================================================

function extractResults(
  data
) {

  if (!data) {

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


  if (
    Array.isArray(data)
  ) {

    return data;

  }


  return [];

}


// ==========================================================
// FETCH JSON
// ==========================================================

async function fetchJSON(
  url,
  apiKey
) {

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
        ? JSON.parse(text)
        : null;

  } catch {

    throw new Error(
      "BSD returned invalid JSON."
    );

  }


  if (
    !response.ok
  ) {

    if (
      response.status === 401
    ) {

      throw new Error(
        "BSD HTTP 401 — API key مفقود أو غير صالح."
      );

    }


    if (
      response.status === 402
    ) {

      throw new Error(
        "BSD HTTP 402 — هذا المورد يحتاج إلى إضافة مدفوعة."
      );

    }


    if (
      response.status === 403
    ) {

      throw new Error(
        "BSD HTTP 403 — الوصول إلى المورد مرفوض."
      );

    }


    if (
      response.status === 404
    ) {

      throw new Error(
        `BSD HTTP 404 — المسار غير موجود: ${url}`
      );

    }


    if (
      response.status === 429
    ) {

      throw new Error(
        "BSD HTTP 429 — تم تجاوز حد الطلبات."
      );

    }


    const detail =
      extractApiError(data);


    throw new Error(
      detail
        ? `BSD HTTP ${response.status} — ${detail}`
        : `BSD HTTP ${response.status}`
    );

  }


  return data;

}


// ==========================================================
// API ERROR
// ==========================================================

function extractApiError(
  data
) {

  if (!data) {

    return "";

  }


  if (
    typeof data.detail === "string"
  ) {

    return data.detail;

  }


  if (
    typeof data.message === "string"
  ) {

    return data.message;

  }


  if (
    typeof data.error === "string"
  ) {

    return data.error;

  }


  return "";

}


// ==========================================================
// NORMALIZE EVENT
// ==========================================================

function normalizeEvent(
  event
) {

  if (!event) {

    return null;

  }


  const homeScore =
    scoreValue(
      event,
      "home"
    );


  const awayScore =
    scoreValue(
      event,
      "away"
    );


  const status =
    normalizeStatus(
      event?.status ||
      event?.match_status
    );


  return {

    id:
      normalizeId(
        event?.id ||
        event?.event_id ||
        event?.fixture_id ||
        event?.match_id
      ),

    utcDate:
      getEventDate(event),

    status:
      status,

    homeTeam: {

      id:
        getEventTeamId(
          event,
          "home"
        ),

      name:
        eventHomeName(event) ||
        null,

      shortName:
        getEventShortName(
          event,
          "home"
        ) ||
        eventHomeName(event) ||
        null

    },

    awayTeam: {

      id:
        getEventTeamId(
          event,
          "away"
        ),

      name:
        eventAwayName(event) ||
        null,

      shortName:
        getEventShortName(
          event,
          "away"
        ) ||
        eventAwayName(event) ||
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

      null

  };

}


// ==========================================================
// NORMALIZE TEAM
// ==========================================================

function normalizeTeam(
  team
) {

  return {

    id:
      normalizeId(
        team?.id ||
        team?.team_id
      ),

    name:
      teamName(team) ||
      null

  };

}


// ==========================================================
// EVENT TEAM OBJECT
// ==========================================================

function getEventTeamObject(
  event,
  side
) {

  if (
    side === "home"
  ) {

    return (

      event?.home_team ||

      event?.homeTeam ||

      event?.home ||

      {}

    );

  }


  return (

    event?.away_team ||

    event?.awayTeam ||

    event?.away ||

    {}

  );

}


// ==========================================================
// EVENT TEAM ID
// ==========================================================

function getEventTeamId(
  event,
  side
) {

  const team =
    getEventTeamObject(
      event,
      side
    );


  const value =

    team?.id ||

    team?.team_id ||

    (
      side === "home"

        ? event?.home_team_id ||
          event?.homeTeamId ||
          event?.home_id

        : event?.away_team_id ||
          event?.awayTeamId ||
          event?.away_id
    );


  return normalizeId(value);

}


// ==========================================================
// EVENT TEAM NAME
// ==========================================================

function eventHomeName(
  event
) {

  const team =
    getEventTeamObject(
      event,
      "home"
    );


  return (

    team?.name ||

    team?.short_name ||

    team?.shortName ||

    team?.team_name ||

    team?.display_name ||

    team?.title ||

    event?.home_team_name ||

    event?.home_name ||

    ""

  );

}


function eventAwayName(
  event
) {

  const team =
    getEventTeamObject(
      event,
      "away"
    );


  return (

    team?.name ||

    team?.short_name ||

    team?.shortName ||

    team?.team_name ||

    team?.display_name ||

    team?.title ||

    event?.away_team_name ||

    event?.away_name ||

    ""

  );

}


// ==========================================================
// SHORT TEAM NAME
// ==========================================================

function getEventShortName(
  event,
  side
) {

  const team =
    getEventTeamObject(
      event,
      side
    );


  return (

    team?.short_name ||

    team?.shortName ||

    team?.short ||

    team?.abbr ||

    team?.abbreviation ||

    ""

  );

}


// ==========================================================
// TEAM NAME
// ==========================================================

function teamName(
  team
) {

  return (

    team?.name ||

    team?.short_name ||

    team?.shortName ||

    team?.team_name ||

    team?.display_name ||

    team?.title ||

    ""

  );

}


// ==========================================================
// SCORE VALUE
// ==========================================================

function scoreValue(
  event,
  side
) {

  const values =

    side === "home"

      ? [

          event?.home_score,

          event?.homeScore,

          event?.score?.home,

          event?.scores?.home,

          event?.home?.score,

          event?.home_team_score,

          event?.result?.home,

          event?.result?.home_score

        ]

      : [

          event?.away_score,

          event?.awayScore,

          event?.score?.away,

          event?.scores?.away,

          event?.away?.score,

          event?.away_team_score,

          event?.result?.away,

          event?.result?.away_score

        ];


  for (
    const value of values
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      continue;

    }


    const number =
      Number(value);


    if (
      Number.isFinite(number)
    ) {

      return number;

    }

  }


  return null;

}


// ==========================================================
// VALID SCORE
// ==========================================================

function hasValidScore(
  event
) {

  return (

    scoreValue(
      event,
      "home"
    ) !== null &&

    scoreValue(
      event,
      "away"
    ) !== null

  );

}


// ==========================================================
// EVENT DATE
// ==========================================================

function getEventDate(
  event
) {

  const value =

    event?.date ||

    event?.utc_date ||

    event?.utcDate ||

    event?.start_time ||

    event?.startTime ||

    event?.kickoff ||

    event?.datetime ||

    event?.scheduled_at ||

    event?.scheduledAt ||

    null;


  if (!value) {

    return null;

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
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
  status
) {

  const value =
    String(
      status || ""
    )
      .toLowerCase()
      .trim();


  if (
    value === "finished" ||
    value === "completed" ||
    value === "ft"
  ) {

    return "FINISHED";

  }


  if (
    value === "live" ||
    value === "inplay" ||
    value === "in_progress"
  ) {

    return "LIVE";

  }


  if (
    value === "cancelled" ||
    value === "canceled"
  ) {

    return "CANCELLED";

  }


  if (
    value === "postponed"
  ) {

    return "POSTPONED";

  }


  if (
    value === "upcoming" ||
    value === "scheduled" ||
    value === "notstarted"
  ) {

    return "SCHEDULED";

  }


  return "SCHEDULED";

}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
  date
) {

  if (
    !(date instanceof Date) ||
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


// ==========================================================
// NORMALIZE ID
// ==========================================================

function normalizeId(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  return String(
    value
  ).trim();

}


// ==========================================================
// CLEAN STRING
// ==========================================================

function cleanString(
  value
) {

  return String(
    value || ""
  ).trim();

}


// ==========================================================
// NORMALIZE NAME
// ==========================================================

function normalizeName(
  value
) {

  return String(
    value || ""
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
      /\b(fc|cf|afc|sc|ac|fk|club|utd|united|football club)\b/g,
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

  const a =
    normalizeName(first);


  const b =
    normalizeName(second);


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
    a
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  const secondTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    firstTokens.length === 0 ||
    secondTokens.length === 0
  ) {

    return false;

  }


  const firstSet =
    new Set(firstTokens);


  const common =
    secondTokens.filter(
      token =>
        firstSet.has(token)
    );


  if (
    secondTokens.length === 1
  ) {

    return common.length >= 1;

  }


  return (
    common.length >=
    Math.min(
      2,
      secondTokens.length
    )
  );

}


// ==========================================================
// STRONG NAME MATCH
// ==========================================================

function strongNameMatch(
  first,
  second
) {

  const a =
    normalizeName(first);


  const b =
    normalizeName(second);


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
    a
      .split(" ")
      .filter(
        token =>
          token.length >= 4
      );


  const secondTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 4
      );


  if (
    firstTokens.length === 0 ||
    secondTokens.length === 0
  ) {

    return false;

  }


  const common =
    secondTokens.filter(
      token =>
        firstTokens.includes(token)
    );


  return common.length >= 1;

}


// ==========================================================
// DEDUPLICATE
// ==========================================================

function dedupeEvents(
  events
) {

  if (
    !Array.isArray(events)
  ) {

    return [];

  }


  const map =
    new Map();


  for (
    const event of events
  ) {

    if (!event) {

      continue;

    }


    const id =
      normalizeId(

        event?.id ||

        event?.event_id ||

        event?.fixture_id ||

        event?.match_id

      );


    const fallback = [

      getEventTeamId(
        event,
        "home"
      ),

      getEventTeamId(
        event,
        "away"
      ),

      getEventDate(event),

      normalizeName(
        eventHomeName(event)
      ),

      normalizeName(
        eventAwayName(event)
      )

    ].join("|");


    const key =
      id
        ? `id:${id}`
        : `fallback:${fallback}`;


    if (
      !map.has(key)
    ) {

      map.set(
        key,
        event
      );

    }

  }


  return [
    ...map.values()
  ];

}


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;


// ==========================================================
// END BSD PROVIDER 3.1.0
// ==========================================================
