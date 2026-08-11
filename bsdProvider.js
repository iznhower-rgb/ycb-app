// ==========================================================
// Y.C.B BSD PROVIDER 3.1.0
// ==========================================================
//
// BSD = Bzzoiro Sports Data
//
// Version:
//   3.1.0
//
// Required environment variable:
//   BSD_API_KEY
//
// API:
//   https://sports.bzzoiro.com/api/v2
//
// Authentication:
//   Authorization: Token YOUR_API_KEY
//
// Compatible with:
//   providers.js 3.1.x
//   providerRunner.js
//   worker.js
//
// Main improvements:
//   1. Team-ID based matching.
//   2. Team fixtures endpoint.
//   3. Events endpoint with team_id.
//   4. Historical results collection.
//   5. Upcoming fixture detection.
//   6. Multiple BSD response-shape fallbacks.
//   7. Better team-name normalization.
//   8. Does not silently hide useful API errors.
//   9. Deduplicates events.
//  10. Keeps api_ok_no_match separate from network errors.
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


const MAX_RECENT_MATCHES =
  15;


const TEAM_SEARCH_LIMIT =
  30;


const FIXTURE_LIMIT =
  200;


// ==========================================================
// PROVIDER
// ==========================================================

class BSDProvider extends DataProvider {


  constructor() {

    super(
      "BSD"
    );

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
      String(
        home ||
        ""
      ).trim();


    const awayName =
      String(
        away ||
        ""
      ).trim();


    // ------------------------------------------------------
    // Validate team names
    // ------------------------------------------------------

    if (
      !homeName ||
      !awayName
    ) {

      return buildResponse(
        "configuration_error",
        "اسم الفريق المضيف أو الضيف مفقود.",
        startedAt,
        {

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
      );

    }


    // ------------------------------------------------------
    // API KEY
    // ------------------------------------------------------

    const apiKey =
      String(
        env?.BSD_API_KEY ||
        env?.BSD_KEY ||
        env?.SPORTS_BSD_API_KEY ||
        ""
      ).trim();


    if (
      !apiKey
    ) {

      return buildResponse(
        "configuration_error",
        "BSD_API_KEY غير موجود في Environment Variables.",
        startedAt,
        {

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
      );

    }


    try {

      // ----------------------------------------------------
      // Find both teams
      // ----------------------------------------------------

      const teamResults =
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
        teamResults[0];


      const awayTeam =
        teamResults[1];


      // ----------------------------------------------------
      // Collect all available events
      // ----------------------------------------------------

      const homeData =
        await collectTeamEvents(
          homeTeam,
          homeName,
          apiKey
        );


      const awayData =
        await collectTeamEvents(
          awayTeam,
          awayName,
          apiKey
        );


      // ----------------------------------------------------
      // Merge and deduplicate events
      // ----------------------------------------------------

      const allEvents =
        dedupeEvents(
          [
            ...homeData.events,
            ...awayData.events
          ]
        );


      // ----------------------------------------------------
      // Find fixture
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
      // Global event fallback
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        const globalEvents =
          await findGlobalEvents(
            homeName,
            awayName,
            apiKey
          );


        if (
          globalEvents.length
        ) {

          fixture =
            findMatchingEvent(
              globalEvents,
              homeName,
              awayName,
              homeTeam,
              awayTeam
            );

        }

      }


      // ----------------------------------------------------
      // Normalize history
      // ----------------------------------------------------

      const normalizedHome =
        normalizeRecentMatches(
          allEvents,
          homeName,
          homeTeam
        );


      const normalizedAway =
        normalizeRecentMatches(
          allEvents,
          awayName,
          awayTeam
        );


      // ----------------------------------------------------
      // If individual team calls gave nothing,
      // try their dedicated fixture endpoints again.
      // ----------------------------------------------------

      let finalHome =
        normalizedHome;


      let finalAway =
        normalizedAway;


      if (
        finalHome.length === 0 &&
        homeTeam?.id
      ) {

        const events =
          await getTeamFixtures(
            homeTeam.id,
            apiKey
          );


        finalHome =
          normalizeRecentMatches(
            events,
            homeName,
            homeTeam
          );

      }


      if (
        finalAway.length === 0 &&
        awayTeam?.id
      ) {

        const events =
          await getTeamFixtures(
            awayTeam.id,
            apiKey
          );


        finalAway =
          normalizeRecentMatches(
            events,
            awayName,
            awayTeam
          );

      }


      // ----------------------------------------------------
      // Final fixture fallback from dedicated histories
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        fixture =
          findMatchingEvent(
            [
              ...allEvents
            ],
            homeName,
            awayName,
            homeTeam,
            awayTeam
          );

      }


      const historyAvailable =
        finalHome.length > 0 ||
        finalAway.length > 0;


      // ----------------------------------------------------
      // No fixture + no history
      // ----------------------------------------------------

      if (
        !fixture &&
        !historyAvailable
      ) {

        const diagnostics = {

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

          homeEvents:
            homeData.events.length,

          awayEvents:
            awayData.events.length,

          homeErrors:
            homeData.errors,

          awayErrors:
            awayData.errors

        };


        return buildResponse(
          "api_ok_no_match",
          "BSD متصل، لكن لم يتم العثور على المباراة أو نتائج تاريخية قابلة للاستخدام.",
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

            diagnostics

          }
        );

      }


      // ----------------------------------------------------
      // Success / partial success
      // ----------------------------------------------------

      return buildResponse(
        fixture
          ? "success"
          : "partial_success",

        fixture

          ? "تم العثور على المباراة وبيانات BSD بنجاح."

          : "تم العثور على بيانات تاريخية عبر BSD، لكن لم يتم التحقق من المباراة المطلوبة.",

        startedAt,
        {

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
              finalHome,

            away:
              finalAway

          },

          historyAvailable,

          historyCount: {

            home:
              finalHome.length,

            away:
              finalAway.length

          },

          teams: {

            home: homeTeam
              ? normalizeTeam(
                  homeTeam
                )
              : null,

            away: awayTeam
              ? normalizeTeam(
                  awayTeam
                )
              : null

          },

          diagnostics: {

            eventsCollected:
              allEvents.length,

            homeEvents:
              homeData.events.length,

            awayEvents:
              awayData.events.length,

            homeErrors:
              homeData.errors,

            awayErrors:
              awayData.errors

          }

        }
      );

    } catch (
      error
    ) {

      return buildResponse(
        "network_error",

        error?.message ||
        String(
          error
        ),

        startedAt,
        {

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
      );

    }

  }

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

  const target =
    normalizeName(
      name
    );


  if (
    !target
  ) {

    return null;

  }


  try {

    const url =
      `${API}/teams/?search=` +

      encodeURIComponent(
        name
      ) +

      `&limit=` +

      TEAM_SEARCH_LIMIT;


    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const teams =
      extractResults(
        data
      );


    if (
      teams.length === 0
    ) {

      return null;

    }


    // ------------------------------------------------------
    // Exact normalized name
    // ------------------------------------------------------

    const exact =
      teams.find(
        team =>
          normalizeName(
            teamName(
              team
            )
          ) === target
      );


    if (
      exact
    ) {

      return exact;

    }


    // ------------------------------------------------------
    // Strong name match
    // ------------------------------------------------------

    const strong =
      teams.find(
        team =>
          strongNameMatch(
            teamName(
              team
            ),
            name
          )
      );


    if (
      strong
    ) {

      return strong;

    }


    // ------------------------------------------------------
    // Normal name match
    // ------------------------------------------------------

    const matched =
      teams.find(
        team =>
          namesMatch(
            teamName(
              team
            ),
            name
          )
      );


    if (
      matched
    ) {

      return matched;

    }


    // ------------------------------------------------------
    // IMPORTANT:
    // Do not blindly use teams[0].
    //
    // A wrong team ID can cause the whole provider to
    // search the wrong fixture history.
    // ------------------------------------------------------

    return null;

  } catch {

    return null;

  }

}


