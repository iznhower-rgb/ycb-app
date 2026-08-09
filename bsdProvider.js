// Y.C.B BSD PROVIDER
// Bzzoiro Sports Data

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://sports.bzzoiro.com";


class BSDProvider extends DataProvider {

  constructor() {

    super(
      "BSD"
    );

  }


  async getMatchData(
    home,
    away,
    env = {}
  ) {

    const token =
      env?.BSD_API_KEY;


    if (!token) {

      return {

        status:
          "not_configured",

        message:
          "BSD API key غير مهيأ.",

        data: {

          source:
            "bsd",

          available:
            false,

          matchFound:
            false

        }

      };

    }


    try {

      const now =
        new Date();


      /*
       * نطاق واسع للبحث عن المباراة.
       */

      const from =
        shiftDate(
          now,
          -365
        );


      const to =
        shiftDate(
          now,
          365
        );


      /*
       * جلب مباريات الفريق المضيف.
       */

      const homeEvents =
        await getTeamEvents(
          home,
          from,
          to,
          token
        );


      /*
       * جلب مباريات الفريق الضيف.
       */

      const awayEvents =
        await getTeamEvents(
          away,
          from,
          to,
          token
        );


      /*
       * دمج النتائج وإزالة التكرار.
       */

      const allEvents =
        dedupeEvents(
          [
            ...homeEvents,
            ...awayEvents
          ]
        );


      /*
       * البحث عن المباراة المطلوبة.
       */

      const fixture =
        findMatch(
          allEvents,
          home,
          away
        );


      /*
       * آخر مباريات الفريقين.
       */

      const homeRecent =
        await getRecentMatches(
          home,
          token
        );


      const awayRecent =
        await getRecentMatches(
          away,
          token
        );


      return {

        status:
          fixture
            ? "success"
            : "api_ok_no_match",

        message:

          fixture

            ? "تم العثور على المباراة وبياناتها عبر BSD."

            : "BSD متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

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
              homeRecent.map(
                normalizeEvent
              ),

            away:
              awayRecent.map(
                normalizeEvent
              )

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          error?.message
            ?.includes(
              "HTTP 401"
            )

            ? "auth_error"

            : "network_error",

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }

  }

}


/* =========================================================
   GET TEAM EVENTS
   ========================================================= */

async function getTeamEvents(
  team,
  from,
  to,
  token
) {

  const url =
    new URL(
      `${API}/api/events/`
    );


  url.searchParams.set(
    "team",
    team
  );


  url.searchParams.set(
    "date_from",
    formatDate(
      from
    )
  );


  url.searchParams.set(
    "date_to",
    formatDate(
      to
    )
  );


  url.searchParams.set(
    "limit",
    "200"
  );


  const data =
    await fetchJSON(
      url.toString(),
      token
    );


  if (
    Array.isArray(
      data?.results
    )
  ) {

    return data.results;

  }


  if (
    Array.isArray(
      data?.events
    )
  ) {

    return data.events;

  }


  return [];

}


/* =========================================================
   RECENT MATCHES
   ========================================================= */

async function getRecentMatches(
  team,
  token
) {

  const now =
    new Date();


  const from =
    shiftDate(
      now,
      -180
    );


  const data =
    await getTeamEvents(
      team,
      from,
      now,
      token
    );


  return data

    .filter(
      event =>
        isFinished(
          event
        )
    )

    .sort(
      (
        a,
        b
      ) =>

        getTimestamp(
          b
        ) -

        getTimestamp(
          a
        )
    )

    .slice(
      0,
      15
    );

}


/* =========================================================
   FETCH JSON
   ========================================================= */

async function fetchJSON(
  url,
  token
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          "Accept":
            "application/json",

          "Authorization":
            `Token ${token}`

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

    throw new Error(
      `BSD HTTP ${response.status}`
    );

  }


  return data;

}


/* =========================================================
   FIND MATCH
   ========================================================= */

function findMatch(
  events,
  home,
  away
) {

  const wantedHome =
    normalizeName(
      home
    );


  const wantedAway =
    normalizeName(
      away
    );


  if (
    !wantedHome ||
    !wantedAway
  ) {

    return null;

  }


  return events.find(
    event => {

      const eventHome =
        getEventTeamName(
          event,
          "home"
        );


      const eventAway =
        getEventTeamName(
          event,
          "away"
        );


      return (

        namesMatch(
          eventHome,
          wantedHome
        )

        &&

        namesMatch(
          eventAway,
          wantedAway
        )

      );

    }
  ) || null;

}


/* =========================================================
   EXTRACT TEAM NAME
   ========================================================= */

function getEventTeamName(
  event,
  side
) {

  if (
    side === "home"
  ) {

    return extractTeamName(
      event?.home_team,
      event?.homeTeam,
      event?.home,
      event?.home_team_name,
      event?.homeTeamName,
      event?.home_name
    );

  }


  return extractTeamName(
    event?.away_team,
    event?.awayTeam,
    event?.away,
    event?.away_team_name,
    event?.awayTeamName,
    event?.away_name
  );

}


/* =========================================================
   EXTRACT TEAM NAME FROM ANY FORMAT
   ========================================================= */

