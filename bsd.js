// Y.C.B BSD PROVIDER 2.3.0
// Bzzoiro Sports Data
// Safe browser provider


import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://sports.bzzoiro.com";


const REQUEST_TIMEOUT =
  15000;


/* ==========================================
   PROVIDER
========================================== */

class BSDProvider
  extends DataProvider {

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
      String(
        env?.BSD_API_KEY ||
        ""
      ).trim();


    if (
      !token
    ) {

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


      const [
        homeEvents,
        awayEvents
      ] = await Promise.all([

        getTeamEvents(
          home,
          from,
          to,
          token
        ),

        getTeamEvents(
          away,
          from,
          to,
          token
        )

      ]);


      const allEvents =
        dedupeEvents([
          ...homeEvents,
          ...awayEvents
        ]);


      const fixture =
        findMatch(
          allEvents,
          home,
          away
        );


      const [
        homeRecent,
        awayRecent
      ] = await Promise.all([

        getRecentMatches(
          home,
          token
        ),

        getRecentMatches(
          away,
          token
        )

      ]);


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

      const status =
        classifyBSDError(
          error
        );


      return {

        status:
          status.status,

        message:
          status.message,

        data: {

          source:
            "bsd",

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
   TEAM EVENTS
========================================== */

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


  if (
    Array.isArray(
      data
    )
  ) {

    return data;

  }


  return [];

}


/* ==========================================
   RECENT
========================================== */

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


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url,
  token
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
        () =>
          controller.abort(),
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
              "application/json",

            "Authorization":
              `Token ${token}`

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
          `BSD HTTP ${response.status}`
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

    if (
      error?.httpStatus
    ) {

      throw error;

    }


    const wrapped =
      new Error(
        error?.message ||
        "BSD request failed."
      );


    wrapped.originalError =
      error;


    throw wrapped;

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
   ERROR
========================================== */

function classifyBSDError(
  error
) {

  const status =
    Number(
      error?.httpStatus
    );


  if (
    status === 401 ||
    status === 403
  ) {

    return {

      status:
        "access_blocked",

      message:
        `BSD رفض الوصول (HTTP ${status}).`

    };

  }


  if (
    status === 429
  ) {

    return {

      status:
        "rate_limited",

      message:
        "BSD وصل إلى حد الطلبات."

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
        "BSD لم يستجب خلال المهلة المحددة."

    };

  }


  const message =
    String(
      error?.message ||
      error ||
      ""
    );


  if (
    message
      .toLowerCase()
      .includes(
        "failed to fetch"
      )
  ) {

    return {

      status:
        "access_blocked",

      message:
        "BSD لم يسمح للمتصفح بالوصول إلى المصدر أو حدث حجب CORS."

    };

  }


  return {

    status:
      "network_error",

    message:
      message ||
      "BSD request failed."

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


  return (

    events.find(
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
    )

    ||

    null

  );

}


/* ==========================================
   EVENT TEAM NAME
========================================== */

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


/* ==========================================
   EXTRACT TEAM
========================================== */

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


/* ==========================================
   NORMALIZE EVENT
========================================== */

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


/* ==========================================
   TEAM OBJECT
========================================== */

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
    typeof value ===
      "object"
  )

    ? value

    : {};

}


/* ==========================================
   FINISHED
========================================== */

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

    status === "finished" ||

    status === "completed" ||

    status === "after_extra_time" ||

    status === "after_penalties" ||

    status === "ft"

  );

}


/* ==========================================
   FIRST NUMBER
========================================== */

function firstNumber(
  ...values
) {

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


/* ==========================================
   DATE
========================================== */

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


/* ==========================================
   TIMESTAMP
========================================== */

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


/* ==========================================
   DEDUPE
========================================== */

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
   FORMAT DATE
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
   NORMALIZE NAME
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


  const aTokens =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const bTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  return bTokens.some(
    token =>
      aTokens.has(
        token
      )
  );

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
   REGISTER
========================================== */

const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;
