import {
  DataProvider,
  registerProvider
} from "./providers.js";


/* ==========================================================
   ESPN API
========================================================== */

const SITE_API =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const WEB_API =
  "https://site.web.api.espn.com/apis/site/v2/sports/soccer";


/* ==========================================================
   SETTINGS
========================================================== */

const HISTORY_LIMIT = 15;


/*
* البحث عن المباراة:
*
* 60 يومًا قبل اليوم
* 90 يومًا بعد اليوم
*/

const MATCH_BACK_DAYS = 60;

const MATCH_FORWARD_DAYS = 90;


/*
* fallback التاريخ:
*
* آخر 365 يومًا.
*/

const HISTORY_BACK_DAYS = 365;


/*
* حجم كل طلب scoreboard.
*/

const SCOREBOARD_CHUNK_DAYS = 7;


/*
* مهلة طلب ESPN.
*/

const REQUEST_TIMEOUT_MS = 15000;


/* ==========================================================
   PROVIDER
========================================================== */

class ESPNProvider
  extends DataProvider {

  constructor() {

    super(
      "ESPN"
    );

  }


  /* ========================================================
     GET MATCH DATA
  ======================================================== */

  async getMatchData(
    home,
    away,
    env
  ) {

    try {

      if (
        !home ||
        !away
      ) {

        return {

          status:
            "invalid_request",

          message:
            "يجب تحديد الفريق المضيف والفريق الضيف.",

          data:
            null

        };

      }


      /*
       * =====================================================
       * STEP 1
       * البحث عن المباراة
       * =====================================================
       */

      const exact =
        await findMatchFromESPN(
          home,
          away
        );


      /*
       * لا توجد مباراة.
       */

      if (
        !exact
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل بنجاح، لكن لم يتم العثور على المباراة ضمن نطاق البحث.",

          data: {

            source:
              "espn",

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
              false

          }

        };

      }


      const homeId =
        exact.homeTeam?.id ||
        null;


      const awayId =
        exact.awayTeam?.id ||
        null;


      /*
       * =====================================================
       * STEP 2
       * جلب تاريخ الفريقين
       * =====================================================
       */

      const [
        homeMatches,
        awayMatches
      ] =
        await Promise.all([

          getTeamHistory(
            homeId,
            exact.homeTeam?.name
          ),

          getTeamHistory(
            awayId,
            exact.awayTeam?.name
          )

        ]);


      /*
       * =====================================================
       * STEP 3
       * النتيجة
       * =====================================================
       */

      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبيانات التاريخ عبر ESPN.",

        data: {

          source:
            "espn",

          available:
            true,

          matchFound:
            true,

          fixture:
            normalizeFixture(
              exact
            ),

          recentMatches: {

            home:
              homeMatches,

            away:
              awayMatches

          },

          historyAvailable:
            homeMatches.length > 0 ||
            awayMatches.length > 0

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
          String(error),

        data:
          null

      };

    }

  }

}


/* ==========================================================
   FIND MATCH FROM ESPN
========================================================== */

async function findMatchFromESPN(
  home,
  away
) {

  const today =
    new Date();


  const dates =
    buildDateRange(
      today,
      MATCH_BACK_DAYS,
      MATCH_FORWARD_DAYS
    );


  const chunks =
    chunkArray(
      dates,
      SCOREBOARD_CHUNK_DAYS
    );


  /*
   * نبحث بالتتابع بدل إرسال عشرات الطلبات
   * في نفس اللحظة.
   *
   * بمجرد العثور على المباراة نتوقف.
   */

  for (
    const chunk
    of chunks
  ) {

    const events =
      await fetchScoreboardRange(
        chunk[0],
        chunk[chunk.length - 1]
      );


    if (
      !events.length
    ) {

      continue;

    }


    /*
     * Home → Away
     */

    const exact =
      events.find(
        event =>

          namesMatch(
            event?.homeTeam?.name,
            home
          )

          &&

          namesMatch(
            event?.awayTeam?.name,
            away
          )
      );


    if (
      exact
    ) {

      return exact;

    }


    /*
     * fallback:
     *
     * قد تأتي المباراة معكوسة
     * في بعض البيانات.
     *
     * نرجع المباراة مع إعادة ترتيب
     * home / away.
     */

    const reversed =
      events.find(
        event =>

          namesMatch(
            event?.homeTeam?.name,
            away
          )

          &&

          namesMatch(
            event?.awayTeam?.name,
            home
          )
      );


    if (
      reversed
    ) {

      return {

        ...reversed,

        homeTeam:
          reversed.awayTeam,

        awayTeam:
          reversed.homeTeam,

        score: {

          fullTime: {

            home:
              reversed?.score?.fullTime?.away ??
              null,

            away:
              reversed?.score?.fullTime?.home ??
              null

          }

        }

      };

    }

  }


  return null;

}


