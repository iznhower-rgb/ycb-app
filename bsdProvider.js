// ==========================================================
// Y.C.B BSD PROVIDER 3.1.0
// ==========================================================
//
// BSD = Bzzoiro Sports Data
//
// Compatible with:
//   providers.js 3.1.0
//
// Environment:
//   BSD_API_KEY
//
// API:
//   https://sports.bzzoiro.com/api/v2
//
// Main improvements:
//   1. Team search with strict matching.
//   2. Team ID based fixture search.
//   3. /events/?team_id= support.
//   4. Pagination support.
//   5. Wider date-range fixture search.
//   6. Recent finished matches.
//   7. Strict home/away verification.
//   8. Does not fabricate missing data.
//   9. Preserves API errors instead of hiding everything.
//  10. Compatible normalized output for Y.C.B.
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

const DEFAULT_PAGE_SIZE =
  200;

const MAX_PAGES =
  5;

const RECENT_MATCH_LIMIT =
  15;


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


    if (
      !homeName ||
      !awayName
    ) {

      return buildResponse(
        "configuration_error",
        "اسم الفريق المضيف أو الضيف مفقود.",
        false,
        false,
        null,
        [],
        [],
        startedAt
      );

    }


    const apiKey =
      getApiKey(
        env
      );


    if (
      !apiKey
    ) {

      return buildResponse(
        "configuration_error",
        "BSD_API_KEY غير موجود في Environment Variables.",
        false,
        false,
        null,
        [],
        [],
        startedAt
      );

    }


    try {

      // ----------------------------------------------------
      // 1. FIND BOTH TEAMS
      // ----------------------------------------------------

      const [
        homeTeam,
        awayTeam
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


      // ----------------------------------------------------
      // 2. GET TEAM EVENTS / FIXTURES
      // ----------------------------------------------------

      const [
        homeEvents,
        awayEvents
      ] =
        await Promise.all([

          homeTeam?.id
            ? getAllTeamEvents(
                homeTeam.id,
                apiKey
              )
            : Promise.resolve([]),

          awayTeam?.id
            ? getAllTeamEvents(
                awayTeam.id,
                apiKey
              )
            : Promise.resolve([])

        ]);


      // ----------------------------------------------------
      // 3. FIND FIXTURE FROM HOME TEAM DATA
      // ----------------------------------------------------

      let fixture =
        findMatchingEvent(
          homeEvents,
          homeName,
          awayName
        );


      // ----------------------------------------------------
      // 4. FIND FIXTURE FROM AWAY TEAM DATA
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        fixture =
          findMatchingEvent(
            awayEvents,
            homeName,
            awayName
          );

      }


      // ----------------------------------------------------
      // 5. DIRECT EVENT SEARCH
      // ----------------------------------------------------

      if (
        !fixture &&
        homeTeam?.id
      ) {

        const directHome =
          await getEventsByTeam(
            homeTeam.id,
            apiKey,
            false
          );


        fixture =
          findMatchingEvent(
            directHome,
            homeName,
            awayName
          );

      }


      // ----------------------------------------------------
      // 6. DIRECT EVENT SEARCH USING AWAY TEAM
      // ----------------------------------------------------

      if (
        !fixture &&
        awayTeam?.id
      ) {

        const directAway =
          await getEventsByTeam(
            awayTeam.id,
            apiKey,
            false
          );


        fixture =
          findMatchingEvent(
            directAway,
            homeName,
            awayName
          );

      }


      // ----------------------------------------------------
      // 7. DATE RANGE SEARCH
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        fixture =
          await findFixtureByDateRange(
            homeName,
            awayName,
            apiKey
          );

      }


      // ----------------------------------------------------
      // 8. NORMALIZE RECENT HISTORY
      // ----------------------------------------------------

      const normalizedHome =
        normalizeRecentMatches(
          homeEvents,
          homeName
        );


      const normalizedAway =
        normalizeRecentMatches(
          awayEvents,
          awayName
        );


      const historyAvailable =
        normalizedHome.length > 0 ||
        normalizedAway.length > 0;


      // ----------------------------------------------------
      // 9. NOTHING FOUND
      // ----------------------------------------------------

      if (
        !fixture &&
        !historyAvailable
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "BSD متصل بنجاح، لكن لم يتم العثور على المباراة أو نتائج تاريخية صالحة للفريقين.",

          data: {

            source:
              "bsd",

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

            teams: {

              home:
                normalizeTeam(
                  homeTeam
                ),

              away:
                normalizeTeam(
                  awayTeam
                )

            },

            durationMs:
              Date.now() -
              startedAt

          }

        };

      }


      // ----------------------------------------------------
      // 10. SUCCESS
      // ----------------------------------------------------

      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture

            ? "تم العثور على المباراة والتحقق من الفريقين عبر BSD."

            : "تم العثور على بيانات تاريخية عبر BSD، لكن لم يتم العثور على المباراة المطلوبة.",

        data: {

          source:
            "bsd",

          providerVersion:
            PROVIDER_VERSION,

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
              normalizedHome,

            away:
              normalizedAway

          },

          historyAvailable,

          historyCount: {

            home:
              normalizedHome.length,

            away:
              normalizedAway.length

          },

          teams: {

            home:
              normalizeTeam(
                homeTeam
              ),

            away:
              normalizeTeam(
                awayTeam
              )

          },

          limitations: {

            dataProvider:
              "BSD",

            pagination:
              true,

            fabricatedData:
              false

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
          String(
            error
          ),

        data: {

          source:
            "bsd",

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
            false,

          durationMs:
            Date.now() -
            startedAt

        }

      };

    }

  }

}