// ==========================================================
// COLLECT TEAM EVENTS
// ==========================================================

async function collectTeamEvents(
  team,
  teamNameValue,
  apiKey
) {

  const events =
    [];

  const errors =
    [];


  // --------------------------------------------------------
  // Endpoint 1:
  // /teams/{id}/fixtures/
  // --------------------------------------------------------

  if (
    team?.id
  ) {

    try {

      const fixtureEvents =
        await getTeamFixtures(
          team.id,
          apiKey
        );


      events.push(
        ...fixtureEvents
      );

    } catch (
      error
    ) {

      errors.push(
        error?.message ||
        String(
          error
        )
      );

    }


    // ------------------------------------------------------
    // Endpoint 2:
    // /events/?team_id={id}
    // ------------------------------------------------------

    try {

      const teamEvents =
        await getTeamEvents(
          team.id,
          apiKey
        );


      events.push(
        ...teamEvents
      );

    } catch (
      error
    ) {

      errors.push(
        error?.message ||
        String(
          error
        )
      );

    }

  }


  // --------------------------------------------------------
  // Endpoint 3:
  // Search events by team name only when ID is unavailable.
  // --------------------------------------------------------

  if (
    events.length === 0 &&
    teamNameValue
  ) {

    try {

      const searchEvents =
        await searchEventsByTeamName(
          teamNameValue,
          apiKey
        );


      events.push(
        ...searchEvents
      );

    } catch (
      error
    ) {

      errors.push(
        error?.message ||
        String(
          error
        )
      );

    }

  }


  return {

    events:
      dedupeEvents(
        events
      ),

    errors

  };

}