/* ==========================================================
   SCOREBOARD RANGE
========================================================== */

async function fetchScoreboardRange(
  startDate,
  endDate
) {

  const urls = [

    `${SITE_API}/all/scoreboard` +
    `?dates=${startDate}-${endDate}` +
    `&limit=1000`,

    `${WEB_API}/all/scoreboard` +
    `?dates=${startDate}-${endDate}` +
    `&limit=1000`

  ];


  for (
    const url
    of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      if (
        Array.isArray(
          data?.events
        )
      ) {

        return data.events

          .map(
            normalizeScoreboardEvent
          )

          .filter(
            Boolean
          );

      }

    } catch {

      /*
       * fallback إلى URL التالي
       */

    }

  }


  return [];

}


/* ==========================================================
   GET TEAM HISTORY
========================================================== */

async function getTeamHistory(
  teamId,
  teamName
) {

  if (
    !teamId
  ) {

    return [];

  }


  /*
   * ========================================================
   * METHOD 1
   * WEB API
   * ========================================================
   */

  const webUrls = [

    `${WEB_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?fixture=true&limit=1000`,

    `${WEB_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?limit=1000`

  ];


  for (
    const url
    of webUrls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      const matches =
        normalizeTeamSchedule(
          data,
          teamId
        );


      if (
        matches.length > 0
      ) {

        return matches
          .slice(
            0,
            HISTORY_LIMIT
          );

      }

    } catch {

      /*
       * fallback
       */

    }

  }


  /*
   * ========================================================
   * METHOD 2
   * SITE API
   * ========================================================
   */

  const siteUrls = [

    `${SITE_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?fixture=true&limit=1000`,

    `${SITE_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?limit=1000`

  ];


  for (
    const url
    of siteUrls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      const matches =
        normalizeTeamSchedule(
          data,
          teamId
        );


      if (
        matches.length > 0
      ) {

        return matches
          .slice(
            0,
            HISTORY_LIMIT
          );

      }

    } catch {

      /*
       * fallback
       */

    }

  }


  /*
   * ========================================================
   * METHOD 3
   * SCOREBOARD FALLBACK
   * ========================================================
   */

  return await findTeamHistoryFromScoreboards(
    teamId,
    teamName
  );

}


/* ==========================================================
   NORMALIZE TEAM SCHEDULE
========================================================== */

function normalizeTeamSchedule(
  schedule,
  teamId
) {

  let events =
    Array.isArray(
      schedule?.events
    )
      ? schedule.events
      : [];


  /*
   * بعض ESPN responses
   * قد تحتوي calendar.
   */

  if (
    events.length === 0 &&
    Array.isArray(
      schedule?.calendar
    )
  ) {

    events =
      schedule.calendar;

  }


  const normalized =
    [];


  for (
    const event
    of events
  ) {

    const item =
      normalizeScoreboardEvent(
        event
      );


    if (
      !item
    ) {

      continue;

    }


    if (
      item.status !==
      "FINISHED"
    ) {

      continue;

    }


    if (
      !isTeamEvent(
        item,
        teamId
      )
    ) {

      continue;

    }


    if (
      !hasValidScore(
        item
      )
    ) {

      continue;

    }


    normalized.push(
      item
    );

  }


  return dedupeAndSortMatches(
    normalized
  );

}


/* ==========================================================
   SCOREBOARD HISTORY FALLBACK
========================================================== */