// ==========================================================
// API KEY
// ==========================================================

function getApiKey(
  env
) {

  return String(

    env?.BSD_API_KEY ||

    env?.BSD_KEY ||

    env?.SPORTS_BSD_API_KEY ||

    ""

  ).trim();

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
      `&limit=50`;


    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const teams =
      Array.isArray(
        data?.results
      )
        ? data.results
        : [];


    if (
      teams.length === 0
    ) {

      return null;

    }


    // ------------------------------------------------------
    // EXACT NORMALIZED MATCH
    // ------------------------------------------------------

    const exact =
      teams.find(
        team => {

          return (
            normalizeName(
              teamName(
                team
              )
            ) === target
          );

        }
      );


    if (
      exact
    ) {

      return exact;

    }


    // ------------------------------------------------------
    // HIGH CONFIDENCE MATCH
    // ------------------------------------------------------

    const strong =
      teams.find(
        team => {

          return strongNameMatch(
            teamName(
              team
            ),
            name
          );

        }
      );


    if (
      strong
    ) {

      return strong;

    }


    // ------------------------------------------------------
    // DO NOT BLINDLY ACCEPT FIRST RESULT
    // ------------------------------------------------------

    return null;

  } catch (
    error
  ) {

    throw new Error(
      `BSD team search failed for "${name}": ${error?.message || String(error)}`
    );

  }

}


// ==========================================================
// GET TEAM FIXTURES
// ==========================================================

