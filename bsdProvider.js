// ==========================================================
// Y.C.B BSD PROVIDER 2.2.3
// ==========================================================
//
// BSD = Bzzoiro Sports Data
//
// Required environment variable:
//
// BSD_API_KEY
//
// Example:
// BSD_API_KEY = "YOUR_API_KEY"
//
// Compatible with:
// - providers.js
// - worker.js
// - Y.C.B multi-provider architecture
//
// BSD REST API:
// https://sports.bzzoiro.com/api/v2/
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


// ==========================================================
// PROVIDER
// ==========================================================

class BSDProvider
  extends DataProvider {

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

    try {

      // ----------------------------------------------------
      // API KEY
      // ----------------------------------------------------

      const apiKey =
        String(
          env?.BSD_API_KEY ||
          ""
        ).trim();


      if (!apiKey) {

        return {

          status:
            "configuration_error",

          message:
            "BSD_API_KEY غير موجود في Environment Variables.",

          data:
            null

        };

      }


      // ----------------------------------------------------
      // 1. FIND TEAMS
      // ----------------------------------------------------

      const [
        homeTeam,
        awayTeam
      ] =
        await Promise.all([

          findTeam(
            home,
            apiKey
          ),

          findTeam(
            away,
            apiKey
          )

        ]);


      // ----------------------------------------------------
      // 2. TRY TO FIND FIXTURE
      // ----------------------------------------------------

      let fixture =
        await findFixture(
          home,
          away,
          homeTeam,
          awayTeam,
          apiKey
        );


      // ----------------------------------------------------
      // 3. RECENT MATCHES
      // ----------------------------------------------------

      const [
        homeRecent,
        awayRecent
      ] =
        await Promise.all([

          homeTeam?.id
            ? getTeamFixtures(
                homeTeam.id,
                apiKey
              )
            : Promise.resolve([]),

          awayTeam?.id
            ? getTeamFixtures(
                awayTeam.id,
                apiKey
              )
            : Promise.resolve([])

        ]);


      // ----------------------------------------------------
      // 4. FALLBACK:
      // SEARCH EVENTS DIRECTLY
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        fixture =
          findMatchingEvent(
            [
              ...homeRecent,
              ...awayRecent
            ],
            home,
            away
          );

      }


      // ----------------------------------------------------
      // 5. NORMALIZE RECENT MATCHES
      // ----------------------------------------------------

      const normalizedHome =
        normalizeRecentMatches(
          homeRecent,
          home
        );


      const normalizedAway =
        normalizeRecentMatches(
          awayRecent,
          away
        );


      // ----------------------------------------------------
      // 6. NO USEFUL DATA
      // ----------------------------------------------------

      if (
        !fixture &&
        normalizedHome.length === 0 &&
        normalizedAway.length === 0
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "BSD متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

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

            }

          }

        };

      }


      // ----------------------------------------------------
      // 7. SUCCESS / PARTIAL
      // ----------------------------------------------------

      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture
            ? "تم العثور على المباراة وبياناتها عبر BSD."
            : "تم العثور على بيانات تاريخية عبر BSD لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "bsd",

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
          String(
            error
          ),

        data:
          null

      };

    }

  }

}


// ==========================================================
// FIND TEAM
// ==========================================================