async function findTeamHistoryFromScoreboards(
  teamId,
  teamName
) {

  const today =
    new Date();


  const start =
    new Date(
      today
    );


  start.setDate(
    start.getDate() -
    HISTORY_BACK_DAYS
  );


  const dates =
    buildDateRange(
      start,
      0,
      HISTORY_BACK_DAYS
    );


  const chunks =
    chunkArray(
      dates,
      SCOREBOARD_CHUNK_DAYS
    );


  const allMatches =
    [];


  /*
   * نبحث من الأحدث إلى الأقدم.
   *
   * وبمجرد أن نحصل على 15 مباراة
   * يمكن التوقف.
   */

  for (
    let i =
      chunks.length - 1;

    i >= 0;

    i--
  ) {

    const chunk =
      chunks[i];


    const events =
      await fetchScoreboardRange(
        chunk[0],
        chunk[chunk.length - 1]
      );


    if (
      !events.length
    ) {

      continue;

    }


    const teamEvents =
      events.filter(
        event => {

          if (
            isTeamEvent(
              event,
              teamId
            )
          ) {

            return true;

          }


          /*
           * fallback بالاسم.
           */

          if (
            teamName
          ) {

            return (

              namesMatch(
                event?.homeTeam?.name,
                teamName
              )

              ||

              namesMatch(
                event?.awayTeam?.name,
                teamName
              )

            );

          }


          return false;

        }
      );


    const finished =
      teamEvents.filter(
        event =>

          event?.status ===
          "FINISHED"

          &&

          hasValidScore(
            event
          )
      );


    allMatches.push(
      ...finished
    );


    const unique =
      dedupeAndSortMatches(
        allMatches
      );


    if (
      unique.length >=
      HISTORY_LIMIT
    ) {

      return unique.slice(
        0,
        HISTORY_LIMIT
      );

    }

  }


  return dedupeAndSortMatches(
    allMatches
  )
    .slice(
      0,
      HISTORY_LIMIT
    );

}


/* ==========================================================
   IS TEAM EVENT
========================================================== */

function isTeamEvent(
  event,
  teamId
) {

  if (
    !event ||
    !teamId
  ) {

    return false;

  }


  const target =
    String(
      teamId
    );


  return (

    String(
      event?.homeTeam?.id ||
      ""
    ) ===
    target

    ||

    String(
      event?.awayTeam?.id ||
      ""
    ) ===
    target

  );

}


/* ==========================================================
   VALID SCORE
========================================================== */

function hasValidScore(
  event
) {

  const home =
    event?.score?.fullTime?.home;


  const away =
    event?.score?.fullTime?.away;


  return (

    Number.isFinite(
      Number(home)
    )

    &&

    Number.isFinite(
      Number(away)
    )

  );

}


/* ==========================================================
   DEDUPE + SORT
========================================================== */

function dedupeAndSortMatches(
  matches
) {

  const map =
    new Map();


  for (
    const match
    of matches
  ) {

    const key =
      match?.id ||

      [
        match?.utcDate,
        match?.homeTeam?.id,
        match?.awayTeam?.id
      ].join(
        "|"
      );


    if (
      !map.has(
        key
      )
    ) {

      map.set(
        key,
        match
      );

    }

  }


  return Array.from(
    map.values()
  )

    .sort(
      (
        a,
        b
      ) =>

        new Date(
          b?.utcDate ||
          0
        )

        -

        new Date(
          a?.utcDate ||
          0
        )
    );

}


/* ==========================================================
   NORMALIZE SCOREBOARD EVENT
========================================================== */

function normalizeScoreboardEvent(
  event
) {

  if (
    !event
  ) {

    return null;

  }


  const competition =
    event?.competitions?.[0];


  const competitors =
    Array.isArray(
      competition?.competitors
    )
      ? competition.competitors
      : [];


  if (
    competitors.length < 2
  ) {

    return null;

  }


  const home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    );


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    );


  if (
    !home ||
    !away
  ) {

    return null;

  }


  const type =
    competition?.status?.type ||
    event?.status?.type ||
    {};


  const completed =
    Boolean(
      type?.completed
    );


  const state =
    type?.state ||
    null;


  let status =
    "SCHEDULED";


  if (
    completed ||
    state === "post"
  ) {

    status =
      "FINISHED";

  }


  if (
    state === "in"
  ) {

    status =
      "LIVE";

  }


  const homeScore =
    finiteOrNull(
      home?.score
    );


  const awayScore =
    finiteOrNull(
      away?.score
    );


  /*
   * league
   */

  const league =
    event?.league?.slug ||

    event?.league?.abbreviation ||

    event?.competition?.league?.slug ||

    competition?.league?.slug ||

    null;


  return {

    id:
      String(
        event?.id ||
        competition?.id ||
        ""
      ),

    utcDate:
      event?.date ||
      competition?.date ||
      null,

    status,

    homeTeam: {

      id:
        home?.team?.id ||
        null,

      name:
        home?.team?.displayName ||
        home?.team?.name ||
        home?.team?.shortDisplayName ||
        null,

      shortName:
        home?.team?.abbreviation ||
        home?.team?.shortDisplayName ||
        home?.team?.name ||
        null

    },

    awayTeam: {

      id:
        away?.team?.id ||
        null,

      name:
        away?.team?.displayName ||
        away?.team?.name ||
        away?.team?.shortDisplayName ||
        null,

      shortName:
        away?.team?.abbreviation ||
        away?.team?.shortDisplayName ||
        away?.team?.name ||
        null

    },

    score: {

      fullTime: {

        home:
          completed ||
          state === "post"

            ? homeScore

            : null,

        away:
          completed ||
          state === "post"

            ? awayScore

            : null

      }

    },

    tournament:
      league ||

      event?.season?.slug ||

      competition?.league?.name ||

      null

  };

}


