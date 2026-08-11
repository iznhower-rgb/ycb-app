// ==========================================================
// Y.C.B THESPORTSDB PROVIDER 3.1.0
// ==========================================================
//
// Independent fixture verification + recent form provider.
//
// Compatible with:
//   providers.js 3.0.1
//
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";

const DEFAULT_API_KEY = "123";

const API_BASE =
  "https://www.thesportsdb.com/api/v1/json";

const PROVIDER_VERSION = "3.1.0";

class TheSportsDBProvider extends DataProvider {

  constructor() {
    super("TheSportsDB");
  }

  async getMatchData(home, away, env) {

    const startedAt = Date.now();

    try {

      const apiKey = getApiKey(env);

      const fixture = await findFixture(
        home,
        away,
        apiKey
      );

      if (!fixture) {

        return {
          status: "api_ok_no_match",

          message:
            "TheSportsDB متصل لكن لم يتم العثور على المباراة المطلوبة.",

          data: {
            source: "thesportsdb",

            providerVersion:
              PROVIDER_VERSION,

            available: true,

            matchFound: false,

            fixture: null,

            recentMatches: {
              home: [],
              away: []
            },

            historyAvailable: false,

            historyCount: {
              home: 0,
              away: 0
            },

            durationMs:
              Date.now() - startedAt
          }
        };

      }

      const homeId =
        fixture?.idHomeTeam || null;

      const awayId =
        fixture?.idAwayTeam || null;

      const recent =
        await getRecentMatches(
          homeId,
          awayId,
          apiKey
        );

      const normalizedFixture =
        normalizeEvent(fixture);

      const historyAvailable =
        recent.home.length > 0 ||
        recent.away.length > 0;

      return {

        status: "success",

        message: historyAvailable
          ? "تم التحقق من المباراة وجمع بيانات النتائج السابقة عبر TheSportsDB."
          : "تم التحقق من المباراة عبر TheSportsDB، لكن النتائج السابقة غير متاحة بشكل كافٍ.",

        data: {

          source: "thesportsdb",

          providerVersion:
            PROVIDER_VERSION,

          available: true,

          matchFound: true,

          fixture:
            normalizedFixture,

          recentMatches: {

            home:
              recent.home,

            away:
              recent.away

          },

          historyAvailable,

          historyCount: {

            home:
              recent.home.length,

            away:
              recent.away.length

          },

          limitations: {

            freeTier: true,

            note:
              "TheSportsDB free V1 may restrict previous team events."

          },

          durationMs:
            Date.now() - startedAt

        }

      };

    } catch (error) {

      return {

        status: "network_error",

        message:
          error?.message ||
          String(error),

        data: {

          source:
            "thesportsdb",

          providerVersion:
            PROVIDER_VERSION,

          available: false,

          matchFound: false,

          fixture: null,

          recentMatches: {

            home: [],
            away: []

          },

          historyAvailable: false

        }

      };

    }

  }

}


/* API KEY */

function getApiKey(env) {

  const envKey =
    env?.THESPORTSDB_API_KEY ||
    env?.THESPORTSDB_KEY ||
    env?.SPORTSDB_API_KEY;

  return String(
    envKey ||
    DEFAULT_API_KEY
  ).trim();

}


/* FIND FIXTURE */

async function findFixture(
  home,
  away,
  apiKey
) {

  const homeName =
    String(home || "").trim();

  const awayName =
    String(away || "").trim();

  if (!homeName || !awayName) {
    return null;
  }

  const patterns =
    buildSearchPatterns(
      homeName,
      awayName
    );

  const checked = new Set();

  for (const pattern of patterns) {

    const key =
      pattern.toLowerCase();

    if (checked.has(key)) {
      continue;
    }

    checked.add(key);

    try {

      const url =
        `${API_BASE}/${apiKey}/searchevents.php?e=` +
        encodeURIComponent(pattern);

      const data =
        await fetchJSON(url);

      const events =
        Array.isArray(data?.event)
          ? data.event
          : [];

      const exact =
        events.find(event =>
          eventMatchesTeams(
            event,
            homeName,
            awayName
          )
        );

      if (exact) {
        return exact;
      }

    } catch {

      continue;

    }

  }

  return null;

}


/* BUILD SEARCH PATTERNS */

function buildSearchPatterns(
  home,
  away
) {

  const patterns = [

    `${home}_vs_${away}`,

    `${home}_v_${away}`,

    `${home} vs ${away}`,

    `${home} v ${away}`,

    `${home}_vs._${away}`,

    `${home} vs. ${away}`,

    `${away}_vs_${home}`,

    `${away}_v_${home}`,

    `${away} vs ${home}`,

    `${away} v ${home}`

  ];

  return patterns.filter(
    value =>
      String(value || "").trim()
  );

}


/* EVENT TEAM MATCH */

function eventMatchesTeams(
  event,
  home,
  away
) {

  if (!event) {
    return false;
  }

  const eventHome =
    event?.strHomeTeam;

  const eventAway =
    event?.strAwayTeam;

  if (!eventHome || !eventAway) {
    return false;
  }

  if (
    namesMatch(
      eventHome,
      home
    ) &&
    namesMatch(
      eventAway,
      away
    )
  ) {

    return true;

  }

  return false;

}


/* RECENT MATCHES */