async function getTeamFixtures(
  teamId,
  apiKey
) {

  if (
    !teamId
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
    DEFAULT_PAGE_SIZE +
    `&offset=0`;


  const data =
    await fetchJSON(
      url,
      apiKey
    );


  return Array.isArray(
    data?.results
  )
    ? data.results
    : [];

}


// ==========================================================
// GET ALL TEAM EVENTS
// ==========================================================

async function getAllTeamEvents(
  teamId,
  apiKey
) {

  if (
    !teamId
  ) {

    return [];

  }


  const combined =
    [];


  const seen =
    new Set();


  // --------------------------------------------------------
  // PRIMARY SOURCE: TEAM FIXTURES
  // --------------------------------------------------------

  try {

    const fixtures =
      await getTeamFixtures(
        teamId,
        apiKey
      );


    addUniqueEvents(
      combined,
      fixtures,
      seen
    );

  } catch {

    // Continue with events endpoint.
  }


  // --------------------------------------------------------
  // SECONDARY SOURCE: EVENTS BY TEAM
  // --------------------------------------------------------

  try {

    const events =
      await getEventsByTeam(
        teamId,
        apiKey,
        true
      );


    addUniqueEvents(
      combined,
      events,
      seen
    );

  } catch {

    // Keep already collected fixtures.
  }


  return combined;

}


// ==========================================================
// EVENTS BY TEAM
// ==========================================================

async function getEventsByTeam(
  teamId,
  apiKey,
  paginate
) {

  if (
    !teamId
  ) {

    return [];

  }


  const all =
    [];


  const seen =
    new Set();


  const pages =
    paginate
      ? MAX_PAGES
      : 1;


  for (
    let page = 0;
    page < pages;
    page++
  ) {

    const offset =
      page *
      DEFAULT_PAGE_SIZE;


    const url =
      `${API}/events/?team_id=` +
      encodeURIComponent(
        String(
          teamId
        )
      ) +
      `&limit=` +
      DEFAULT_PAGE_SIZE +
      `&offset=` +
      offset;


    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const events =
      Array.isArray(
        data?.results
      )
        ? data.results
        : [];


    if (
      events.length === 0
    ) {

      break;

    }


    addUniqueEvents(
      all,
      events,
      seen
    );


    if (
      !paginate
    ) {

      break;

    }


    const total =
      Number(
        data?.count
      );


    if (
      Number.isFinite(
        total
      ) &&
      offset +
      events.length >=
      total
    ) {

      break;

    }


    if (
      events.length <
      DEFAULT_PAGE_SIZE
    ) {

      break;

    }

  }


  return all;

}


// ==========================================================
// DATE RANGE FIXTURE SEARCH
// ==========================================================

async function findFixtureByDateRange(
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
    to.getDate() + 90
  );


  const all =
    [];


  const seen =
    new Set();


  const pageCount =
    3;


  for (
    let page = 0;
    page < pageCount;
    page++
  ) {

    const offset =
      page *
      DEFAULT_PAGE_SIZE;


    const url =
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

      `&limit=` +

      DEFAULT_PAGE_SIZE +

      `&offset=` +

      offset;


    const data =
      await fetchJSON(
        url,
        apiKey
      );


    const events =
      Array.isArray(
        data?.results
      )
        ? data.results
        : [];


    if (
      events.length === 0
    ) {

      break;

    }


    addUniqueEvents(
      all,
      events,
      seen
    );


    const match =
      findMatchingEvent(
        events,
        home,
        away
      );


    if (
      match
    ) {

      return match;

    }


    if (
      events.length <
      DEFAULT_PAGE_SIZE
    ) {

      break;

    }

  }


  return findMatchingEvent(
    all,
    home,
    away
  );

}


// ==========================================================
// ADD UNIQUE EVENTS
// ==========================================================

function addUniqueEvents(
  target,
  events,
  seen
) {

  if (
    !Array.isArray(
      events
    )
  ) {

    return;

  }


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
        buildEventKey(
          event
        )
      );


    if (
      seen.has(
        id
      )
    ) {

      continue;

    }


    seen.add(
      id
    );


    target.push(
      event
    );

  }

}


// ==========================================================
// EVENT KEY
// ==========================================================