// ==========================================================
// GET TEAM FIXTURES
// ==========================================================

async function getTeamFixtures(
  teamId,
  apiKey
) {

  if (
    teamId === null ||
    teamId === undefined ||
    String(
      teamId
    ).trim() === ""
  ) {

    return [];

  }


  const url =
    `${API}/teams/` +

    encodeURIComponent(
      String(
        teamId
      )
    ) +

    `/fixtures/?limit=` +

    FIXTURE_LIMIT;


  const data =
    await fetchJSON(
      url,
      apiKey
    );


  return extractResults(
    data
  );

}


// ==========================================================
// GET EVENTS BY TEAM ID
// ==========================================================

async function getTeamEvents(
  teamId,
  apiKey
) {

  if (
    teamId === null ||
    teamId === undefined
  ) {

    return [];

  }


  const urls = [

    `${API}/events/?team_id=` +

    encodeURIComponent(
      String(
        teamId
      )
    ) +

    `&limit=${FIXTURE_LIMIT}`,

    `${API}/events/?team_id=` +

    encodeURIComponent(
      String(
        teamId
      )
    ) +

    `&status=notstarted&limit=${FIXTURE_LIMIT}`

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
          apiKey
        );


      all.push(
        ...extractResults(
          data
        )
      );

    } catch {

      // Continue with the next supported query.
    }

  }


  return dedupeEvents(
    all
  );

}


// ==========================================================
// SEARCH EVENTS BY TEAM NAME
// ==========================================================

async function searchEventsByTeamName(
  name,
  apiKey
) {

  const url =
    `${API}/events/?search=` +

    encodeURIComponent(
      name
    ) +

    `&limit=${FIXTURE_LIMIT}`;


  const data =
    await fetchJSON(
      url,
      apiKey
    );


  return extractResults(
    data
  );

}


// ==========================================================
// GLOBAL EVENTS
// ==========================================================

