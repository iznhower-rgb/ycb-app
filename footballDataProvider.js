// Y.C.B - FOOTBALL-DATA.ORG PROVIDER
// Safe provider: never breaks the complete Y.C.B analysis.

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


/* =========================================================
   PROVIDER
   ========================================================= */

class FootballDataProvider extends DataProvider {

  constructor() {
    super(PROVIDER_NAME);
  }


  async getMatchData(home, away, env) {

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    /*
     * No token:
     * This is NOT an error.
     * The provider is simply disabled.
     */

    if (!token) {

      return {
        status: "disabled",
        message:
          "Football-Data.org غير مفعل: FOOTBALL_DATA_TOKEN غير موجود.",
        data: null
      };

    }


    const homeName =
      normalizeName(home);

    const awayName =
      normalizeName(away);


    if (!homeName || !awayName) {

      return {
        status: "invalid_request",
        message:
          "اسم الفريقين غير صالح.",
        data: null
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


    /*
     * Use the documented status values.
     */

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


    /*
     * Limit the response.
     */

    url.searchParams.set(
      "limit",
      "100"
    );


    try {

      const response =
        await fetch(
          url.toString(),
          {
            method: "GET",

            headers: {
              "X-Auth-Token": token,
              "Accept": "application/json"
            }
          }
        );


      const text =
        await response.text();


      const payload =
        safeJsonParse(text);


      /*
       * Authentication / API errors
       */

      if (!response.ok) {

        const message =
          String(
            payload?.message ||
            payload?.error ||
            text ||
            `HTTP ${response.status}`
          );


        /*
         * Invalid token:
         * disable this provider instead of poisoning
         * the complete analysis.
         */

        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403
        ) {

          return {
            status: "disabled_invalid_token",

            message:
              "Football-Data.org غير متاح حاليًا: التوكن غير صالح أو غير مقبول. سيتم تجاهل المصدر.",

            data: {
              source: "football-data.org",
              available: false,
              matchFound: false,
              httpStatus: response.status
            }
          };

        }


        /*
         * Rate limit
         */

        if (
          response.status === 429
        ) {

          return {
            status: "rate_limited",

            message:
              "Football-Data.org وصل إلى حد الطلبات. سيتم تجاهل المصدر مؤقتًا.",

            data: {
              source: "football-data.org",
              available: false,
              matchFound: false,
              httpStatus: 429
            }
          };

        }


        return {
          status: "api_error",

          message:
            `Football-Data.org HTTP ${response.status}: ${message}`,

          data: {
            source: "football-data.org",
            available: false,
            matchFound: false,
            httpStatus: response.status
          }
        };

      }


      const matches =
        Array.isArray(
          payload?.matches
        )
          ? payload.matches
          : [];


      /*
       * Find requested fixture.
       */

      const requested =
        findRequestedMatch(
          matches,
          home,
          away
        );


      /*
       * Match not found is NOT an API error.
       */

      if (!requested) {

        /*
         * We can still return useful historical
         * matches if the API returned them.
         */

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


      /*
       * Normalize fixture.
       */

      const fixture =
        normalizeMatch(
          requested
        );


      /*
       * Historical matches for both teams.
       */

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

    } catch (error) {

      /*
       * Network / Worker fetch failure.
       * Never throw out of the provider.
       */

      return {

        status:
          "network_error",

        message:
          `Football-Data.org network error: ${
            error?.message ||
            String(error)
          }`,

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
    normalizeName(home);

  const awayName =
    normalizeName(away);


  /*
   * First pass:
   * exact / strong home-away matching.
   */

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


  if (result) {
    return result;
  }


  /*
   * Second pass:
   * allow the provider to return a match even
   * when team naming differs slightly.
   */

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


        const homeScore =
          nameSimilarity(
            matchHome,
            homeName
          );


        const awayScore =
          nameSimilarity(
            matchAway,
            awayName
          );


        return (
          homeScore >= 0.70 &&
          awayScore >= 0.70
        );

      }
    );


  return result || null;

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
    normalizeName(team);


  if (!teamName) {
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
          String(match?.id || "") ===
          String(excludeId)
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

    /*
     * API results are normally chronological,
     * but sorting explicitly is safer.
     */

    .sort(
      (a, b) => {

        const dateA =
          Date.parse(
            a?.utcDate || ""
          );

        const dateB =
          Date.parse(
            b?.utcDate || ""
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
   NORMALIZE MATCH
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

  if (!text) {
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
    Number(value);


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
    new Date(date);


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
    value || ""
  )

    .toLowerCase()

    .trim()

    /*
     * Remove accents.
     */

    .normalize(
      "NFD"
    )

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    /*
     * Common separators.
     */

    .replace(
      /&/g,
      " and "
    )

    .replace(
      /[-_./]/g,
      " "
    )

    /*
     * Remove common club suffixes.
     */

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|women|woman|f)\b/g,
      " "
    )

    /*
     * Keep Arabic + Latin + numbers.
     */

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
    first.includes(second) ||
    second.includes(first)
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
          x =>
            x.length >= 3
        )
    );


  const b =
    new Set(
      second
        .split(" ")
        .filter(
          x =>
            x.length >= 3
        )
    );


  if (
    a.size === 0 ||
    b.size === 0
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
      b.has(token)
    ) {

      intersection++;

    }

  }


  const union =
    new Set([
      ...a,
      ...b
    ]).size;


  if (
    union === 0
  ) {

    return 0;

  }


  return (
    intersection /
    union
  );

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