function extractTeamName(
  ...values
) {

  for (
    const value
    of values
  ) {

    if (
      typeof value ===
      "string"
    ) {

      if (
        value.trim()
      ) {

        return normalizeName(
          value
        );

      }

    }


    if (
      value &&
      typeof value ===
      "object"
    ) {

      const name =
        value.name ||

        value.team_name ||

        value.teamName ||

        value.short_name ||

        value.shortName ||

        value.title;


      if (
        name
      ) {

        return normalizeName(
          name
        );

      }

    }

  }


  return "";

}


/* =========================================================
   NORMALIZE EVENT
   ========================================================= */

function normalizeEvent(
  event
) {

  const homeName =
    getEventTeamName(
      event,
      "home"
    );


  const awayName =
    getEventTeamName(
      event,
      "away"
    );


  const homeObject =
    getTeamObject(
      event,
      "home"
    );


  const awayObject =
    getTeamObject(
      event,
      "away"
    );


  const homeScore =
    firstNumber(
      event?.home_score,
      event?.homeScore,
      event?.score?.home,
      event?.score?.fullTime?.home,
      event?.scores?.home,
      event?.result?.home
    );


  const awayScore =
    firstNumber(
      event?.away_score,
      event?.awayScore,
      event?.score?.away,
      event?.score?.fullTime?.away,
      event?.scores?.away,
      event?.result?.away
    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      toISODate(
        event
      ),

    status:
      isFinished(
        event
      )
        ? "FINISHED"
        : String(
            event?.status?.type ||
            event?.status ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        homeObject?.id ||
        event?.home_team_id ||
        null,

      name:
        homeName ||
        null,

      shortName:
        homeObject?.short_name ||
        homeObject?.shortName ||
        null

    },

    awayTeam: {

      id:
        awayObject?.id ||
        event?.away_team_id ||
        null,

      name:
        awayName ||
        null,

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

      event?.tournament?.name ||

      event?.league_name ||

      event?.competition?.name ||

      null

  };

}


/* =========================================================
   GET TEAM OBJECT
   ========================================================= */

function getTeamObject(
  event,
  side
) {

  const value =
    side === "home"

      ? (
          event?.home_team ||
          event?.homeTeam ||
          event?.home
        )

      : (
          event?.away_team ||
          event?.awayTeam ||
          event?.away
        );


  return (
    value &&
    typeof value === "object"
  )

    ? value

    : {};

}


/* =========================================================
   FINISHED
   ========================================================= */

function isFinished(
  event
) {

  const status =
    String(

      event?.status?.type ||

      event?.status?.name ||

      event?.status ||

      ""

    ).toLowerCase();


  return (

    status ===
      "finished"

    ||

    status ===
      "completed"

    ||

    status ===
      "after_extra_time"

    ||

    status ===
      "after_penalties"

    ||

    status ===
      "ft"

  );

}


/* =========================================================
   FIRST NUMBER
   ========================================================= */

function firstNumber(
  ...values
) {

  for (
    const value
    of values
  ) {

    if (
      value ===
      null ||

      value ===
      undefined ||

      value ===
      ""
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


/* =========================================================
   DATE
   ========================================================= */

function toISODate(
  event
) {

  const timestamp =
    event?.start_timestamp ||

    event?.startTimestamp ||

    event?.timestamp;


  if (
    Number.isFinite(
      Number(
        timestamp
      )
    )
  ) {

    return new Date(
      Number(
        timestamp
      ) *
      1000
    ).toISOString();

  }


  const date =
    event?.date ||

    event?.start_date ||

    event?.startDate ||

    event?.utcDate;


  if (
    date
  ) {

    const parsed =
      new Date(
        date
      );


    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {

      return parsed.toISOString();

    }

  }


  return null;

}


/* =========================================================
   TIMESTAMP
   ========================================================= */

function getTimestamp(
  event
) {

  const date =
    toISODate(
      event
    );


  return date

    ? new Date(
        date
      ).getTime()

    : 0;

}


/* =========================================================
   DEDUPE
   ========================================================= */

function dedupeEvents(
  events
) {

  const seen =
    new Set();


  return events.filter(
    event => {

      const home =
        getEventTeamName(
          event,
          "home"
        );


      const away =
        getEventTeamName(
          event,
          "away"
        );


      const key =
        String(

          event?.id ||

          [
            event?.start_timestamp ||
            event?.startTimestamp ||
            event?.timestamp ||
            "",

            home,

            away

          ].join("|")

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


/* =========================================================
   DATE SHIFT
   ========================================================= */

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


/* =========================================================
   FORMAT DATE
   ========================================================= */

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


/* =========================================================
   NORMALIZE NAME
   ========================================================= */

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


/* =========================================================
   NAME MATCH
   ========================================================= */

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


  const aTokens =
    new Set(
      a
        .split(
          " "
        )
        .filter(
          token =>
            token.length >= 3
        )
    );


  const bTokens =
    b
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 3
      );


  if (
    !aTokens.size ||
    !bTokens.length
  ) {

    return false;

  }


  /*
   * إذا كان هناك تطابق لجزء مهم من الاسم.
   */

  let matches =
    0;


  for (
    const token
    of bTokens
  ) {

    if (
      aTokens.has(
        token
      )
    ) {

      matches++;

    }

  }


  return (
    matches >= 1
  );

}


/* =========================================================
   REGISTER PROVIDER
   ========================================================= */

const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;
