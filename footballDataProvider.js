// Y.C.B - FOOTBALL-DATA.ORG PROVIDER 2.4.0
// Safe provider
// Browser-safe error handling
// Never breaks complete Y.C.B analysis


import {
  DataProvider,
  registerProvider
} from "./providers.js";


const BASE =
  "https://api.football-data.org/v4";


const PROVIDER_NAME =
  "Football-Data.org";


const DEFAULT_DAYS_BACK =
  30;


const DEFAULT_DAYS_FORWARD =
  30;


const MAX_RECENT_MATCHES =
  15;


const REQUEST_TIMEOUT =
  15000;


/* =========================================================
   PROVIDER
========================================================= */

class FootballDataProvider
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

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN ||
        ""
      ).trim();


    if (
      !token
    ) {

      return {

        status:
          "disabled",

        message:
          "Football-Data.org غير مفعل: FOOTBALL_DATA_TOKEN غير موجود.",

        data: {

          source:
            "football-data.org",

          available:
            false,

          matchFound:
            false

        }

      };

    }


    const homeName =
      normalizeName(
        home
      );


    const awayName =
      normalizeName(
        away
      );


    if (
      !homeName ||
      !awayName
    ) {

      return {

        status:
          "invalid_request",

        message:
          "اسم الفريقين غير صالح.",

        data:
          null

      };

    }


    const now =
      new Date();


    const from =
      formatDate(
        shiftDate(
          now,
          -DEFAULT_DAYS_BACK
        )
      );


    const to =
      formatDate(
        shiftDate(
          now,
          DEFAULT_DAYS_FORWARD
        )
      );


    const url =
      new URL(
        `${BASE}/matches`
      );


    url.searchParams.set(
      "dateFrom",
      from
    );


    url.searchParams.set(
      "dateTo",
      to
    );


    url.searchParams.set(
      "status",
      [
        "SCHEDULED",
        "LIVE",
        "IN_PLAY",
        "PAUSED",
        "FINISHED",
        "POSTPONED",
        "SUSPENDED",
        "CANCELLED"
      ].join(",")
    );


    url.searchParams.set(
      "limit",
      "100"
    );


    try {

      const payload =
        await fetchJSON(
          url.toString(),
          token
        );


      const matches =
        Array.isArray(
          payload?.matches
        )
          ? payload.matches
          : [];


      const requested =
        findRequestedMatch(
          matches,
          home,
          away
        );


      if (
        !requested
      ) {

        const homeRecent =
          getRecentMatches(
            matches,
            home,
            null
          );


        const awayRecent =
          getRecentMatches(
            matches,
            away,
            null
          );


        return {

          status:
            (
              homeRecent.length > 0 ||
              awayRecent.length > 0
            )
              ? "partial"
              : "api_ok_no_match",

          message:
            "Football-Data.org متصل، لكن المباراة المطلوبة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "football-data.org",

            available:
              true,

            matchFound:
              false,

            totalMatchesReturned:
              matches.length,

            searchRange: {

              dateFrom:
                from,

              dateTo:
                to

            },

            recentMatches: {

              home:
                homeRecent,

              away:
                awayRecent

            }

          }

        };

      }


      const fixture =
        normalizeMatch(
          requested
        );


      const homeRecent =
        getRecentMatches(
          matches,
          home,
          requested?.id
        );


      const awayRecent =
        getRecentMatches(
          matches,
          away,
          requested?.id
        );


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة عبر Football-Data.org.",

        data: {

          source:
            "football-data.org",

          available:
            true,

          matchFound:
            true,

          totalMatchesReturned:
            matches.length,

          fixture,

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

      const classified =
        classifyError(
          error
        );


      return {

        status:
          classified.status,

        message:
          classified.message,

        data: {

          source:
            "football-data.org",

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


/* =========================================================
   FETCH
========================================================= */

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

            "X-Auth-Token":
              token,

            "Accept":
              "application/json"

          },

          signal:
            controller?.signal

        }
      );


    const text =
      await response.text();


    const payload =
      safeJsonParse(
        text
      );


    if (
      !response.ok
    ) {

      const error =
        new Error(
          `Football-Data.org HTTP ${response.status}`
        );


      error.httpStatus =
        response.status;


      error.responseData =
        payload;


      throw error;

    }


    return payload;

  } catch (
    error
  ) {

    if (
      error?.httpStatus
    ) {

      throw error;

    }


    throw error;

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


/* =========================================================
   ERROR
========================================================= */

function classifyError(
  error
) {

  const httpStatus =
    Number(
      error?.httpStatus
    );


  if (
    httpStatus === 400 ||
    httpStatus === 401 ||
    httpStatus === 403
  ) {

    return {

      status:
        "disabled_invalid_token",

      message:
        "Football-Data.org غير متاح: التوكن غير صالح أو الوصول مرفوض."

    };

  }


  if (
    httpStatus === 429
  ) {

    return {

      status:
        "rate_limited",

      message:
        "Football-Data.org وصل إلى حد الطلبات."

    };

  }


  if (
    httpStatus === 404
  ) {

    return {

      status:
        "endpoint_not_found",

      message:
        "Football-Data.org endpoint غير موجود."

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
        "Football-Data.org لم يستجب خلال المهلة المحددة."

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
        "Football-Data.org لم يسمح للمتصفح بالوصول إلى المصدر أو حدث حجب CORS."

    };

  }


  return {

    status:
      "network_error",

    message:
      message ||
      "Football-Data.org network error."

  };

}


/* =========================================================
   FIND MATCH
========================================================= */

function findRequestedMatch(
  matches,
  home,
  away
) {

  const homeName =
    normalizeName(
      home
    );


  const awayName =
    normalizeName(
      away
    );


  let result =
    matches.find(
      match => {

        const matchHome =
          normalizeName(
            match?.homeTeam?.name
          );


        const matchAway =
          normalizeName(
            match?.awayTeam?.name
          );


        return (

          namesMatch(
            matchHome,
            homeName
          )

          &&

          namesMatch(
            matchAway,
            awayName
          )

        );

      }
    );


  if (
    result
  ) {

    return result;

  }


  result =
    matches.find(
      match => {

        const matchHome =
          normalizeName(
            match?.homeTeam?.name
          );


        const matchAway =
          normalizeName(
            match?.awayTeam?.name
          );


        return (

          nameSimilarity(
            matchHome,
            homeName
          ) >= 0.70

          &&

          nameSimilarity(
            matchAway,
            awayName
          ) >= 0.70

        );

      }
    );


  return result ||
    null;

}


/* =========================================================
   RECENT
========================================================= */

function getRecentMatches(
  matches,
  team,
  excludeId
) {

  const teamName =
    normalizeName(
      team
    );


  if (
    !teamName
  ) {

    return [];

  }


  return matches

    .filter(
      match => {

        if (
          match?.status !==
          "FINISHED"
        ) {

          return false;

        }


        if (
          excludeId &&
          String(
            match?.id ||
            ""
          ) ===
          String(
            excludeId
          )
        ) {

          return false;

        }


        const home =
          normalizeName(
            match?.homeTeam?.name
          );


        const away =
          normalizeName(
            match?.awayTeam?.name
          );


        return (

          namesMatch(
            home,
            teamName
          )

          ||

          namesMatch(
            away,
            teamName
          )

        );

      }
    )

    .sort(
      (a, b) => {

        const dateA =
          Date.parse(
            a?.utcDate ||
            ""
          );


        const dateB =
          Date.parse(
            b?.utcDate ||
            ""
          );


        return dateB -
          dateA;

      }
    )

    .slice(
      0,
      MAX_RECENT_MATCHES
    )

    .map(
      normalizeMatch
    );

}


/* =========================================================
   NORMALIZE
========================================================= */

function normalizeMatch(
  match
) {

  return {

    id:
      String(
        match?.id ||
        ""
      ),


    utcDate:
      match?.utcDate ||
      null,


    status:
      match?.status ||
      null,


    homeTeam: {

      id:
        match
          ?.homeTeam
          ?.id ??
        null,


      name:
        match
          ?.homeTeam
          ?.name ??
        null,


      shortName:
        match
          ?.homeTeam
          ?.shortName ||

        match
          ?.homeTeam
          ?.tla ||

        null

    },


    awayTeam: {

      id:
        match
          ?.awayTeam
          ?.id ??
        null,


      name:
        match
          ?.awayTeam
          ?.name ??
        null,


      shortName:
        match
          ?.awayTeam
          ?.shortName ||

        match
          ?.awayTeam
          ?.tla ||

        null

    },


    score: {

      fullTime: {

        home:
          finiteOrNull(
            match
              ?.score
              ?.fullTime
              ?.home
          ),


        away:
          finiteOrNull(
            match
              ?.score
              ?.fullTime
              ?.away
          )

      }

    },


    tournament:
      match
        ?.competition
        ?.name ||

      null

  };

}


/* =========================================================
   SAFE JSON
========================================================= */

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


/* =========================================================
   NUMBER
========================================================= */

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


/* =========================================================
   DATE
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
   NAME NORMALIZATION
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
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }


  const firstTokens =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const secondTokens =
    b
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    secondTokens.length === 0
  ) {

    return false;

  }


  let common =
    0;


  for (
    const token
    of secondTokens
  ) {

    if (
      firstTokens.has(
        token
      )
    ) {

      common++;

    }

  }


  return (
    common >=
    Math.max(
      1,
      Math.ceil(
        secondTokens.length *
        0.5
      )
    )
  );

}


/* =========================================================
   SIMILARITY
========================================================= */

function nameSimilarity(
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

    return 0;

  }


  if (
    a === b
  ) {

    return 1;

  }


  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return 0.90;

  }


  const firstTokens =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const secondTokens =
    new Set(
      b
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  if (
    firstTokens.size === 0 ||
    secondTokens.size === 0
  ) {

    return 0;

  }


  let intersection =
    0;


  for (
    const token
    of firstTokens
  ) {

    if (
      secondTokens.has(
        token
      )
    ) {

      intersection++;

    }

  }


  const union =
    new Set([
      ...firstTokens,
      ...secondTokens
    ]).size;


  return union > 0
    ? intersection / union
    : 0;

}


/* =========================================================
   REGISTER
========================================================= */

const provider =
  new FootballDataProvider();


registerProvider(
  provider
);


export default provider;