function buildEventKey(
  event
) {

  return [

    eventHomeName(
      event
    ),

    eventAwayName(
      event
    ),

    getEventDate(
      event
    )

  ]

    .map(
      value =>
        String(
          value ||
          ""
        )
          .toLowerCase()
          .trim()
    )

    .join(
      "|"
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


  if (
    !targetHome ||
    !targetAway
  ) {

    return null;

  }


  // --------------------------------------------------------
  // EXACT NORMALIZED HOME + AWAY
  // --------------------------------------------------------

  const exact =
    events.find(
      event => {

        const eventHome =
          normalizeName(
            eventHomeName(
              event
            )
          );


        const eventAway =
          normalizeName(
            eventAwayName(
              event
            )
          );


        return (

          eventHome ===
          targetHome &&

          eventAway ===
          targetAway

        );

      }
    );


  if (
    exact
  ) {

    return exact;

  }


  // --------------------------------------------------------
  // STRONG HOME + AWAY
  // --------------------------------------------------------

  const strong =
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
            home
          ) &&

          strongNameMatch(
            eventAway,
            away
          )

        );

      }
    );


  if (
    strong.length === 1
  ) {

    return strong[0];

  }


  // --------------------------------------------------------
  // TEAM ID CONFIRMATION
  // --------------------------------------------------------

  const homeIdCandidates =
    events.filter(
      event => {

        const eventHomeId =
          getTeamId(
            event,
            "home"
          );


        const eventAwayNameValue =
          eventAwayName(
            event
          );


        return (

          eventHomeId !== null &&

          strongNameMatch(
            eventAwayNameValue,
            away
          )

        );

      }
    );


  if (
    homeIdCandidates.length === 1
  ) {

    const candidate =
      homeIdCandidates[0];


    if (
      strongNameMatch(
        eventHomeName(
          candidate
        ),
        home
      )
    ) {

      return candidate;

    }

  }


  return null;

}


// ==========================================================
// NORMALIZE RECENT MATCHES
// ==========================================================

