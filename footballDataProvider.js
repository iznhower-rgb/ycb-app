// Y.C.B - FOOTBALL-DATA.ORG PROVIDER
// Version 2.3
// Safe browser provider
// Never breaks the complete Y.C.B analysis

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
  12000;


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


    if (!token) {

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
        await fetchFootballData(
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

      const status =
        classifyError(
          error
        );


      return {

        status,

        message:
          getErrorMessage(
            status,
            error
          ),

        data: {

          source:
            "football-data.org",

          available:
            false,

          matchFound:
            false,

          error:
            error?.message ||
            String(error)

        }

      };

    }

  }

}


/* =========================================================
   FETCH
========================================================= */

async function fetchFootballData(
  url,
  token
) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );


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
            controller.signal

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

      const message =
        String(
          payload?.message ||
          payload?.error ||
          text ||
          `HTTP ${response.status}`
        );


      throw new Error(
        `Football-Data.org HTTP ${response.status}: ${message}`
      );

    }


    return payload;

  } catch (
    error
  ) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "Football-Data.org request timeout"
      );

    }


    if (
      error instanceof TypeError
    ) {

      throw new Error(
        `Football-Data.org access blocked or CORS failure: ${
          error?.message ||
          "Failed to fetch"
        }`
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }

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


  return (
    result ||
    null
  );

}


/* =========================================================
   RECENT MATCHES
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
      (
        a,
        b
      ) => {

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


        return dateB - dateA;

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
   ERROR CLASSIFICATION
========================================================= */

function classifyError(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "http 400"
    ) ||
    message.includes(
      "http 401"
    ) ||
    message.includes(
      "http 403"
    ) ||
    message.includes(
      "invalid token"
    ) ||
    message.includes(
      "unauthorized"
    )
  ) {

    return "disabled_invalid_token";

  }


  if (
    message.includes(
      "http 429"
    )
  ) {

    return "rate_limited";

  }


  if (
    message.includes(
      "access blocked"
    ) ||
    message.includes(
      "cors"
    )
  ) {

    return "access_blocked";

  }


  if (
    message.includes(
      "timeout"
    )
  ) {

    return "timeout";

  }


  return "network_error";

}


/* =========================================================
   ERROR MESSAGE
========================================================= */

function getErrorMessage(
  status,
  error
) {

  if (
    status ===
    "disabled_invalid_token"
  ) {

    return (
      "Football-Data.org غير متاح: التوكن غير صالح أو مرفوض. تم تجاهل المصدر."
    );

  }


  if (
    status ===
    "rate_limited"
  ) {

    return (
      "Football-Data.org وصل إلى حد الطلبات. تم تجاهل المصدر مؤقتًا."
    );

  }


  if (
    status ===
    "access_blocked"
  ) {

    return (
      "Football-Data.org محجوب أو غير مسموح به من بيئة المتصفح."
    );

  }


  if (
    status ===
    "timeout"
  ) {

    return (
      "Football-Data.org لم يستجب خلال المهلة."
    );

  }


  return (
    error?.message ||
    "Football-Data.org request failed."
  );

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


  if (
    first.includes(
      second
    ) ||
    second.includes(
      first
    )
  ) {

    return true;

  }


  const firstTokens =
    new Set(
      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const secondTokens =
    second
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
        secondTokens.length * 0.5
      )
    )
  );

}


/* =========================================================
   NAME SIMILARITY
========================================================= */

function nameSimilarity(
  first,
  second
) {

  if (
    !first ||
    !second
  ) {

    return 0;

  }


  if (
    first === second
  ) {

    return 1;

  }


  if (
    first.includes(second) ||
    second.includes(first)
  ) {

    return 0.90;

  }


  const a =
    new Set(
      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const b =
    new Set(
      second
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  if (
    !a.size ||
    !b.size
  ) {

    return 0;

  }


  let intersection =
    0;


  for (
    const token
    of a
  ) {

    if (
      b.has(
        token
      )
    ) {

      intersection++;

    }

  }


  const union =
    new Set([
      ...a,
      ...b
    ]).size;


  return union
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