async function findGlobalEvents(
  home,
  away,
  apiKey
) {

  const now =
    new Date();


  const from =
    new Date(
      now.getTime()
    );


  from.setDate(
    from.getDate() - 30
  );


  const to =
    new Date(
      now.getTime()
    );


  to.setDate(
    to.getDate() + 60
  );


  const urls = [

    `${API}/events/?date_from=` +

    encodeURIComponent(
      formatDate(
        from
      )
    ) +

    `&date_to=` +

    encodeURIComponent(
      formatDate(
        to
      )
    ) +

    `&limit=${FIXTURE_LIMIT}`,

    `${API}/events/?limit=${FIXTURE_LIMIT}`

  ];


  const events =
    [];


  for (
    const url
    of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url,
          apiKey
        );


      events.push(
        ...extractResults(
          data
        )
      );


      if (
        findMatchingEvent(
          events,
          home,
          away,
          null,
          null
        )
      ) {

        break;

      }

    } catch {

      // Continue.
    }

  }


  return dedupeEvents(
    events
  );

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
    !Array.isArray(
      events
    ) ||
    events.length === 0
  ) {

    return null;

  }


  const targetHome =
    normalizeName(
      home
    );


  const targetAway =
    normalizeName(
      away
    );


  const homeId =
    normalizeId(
      homeTeam?.id
    );


  const awayId =
    normalizeId(
      awayTeam?.id
    );


  // --------------------------------------------------------
  // 1. ID MATCH
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

            eventHomeId ===
            homeId

            &&

            eventAwayId ===
            awayId

          );

        }
      );


    if (
      byId
    ) {

      return byId;

    }

  }


  // --------------------------------------------------------
  // 2. NAME MATCH
  // --------------------------------------------------------

  const exact =
    events.find(
      event => {

        const eventHome =
          eventHomeName(
            event
          );


        const eventAway =
          eventAwayName(
            event
          );


        return (

          namesMatch(
            eventHome,
            targetHome
          )

          &&

          namesMatch(
            eventAway,
            targetAway
          )

        );

      }
    );


  if (
    exact
  ) {

    return exact;

  }


  // --------------------------------------------------------
  // 3. STRONG NAME MATCH
  // --------------------------------------------------------

  const candidates =
    events.filter(
      event => {

        const eventHome =
          eventHomeName(
            event
          );


        const eventAway =
          eventAwayName(
            event
          );


        return (

          strongNameMatch(
            eventHome,
            targetHome
          )

          &&

          strongNameMatch(
            eventAway,
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
  teamNameValue,
  team
) {

  if (
    !Array.isArray(
      events
    )
  ) {

    return [];

  }


  const target =
    normalizeName(
      teamNameValue
    );


  const targetId =
    normalizeId(
      team?.id
    );


  const filtered =
    events

      .filter(
        event =>
          hasValidScore(
            event
          )
      )

      .filter(
        event => {

          // ------------------------------------------------
          // Prefer ID matching.
          // ------------------------------------------------

          if (
            targetId
          ) {

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


          // ------------------------------------------------
          // Fallback to name.
          // ------------------------------------------------

          const eventHome =
            eventHomeName(
              event
            );


          const eventAway =
            eventAwayName(
              event
            );


          return (

            namesMatch(
              eventHome,
              target
            )

            ||

            namesMatch(
              eventAway,
              target
            )

          );

        }
      );


  return filtered

    .sort(
      (
        a,
        b
      ) => {

        const dateA =
          getEventDate(
            a
          );


        const dateB =
          getEventDate(
            b
          );


        return (

          new Date(
            dateB || 0
          ).getTime()

          -

          new Date(
            dateA || 0
          ).getTime()

        );

      }
    )

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
        ? JSON.parse(
            text
          )
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
      response.status ===
      401
    ) {

      throw new Error(
        "BSD HTTP 401 — API key مفقود أو غير صالح."
      );

    }


    if (
      response.status ===
      402
    ) {

      throw new Error(
        "BSD HTTP 402 — هذا المورد يحتاج إلى إضافة مدفوعة."
      );

    }


    if (
      response.status ===
      403
    ) {

      throw new Error(
        "BSD HTTP 403 — الوصول إلى هذا المورد مرفوض."
      );

    }


    if (
      response.status ===
      404
    ) {

      throw new Error(
        "BSD HTTP 404 — مسار API غير موجود."
      );

    }


    if (
      response.status ===
      429
    ) {

      throw new Error(
        "BSD HTTP 429 — تم تجاوز حد الطلبات."
      );

    }


    throw new Error(
      `BSD HTTP ${response.status}`
    );

  }


  return data;

}


// ==========================================================
// NORMALIZE EVENT
// ==========================================================

function normalizeEvent(
  event
) {

  if (
    !event
  ) {

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


  const finished =
    isFinishedEvent(
      event,
      homeScore,
      awayScore
    );


  const homeTeam =
    getEventTeamObject(
      event,
      "home"
    );


  const awayTeam =
    getEventTeamObject(
      event,
      "away"
    );


  return {

    id:
      String(
        event?.id ||
        event?.event_id ||
        event?.fixture_id ||
        event?.match_id ||
        ""
      ),


    utcDate:
      getEventDate(
        event
      ),


    status:
      finished
        ? "FINISHED"
        : normalizeStatus(
            event?.status
          ),


    homeTeam: {

      id:
        getEventTeamId(
          event,
          "home"
        ),

      name:
        eventHomeName(
          event
        ) ||
        null,

      shortName:
        getShortTeamName(
          homeTeam
        ) ||
        eventHomeName(
          event
        ) ||
        null

    },


    awayTeam: {

      id:
        getEventTeamId(
          event,
          "away"
        ),

      name:
        eventAwayName(
          event
        ) ||
        null,

      shortName:
        getShortTeamName(
          awayTeam
        ) ||
        eventAwayName(
          event
        ) ||
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
      event?.league_name ||
      null

  };

}


// ==========================================================
// NORMALIZE TEAM
// ==========================================================

function normalizeTeam(
  team
) {

  if (
    !team
  ) {

    return null;

  }


  return {

    id:
      normalizeId(
        team?.id ||
        team?.team_id
      ),

    name:
      teamName(
        team
      ) ||
      null

  };

}


// ==========================================================
// GET EVENT TEAM OBJECT
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
// GET EVENT TEAM ID
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
    side === "home"

      ? (

          team?.id ||

          team?.team_id ||

          event?.home_team_id ||

          event?.homeTeamId ||

          event?.home_id

        )

      : (

          team?.id ||

          team?.team_id ||

          event?.away_team_id ||

          event?.awayTeamId ||

          event?.away_id

        );


  return normalizeId(
    value
  );

}


// ==========================================================
// EVENT HOME NAME
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

    team?.team_name ||

    team?.display_name ||

    event?.home_team_name ||

    event?.home_name ||

    ""

  );

}


// ==========================================================
// EVENT AWAY NAME
// ==========================================================

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

    team?.team_name ||

    team?.display_name ||

    event?.away_team_name ||

    event?.away_name ||

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

    team?.team_name ||

    team?.display_name ||

    team?.title ||

    ""

  );

}