/* ==========================================================
   FIXTURE NORMALIZATION
========================================================== */

function normalizeFixture(
  event
) {

  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.utcDate ||
      null,

    status:
      event?.status ||
      "SCHEDULED",

    homeTeam:
      event?.homeTeam ||
      {

        id:
          null,

        name:
          null,

        shortName:
          null

      },

    awayTeam:
      event?.awayTeam ||
      {

        id:
          null,

        name:
          null,

        shortName:
          null

      },

    score:
      event?.score ||
      {

        fullTime: {

          home:
            null,

          away:
            null

        }

      },

    tournament:
      event?.tournament ||
      null

  };

}


/* ==========================================================
   FETCH JSON
========================================================== */

async function fetchJSON(
  url
) {

  let controller =
    null;

  let timeout =
    null;


  /*
   * AbortController قد لا يكون متاحًا
   * في بعض البيئات القديمة.
   */

  if (
    typeof AbortController !==
    "undefined"
  ) {

    controller =
      new AbortController();


    timeout =
      setTimeout(
        () => {

          try {

            controller.abort();

          } catch {

            /*
             * ignore
             */

          }

        },
        REQUEST_TIMEOUT_MS
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

            Accept:
              "application/json",

            "User-Agent":
              "YCB-Football-Prediction-Engine"

          },

          signal:
            controller?.signal

        }
      );


    const text =
      await response.text();


    if (
      !response.ok
    ) {

      throw new Error(
        `ESPN HTTP ${response.status}`
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
        "ESPN returned invalid JSON"
      );

    }

  } finally {

    if (
      timeout
    ) {

      clearTimeout(
        timeout
      );

    }

  }

}


/* ==========================================================
   BUILD DATE RANGE
========================================================== */

function buildDateRange(
  startDate,
  backDays,
  forwardDays
) {

  const dates =
    [];


  for (
    let offset =
      -backDays;

    offset <=
      forwardDays;

    offset++
  ) {

    const date =
      new Date(
        startDate
      );


    date.setDate(
      date.getDate() +
      offset
    );


    dates.push(
      formatESPNDate(
        date
      )
    );

  }


  return dates;

}


/* ==========================================================
   ESPN DATE
========================================================== */

function formatESPNDate(
  date
) {

  const year =
    date.getUTCFullYear();


  const month =
    String(
      date.getUTCMonth() +
      1
    )
      .padStart(
        2,
        "0"
      );


  const day =
    String(
      date.getUTCDate()
    )
      .padStart(
        2,
        "0"
      );


  return (
    `${year}${month}${day}`
  );

}


/* ==========================================================
   CHUNK ARRAY
========================================================== */

function chunkArray(
  array,
  size
) {

  const result =
    [];


  for (
    let i = 0;

    i < array.length;

    i += size
  ) {

    result.push(
      array.slice(
        i,
        i + size
      )
    );

  }


  return result;

}


/* ==========================================================
   NAME NORMALIZATION
========================================================== */

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
      /\b(fc|cf|afc|sc|ac|fk|club|the|football|futbol|calcio)\b/g,
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


/* ==========================================================
   NAME MATCH
========================================================== */

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


  /*
   * exact
   */

  if (
    a === b
  ) {

    return true;

  }


  /*
   * contains
   */

  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }


  /*
   * token matching
   */

  const ta =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const tb =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    ta.size === 0 ||
    tb.length === 0
  ) {

    return false;

  }


  const overlap =
    tb.filter(
      token =>
        ta.has(token)
    ).length;


  /*
   * نحتاج تطابق كافٍ.
   */

  return (
    overlap >=
    Math.min(
      2,
      tb.length
    )
  );

}


/* ==========================================================
   NUMBER
========================================================== */

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


/* ==========================================================
   REGISTER
========================================================== */

const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