async function findTeam(
  name,
  apiKey
) {

  try {

    const url =
      `${API}/teams/` +
      `?search=` +
      encodeURIComponent(
        name
      ) +
      `&limit=20`;


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
      !teams.length
    ) {

      return null;

    }


    const normalizedTarget =
      normalizeName(
        name
      );


    return (

      teams.find(
        team =>
          namesMatch(
            normalizeName(
              teamName(
                team
              )
            ),
            normalizedTarget
          )
      )

      ||

      teams[0]

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// FIND FIXTURE
// ==========================================================

async function findFixture(
  home,
  away,
  homeTeam,
  awayTeam,
  apiKey
) {

  // --------------------------------------------------------
  // FIRST: TEAM ID SEARCH
  // --------------------------------------------------------

  if (
    homeTeam?.id
  ) {

    try {

      const events =
        await getTeamFixtures(
          homeTeam.id,
          apiKey
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

    } catch {

      // Continue.
    }

  }


  // --------------------------------------------------------
  // SECOND: AWAY TEAM ID SEARCH
  // --------------------------------------------------------

  if (
    awayTeam?.id
  ) {

    try {

      const events =
        await getTeamFixtures(
          awayTeam.id,
          apiKey
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

    } catch {

      // Continue.
    }

  }


  // --------------------------------------------------------
  // THIRD: DATE RANGE SEARCH
  // --------------------------------------------------------

  try {

    const now =
      new Date();


    const from =
      new Date(
        now
      );


    from.setDate(
      from.getDate() - 7
    );


    const to =
      new Date(
        now
      );


    to.setDate(
      to.getDate() + 45
    );


    const url =
      `${API}/events/` +

      `?date_from=` +
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

      `&limit=200`;


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


    return findMatchingEvent(
      events,
      home,
      away
    );

  } catch {

    return null;

  }

}


// ==========================================================
// GET TEAM FIXTURES
// ==========================================================

async function getTeamFixtures(
  teamId,
  apiKey
) {

  try {

    const url =
      `${API}/teams/` +
      encodeURIComponent(
        teamId
      ) +
      `/fixtures/?limit=100`;


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

  } catch {

    return [];

  }

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
    )
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


  // --------------------------------------------------------
  // EXACT HOME + AWAY
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
  // FALLBACK: HIGH-CONFIDENCE TOKEN MATCH
  // --------------------------------------------------------

  const candidates =
    events.filter(
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
  teamNameValue
) {

  const target =
    normalizeName(
      teamNameValue
    );


  return events

    .filter(
      event =>
        hasValidScore(
          event
        )
    )

    .filter(
      event => {

        const home =
          normalizeName(
            eventHomeName(
              event
            )
          );


        const away =
          normalizeName(
            eventAwayName(
              event
            )
          );


        return (

          namesMatch(
            home,
            target
          )

          ||

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
      ) =>

        new Date(
          getEventDate(
            b
          ) ||
          0
        )

        -

        new Date(
          getEventDate(
            a
          ) ||
          0
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

    data =
      null;

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
    {};


  const awayTeam =
    event?.away_team ||
    event?.awayTeam ||
    {};


  return {

    id:
      String(
        event?.id ||
        event?.event_id ||
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
        event?.home_team_id ||
        null,

      name:
        homeTeam?.name ||
        homeTeam?.short_name ||
        event?.home_team_name ||
        null,

      shortName:
        homeTeam?.short_name ||
        null

    },


    awayTeam: {

      id:
        awayTeam?.id ||
        event?.away_team_id ||
        null,

      name:
        awayTeam?.name ||
        awayTeam?.short_name ||
        event?.away_team_name ||
        null,

      shortName:
        awayTeam?.short_name ||
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

  const direct =
    side === "home"

      ? [

          event?.home_score,

          event?.homeScore,

          event?.score?.home,

          event?.scores?.home

        ]

      : [

          event?.away_score,

          event?.awayScore,

          event?.score?.away,

          event?.scores?.away

        ];


  for (
    const value
    of direct
  ) {

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
// EVENT HOME NAME
// ==========================================================

function eventHomeName(
  event
) {

  return (

    event?.home_team?.name

    ||

    event?.home_team?.short_name

    ||

    event?.homeTeam?.name

    ||

    event?.homeTeam?.shortName

    ||

    event?.home_team_name

    ||

    ""

  );

}


// ==========================================================
// EVENT AWAY NAME
// ==========================================================

function eventAwayName(
  event
) {

  return (

    event?.away_team?.name

    ||

    event?.away_team?.short_name

    ||

    event?.awayTeam?.name

    ||

    event?.awayTeam?.shortName

    ||

    event?.away_team_name

    ||

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

    team?.name

    ||

    team?.short_name

    ||

    team?.team_name

    ||

    ""

  );

}


// ==========================================================
// EVENT DATE
// ==========================================================

function getEventDate(
  event
) {

  const value =

    event?.date

    ||

    event?.utc_date

    ||

    event?.start_time

    ||

    event?.kickoff

    ||

    event?.datetime

    ||

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
    "finished"
  ) {

    return "FINISHED";

  }


  if (
    value ===
    "live"
  ) {

    return "LIVE";

  }


  if (
    value ===
    "upcoming" ||
    value ===
    "scheduled"
  ) {

    return "SCHEDULED";

  }


  if (
    value ===
    "cancelled"
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
// DATE FORMAT
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
// NAME NORMALIZATION
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
      /\b(fc|cf|afc|sc|ac|fk|club|utd|united)\b/g,
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

  if (
    !first ||
    !second
  ) {

    return false;

  }


  if (
    first === second

    ||

    first.includes(
      second
    )

    ||

    second.includes(
      first
    )
  ) {

    return true;

  }


  const firstTokens =
    new Set(

      first
        .split(
          " "
        )
        .filter(
          token =>
            token.length >= 3
        )

    );


  const secondTokens =
    second
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 3
      );


  if (
    !firstTokens.size ||
    !secondTokens.length
  ) {

    return false;

  }


  const common =
    secondTokens.filter(
      token =>
        firstTokens.has(
          token
        )
    );


  /*
   * Require at least one meaningful token.
   *
   * This is intentionally conservative because
   * a false fixture match is worse than no match.
   */

  return common.length >= 1;

}


// ==========================================================
// STRONG NAME MATCH
// ==========================================================

function strongNameMatch(
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


  const firstTokens =
    first
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 4
      );


  const secondTokens =
    second
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 4
      );


  if (
    !firstTokens.length ||
    !secondTokens.length
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
// REGISTER
// ==========================================================

const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;