async function getRecentMatches(
  homeId,
  awayId,
  apiKey
) {

  const result = {

    home: [],
    away: []

  };

  if (homeId) {

    try {

      const data =
        await fetchJSON(
          `${API_BASE}/${apiKey}/eventslast.php?id=` +
          encodeURIComponent(
            String(homeId)
          )
        );

      const events =
        Array.isArray(data?.results)
          ? data.results
          : [];

      result.home =
        events
          .filter(isValidCompletedEvent)
          .map(normalizeRecentMatch)
          .filter(Boolean);

    } catch {

      result.home = [];

    }

  }

  if (awayId) {

    try {

      const data =
        await fetchJSON(
          `${API_BASE}/${apiKey}/eventslast.php?id=` +
          encodeURIComponent(
            String(awayId)
          )
        );

      const events =
        Array.isArray(data?.results)
          ? data.results
          : [];

      result.away =
        events
          .filter(isValidCompletedEvent)
          .map(normalizeRecentMatch)
          .filter(Boolean);

    } catch {

      result.away = [];

    }

  }

  return result;

}


/* VALID COMPLETED EVENT */

function isValidCompletedEvent(event) {

  if (!event) {
    return false;
  }

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );

  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );

  if (
    homeScore === null ||
    awayScore === null
  ) {

    return false;

  }

  return true;

}


/* NORMALIZE RECENT MATCH */

function normalizeRecentMatch(event) {

  if (!event) {
    return null;
  }

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );

  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );

  if (
    homeScore === null ||
    awayScore === null
  ) {

    return null;

  }

  const utcDate =
    buildDateTime(event);

  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate,

    date:
      event?.dateEvent ||
      null,

    status:
      "FINISHED",

    homeTeam: {

      id:
        event?.idHomeTeam ||
        null,

      name:
        event?.strHomeTeam ||
        null,

      shortName:
        event?.strHomeTeamShort ||
        null

    },

    awayTeam: {

      id:
        event?.idAwayTeam ||
        null,

      name:
        event?.strAwayTeam ||
        null,

      shortName:
        event?.strAwayTeamShort ||
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
      event?.strLeague ||
      null

  };

}


/* NORMALIZE EVENT */

function normalizeEvent(event) {

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );

  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );

  const finished =
    isFinishedEvent(
      event,
      homeScore,
      awayScore
    );

  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate:
      buildDateTime(event),

    date:
      event?.dateEvent ||
      null,

    time:
      event?.strTime ||
      null,

    status:
      finished
        ? "FINISHED"
        : "SCHEDULED",

    homeTeam: {

      id:
        event?.idHomeTeam ||
        null,

      name:
        event?.strHomeTeam ||
        null,

      shortName:
        event?.strHomeTeamShort ||
        null

    },

    awayTeam: {

      id:
        event?.idAwayTeam ||
        null,

      name:
        event?.strAwayTeam ||
        null,

      shortName:
        event?.strAwayTeamShort ||
        null

    },

    score: {

      fullTime: {

        home:
          finished
            ? homeScore
            : null,

        away:
          finished
            ? awayScore
            : null

      }

    },

    tournament:
      event?.strLeague ||
      null

  };

}


/* FINISHED EVENT */

function isFinishedEvent(
  event,
  homeScore,
  awayScore
) {

  const status =
    String(
      event?.strStatus ||
      ""
    )
      .toLowerCase()
      .trim();

  const progress =
    String(
      event?.strProgress ||
      ""
    )
      .toLowerCase()
      .trim();

  if (status === "match finished") {
    return true;
  }

  if (status === "ft") {
    return true;
  }

  if (progress === "final") {
    return true;
  }

  return (
    homeScore !== null &&
    awayScore !== null &&
    (
      status === "finished" ||
      status === "completed"
    )
  );

}


/* BUILD DATE TIME */

function buildDateTime(event) {

  const timestamp =
    event?.strTimestamp;

  if (timestamp) {

    const parsed =
      new Date(timestamp);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {

      return parsed.toISOString();

    }

  }

  const date =
    String(
      event?.dateEvent ||
      ""
    ).trim();

  const time =
    String(
      event?.strTime ||
      ""
    ).trim();

  if (!date) {
    return null;
  }

  if (time) {
    return `${date}T${time}`;
  }

  return date;

}


/* FETCH JSON */

async function fetchJSON(url) {

  const response =
    await fetch(
      url,
      {
        headers: {

          Accept:
            "application/json",

          "User-Agent":
            `YCB-Football-Prediction-Engine/${PROVIDER_VERSION}`

        }
      }
    );

  const text =
    await response.text();

  let data = null;

  try {

    data =
      text
        ? JSON.parse(text)
        : null;

  } catch {

    throw new Error(
      "TheSportsDB returned invalid JSON"
    );

  }

  if (!response.ok) {

    if (response.status === 429) {

      throw new Error(
        "TheSportsDB rate limit reached (HTTP 429)"
      );

    }

    throw new Error(
      `TheSportsDB HTTP ${response.status}`
    );

  }

  return data;

}


/* NORMALIZE NAME */

function normalizeName(value) {

  return String(
    value || ""
  )

    .toLowerCase()

    .trim()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /&/g,
      " and "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|the)\b/g,
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


/* NAME MATCH */

function namesMatch(
  first,
  second
) {

  const a =
    normalizeName(first);

  const b =
    normalizeName(second);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }

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

  if (tb.length === 1) {
    return overlap >= 1;
  }

  return (
    overlap >=
    Math.min(
      2,
      tb.length
    )
  );

}


/* NUMBER */

function finiteOrNull(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}


/* REGISTER */

const provider =
  new TheSportsDBProvider();

registerProvider(provider);

export default provider;