function normalizeRecentMatches(
  events,
  teamNameValue
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


  const matches =
    events

      .filter(
        event =>
          hasValidScore(
            event
          )
      )

      .filter(
        event => {

          const home =
            eventHomeName(
              event
            );


          const away =
            eventAwayName(
              event
            );


          return (

            namesMatch(
              home,
              target
            ) ||

            namesMatch(
              away,
              target
            )

          );

        }
      )

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
      );


  const unique =
    [];


  const seen =
    new Set();


  for (
    const event
    of matches
  ) {

    const normalized =
      normalizeEvent(
        event
      );


    if (
      !normalized
    ) {

      continue;

    }


    if (
      seen.has(
        normalized.id
      )
    ) {

      continue;

    }


    seen.add(
      normalized.id
    );


    unique.push(
      normalized
    );


    if (
      unique.length >=
      RECENT_MATCH_LIMIT
    ) {

      break;

    }

  }


  return unique;

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
      team?.id ||
      team?.team_id ||
      null,

    name:
      teamName(
        team
      ) ||
      null,

    shortName:
      team?.short_name ||
      team?.shortName ||
      null

  };

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
    homeScore !== null &&
    awayScore !== null;


  const homeTeam =
    event?.home_team ||
    event?.homeTeam ||
    event?.home ||
    {};


  const awayTeam =
    event?.away_team ||
    event?.awayTeam ||
    event?.away ||
    {};


  return {

    id:
      String(
        event?.id ||
        event?.event_id ||
        event?.fixture_id ||
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
        homeTeam?.id ||
        homeTeam?.team_id ||
        event?.home_team_id ||
        null,

      name:
        homeTeam?.name ||
        homeTeam?.short_name ||
        event?.home_team_name ||
        null,

      shortName:
        homeTeam?.short_name ||
        homeTeam?.shortName ||
        homeTeam?.name ||
        null

    },


    awayTeam: {

      id:
        awayTeam?.id ||
        awayTeam?.team_id ||
        event?.away_team_id ||
        null,

      name:
        awayTeam?.name ||
        awayTeam?.short_name ||
        event?.away_team_name ||
        null,

      shortName:
        awayTeam?.short_name ||
        awayTeam?.shortName ||
        awayTeam?.name ||
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

          event?.homeTeamScore

        ]

      : [

          event?.away_score,

          event?.awayScore,

          event?.score?.away,

          event?.scores?.away,

          event?.away?.score,

          event?.away_team_score,

          event?.awayTeamScore

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
// HOME TEAM NAME
// ==========================================================

function eventHomeName(
  event
) {

  return (

    event?.home_team?.name ||

    event?.home_team?.short_name ||

    event?.homeTeam?.name ||

    event?.homeTeam?.shortName ||

    event?.home?.name ||

    event?.home_team_name ||

    ""

  );

}


// ==========================================================
// AWAY TEAM NAME
// ==========================================================

function eventAwayName(
  event
) {

  return (

    event?.away_team?.name ||

    event?.away_team?.short_name ||

    event?.awayTeam?.name ||

    event?.awayTeam?.shortName ||

    event?.away?.name ||

    event?.away_team_name ||

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

    ""

  );

}


// ==========================================================
// TEAM ID
// ==========================================================

function getTeamId(
  event,
  side
) {

  if (
    side === "home"
  ) {

    return (

      event?.home_team?.id ||

      event?.homeTeam?.id ||

      event?.home?.id ||

      event?.home_team_id ||

      null

    );

  }


  return (

    event?.away_team?.id ||

    event?.awayTeam?.id ||

    event?.away?.id ||

    event?.away_team_id ||

    null

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

    event?.start_time ||

    event?.kickoff ||

    event?.datetime ||

    event?.startTime ||

    event?.date_time ||

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


  return "SCHEDULED";

}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(
  date
) {

  if (
    !(date instanceof Date)
  ) {

    return "";

  }


  if (
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

    // IMPORTANT:
    // Do NOT remove "united" or "utd".
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


  const aTokens =
    a
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  const bTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    aTokens.length === 0 ||
    bTokens.length === 0
  ) {

    return false;

  }


  const aSet =
    new Set(
      aTokens
    );


  const common =
    bTokens.filter(
      token =>
        aSet.has(
          token
        )
    );


  if (
    bTokens.length === 1
  ) {

    return common.length >= 1;

  }


  return (

    common.length >=
    Math.min(
      2,
      bTokens.length
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


  const aTokens =
    a
      .split(" ")
      .filter(
        token =>
          token.length >= 4
      );


  const bTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 4
      );


  if (
    aTokens.length === 0 ||
    bTokens.length === 0
  ) {

    return false;

  }


  const aSet =
    new Set(
      aTokens
    );


  const common =
    bTokens.filter(
      token =>
        aSet.has(
          token
        )
    );


  return (
    common.length >= 1
  );

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
            `Token ${apiKey}`

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
      403
    ) {

      throw new Error(
        "BSD HTTP 403 — الوصول إلى Football API مرفوض."
      );

    }


    if (
      response.status ===
      404
    ) {

      throw new Error(
        "BSD HTTP 404 — endpoint غير موجود."
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


  if (
    !data ||
    typeof data !==
    "object"
  ) {

    throw new Error(
      "BSD returned an empty or invalid response."
    );

  }


  return data;

}


// ==========================================================
// BUILD RESPONSE
// ==========================================================

function buildResponse(
  status,
  message,
  available,
  matchFound,
  fixture,
  homeRecent,
  awayRecent,
  startedAt
) {

  return {

    status,

    message,

    data: {

      source:
        "bsd",

      providerVersion:
        PROVIDER_VERSION,

      available,

      matchFound,

      fixture:
        fixture
          ? normalizeEvent(
              fixture
            )
          : null,

      recentMatches: {

        home:
          Array.isArray(
            homeRecent
          )
            ? homeRecent
            : [],

        away:
          Array.isArray(
            awayRecent
          )
            ? awayRecent
            : []

      },

      historyAvailable:
        (
          Array.isArray(
            homeRecent
          ) &&
          homeRecent.length > 0
        )

        ||

        (
          Array.isArray(
            awayRecent
          ) &&
          awayRecent.length > 0
        ),

      historyCount: {

        home:
          Array.isArray(
            homeRecent
          )
            ? homeRecent.length
            : 0,

        away:
          Array.isArray(
            awayRecent
          )
            ? awayRecent.length
            : 0

      },

      durationMs:
        Date.now() -
        startedAt

    }

  };

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