// ==========================================================
// SHORT TEAM NAME
// ==========================================================

function getShortTeamName(
  team
) {

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
    const value
    of values
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      continue;

    }


    const number =
      Number(
        value
      );


    if (
      Number.isFinite(
        number
      )
    ) {

      return number;

    }

  }


  return null;

}


// ==========================================================
// FINISHED EVENT
// ==========================================================

function isFinishedEvent(
  event,
  homeScore,
  awayScore
) {

  const status =
    String(
      event?.status ||
      event?.match_status ||
      ""
    )
      .toLowerCase()
      .trim();


  if (
    status ===
    "finished"
  ) {

    return true;

  }


  if (
    status ===
    "completed"
  ) {

    return true;

  }


  if (
    status ===
    "ft"
  ) {

    return true;

  }


  if (
    homeScore !== null &&
    awayScore !== null &&
    (
      status ===
      "finished"

      ||

      status ===
      "completed"

      ||

      status ===
      "ft"

    )
  ) {

    return true;

  }


  return (
    homeScore !== null &&
    awayScore !== null &&
    !status
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
      status ||
      ""
    )
      .toLowerCase()
      .trim();


  if (
    value ===
    "finished" ||

    value ===
    "completed" ||

    value ===
    "ft"
  ) {

    return "FINISHED";

  }


  if (
    value ===
    "live" ||

    value ===
    "inplay" ||

    value ===
    "in_progress"
  ) {

    return "LIVE";

  }


  if (
    value ===
    "cancelled" ||

    value ===
    "canceled"
  ) {

    return "CANCELLED";

  }


  if (
    value ===
    "postponed"
  ) {

    return "POSTPONED";

  }


  return "SCHEDULED";

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
    ) !== null

    &&

    scoreValue(
      event,
      "away"
    ) !== null

  );

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
    a
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 3
      );


  const secondTokens =
    b
      .split(
        " "
      )
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
    a
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 4
      );


  const secondTokens =
    b
      .split(
        " "
      )
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
        firstTokens.includes(
          token
        )
    );


  return (
    common.length >= 1
  );

}


// ==========================================================
// DEDUPLICATE EVENTS
// ==========================================================

function dedupeEvents(
  events
) {

  if (
    !Array.isArray(
      events
    )
  ) {

    return [];

  }


  const map =
    new Map();


  for (
    const event
    of events
  ) {

    if (
      !event
    ) {

      continue;

    }


    const id =
      String(
        event?.id ||
        event?.event_id ||
        event?.fixture_id ||
        event?.match_id ||
        ""
      ).trim();


    const fallback =
      [

        getEventTeamId(
          event,
          "home"
        ),

        getEventTeamId(
          event,
          "away"
        ),

        getEventDate(
          event
        ),

        normalizeName(
          eventHomeName(
            event
          )
        ),

        normalizeName(
          eventAwayName(
            event
          )

        )

      ].join(
        "|"
      );


    const key =
      id
        ? `id:${id}`
        : `fallback:${fallback}`;


    if (
      !map.has(
        key
      )
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
