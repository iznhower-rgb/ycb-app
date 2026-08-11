// ==========================================================
// Y.C.B BSD PROVIDER 3.1.0
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


// ==========================================================
// PROVIDER
// ==========================================================

class BSDProvider extends DataProvider {

  constructor() {

    super("BSD");

  }


  async getMatchData(
    home,
    away,
    env
  ) {

    const startedAt =
      Date.now();

    try {

      const homeName =
        String(
          home || ""
        ).trim();

      const awayName =
        String(
          away || ""
        ).trim();


      if (
        !homeName ||
        !awayName
      ) {

        return {

          status:
            "configuration_error",

          message:
            "اسم الفريق المضيف أو الضيف مفقود.",

          data: {

            source:
              "bsd",

            providerVersion:
              PROVIDER_VERSION,

            available:
              false,

            matchFound:
              false

          }

        };

      }


      const apiKey =
        String(
          env?.BSD_API_KEY ||
          env?.BSD_KEY ||
          env?.SPORTS_BSD_API_KEY ||
          ""
        ).trim();


      if (!apiKey) {

        return {

          status:
            "configuration_error",

          message:
            "BSD_API_KEY غير موجود في Environment Variables.",

          data: {

            source:
              "bsd",

            providerVersion:
              PROVIDER_VERSION,

            available:
              false,

            matchFound:
              false

          }

        };

      }


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


      let fixture =
        await findFixture(
          homeName,
          awayName,
          homeTeam,
          awayTeam,
          apiKey
        );


      let homeRecent =
        [];

      let awayRecent =
        [];


      if (
        homeTeam?.id
      ) {

        homeRecent =
          await getTeamFixtures(
            homeTeam.id,
            apiKey
          );

      }


      if (
        awayTeam?.id
      ) {

        awayRecent =
          await getTeamFixtures(
            awayTeam.id,
            apiKey
          );

      }


      if (
        !fixture
      ) {

        fixture =
          findMatchingEvent(
            [
              ...homeRecent,
              ...awayRecent
            ],
            homeName,
            awayName
          );

      }


      const normalizedHome =
        normalizeRecentMatches(
          homeRecent,
          homeName
        );


      const normalizedAway =
        normalizeRecentMatches(
          awayRecent,
          awayName
        );


      const hasHistory =
        normalizedHome.length > 0 ||
        normalizedAway.length > 0;


      if (
        !fixture &&
        !hasHistory
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "BSD متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية.",

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

            durationMs:
              Date.now() -
              startedAt

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

            ? "تم العثور على المباراة وبياناتها عبر BSD."

            : "تم العثور على بيانات تاريخية عبر BSD، لكن لم يتم التحقق من المباراة.",

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

          historyAvailable:
            hasHistory,

          historyCount: {

            home:
              normalizedHome.length,

            away:
              normalizedAway.length

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
            false

        }

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

  if (
    !name
  ) {

    return null;

  }


  try {

    const url =
      `${API}/teams/?search=` +
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
      teams.length === 0
    ) {

      return null;

    }


    const target =
      normalizeName(
        name
      );


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


    return (
      matched ||
      teams[0] ||
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

  if (
    homeTeam?.id
  ) {

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

  }


  if (
    awayTeam?.id
  ) {

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

  }


  try {

    const now =
      new Date();


    const from =
      new Date(
        now.getTime()
      );


    from.setDate(
      from.getDate() - 7
    );


    const to =
      new Date(
        now.getTime()
      );


    to.setDate(
      to.getDate() + 45
    );


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

  if (
    !teamId
  ) {

    return [];

  }


  try {

    const url =
      `${API}/teams/` +
      encodeURIComponent(
        String(
          teamId
        )
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
          ) &&

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
          ) &&

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
          ).getTime() -

          new Date(
            dateA || 0
          ).getTime()
        );

      }
    )

    .slice(
      0,
      15
    )

    .map(
      normalizeEvent
    )

    .filter(
      Boolean
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
      response.status === 401
    ) {

      throw new Error(
        "BSD HTTP 401 — API key مفقود أو غير صالح."
      );

    }


    if (
      response.status === 403
    ) {

      throw new Error(
        "BSD HTTP 403 — الوصول إلى BSD API مرفوض."
      );

    }


    if (
      response.status === 404
    ) {

      throw new Error(
        "BSD HTTP 404 — مسار API غير موجود."
      );

    }


    if (
      response.status === 429
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
        event?.home_team_id ||
        null,

      name:
        homeTeam?.name ||
        homeTeam?.short_name ||
        event?.home_team_name ||
        null,

      shortName:
        homeTeam?.short_name ||
        homeTeam?.name ||
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
// SCORE
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

          event?.home_team_score

        ]

      : [

          event?.away_score,

          event?.awayScore,

          event?.score?.away,

          event?.scores?.away,

          event?.away?.score,

          event?.away_team_score

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

    event?.home_team_name ||

    event?.home?.name ||

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

    event?.away_team_name ||

    event?.away?.name ||

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

    event?.date ||

    event?.utc_date ||

    event?.start_time ||

    event?.kickoff ||

    event?.datetime ||

    event?.startTime ||

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
    ) !== null &&

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
