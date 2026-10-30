/* ==========================================================
   Y.C.B TheSportsDB PROVIDER 3.3.0
========================================================== */

import {
  registerProvider
} from "./providers.js";
import {
  teamsMatch,
  resolveTeamAlias,
  cleanRawName
} from "./teamAliases.js";

const API_BASE =
  "https://www.thesportsdb.com/api/v1/json";

const DEFAULT_KEY =
  "123";

const REQUEST_TIMEOUT_MS =
  8000;

const MAX_HISTORY =
  15;

const TEAM_CACHE = new Map();
const EVENTS_CACHE = new Map();
const CACHE_TTL_MS = 3600000; // 1 hour

function apiKey(env) {
  return String(
    env?.THESPORTSDB_API_KEY ||
    DEFAULT_KEY
  ).trim();
}

function normalizeName(value) {
  return cleanRawName(value);
}

function namesMatch(a, b) {
  return teamsMatch(a, b);
}

async function getJson(url) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "YCB-PredictionEngine/4.2 (Sports Analytics)"
          },
          signal:
            controller.signal
        }
      );

    if (response.status === 429) {
      return { rateLimited: true };
    }

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      return null;
    }

    return await response.json();

  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanTeam(team) {
  if (!team) {
    return null;
  }

  return {
    id:
      team.idTeam ||
      null,

    name:
      team.strTeam ||
      team.name ||
      "",

    badge:
      team.strBadge ||
      null,

    country:
      team.strCountry ||
      null,

    league:
      team.strLeague ||
      null
  };
}

function eventToMatch(event) {
  if (!event) {
    return null;
  }

  const home =
    event.strHomeTeam ||
    "";

  const away =
    event.strAwayTeam ||
    "";

  if (!home || !away) {
    return null;
  }

  const h =
    event.intHomeScore ==
    null
      ? null
      : Number(
          event.intHomeScore
        );

  const a =
    event.intAwayScore ==
    null
      ? null
      : Number(
          event.intAwayScore
        );

  const date =
    event.strTimestamp ||
    event.dateEvent ||
    null;

  return {
    id:
      event.idEvent ||
      `${home}|${away}|${date}`,

    utcDate:
      date,

    date,

    homeTeam: {
      id:
        event.idHomeTeam ||
        null,

      name:
        home
    },

    awayTeam: {
      id:
        event.idAwayTeam ||
        null,

      name:
        away
    },

    score: {
      fullTime: {
        home:
          Number.isFinite(h)
            ? h
            : null,

        away:
          Number.isFinite(a)
            ? a
            : null
      }
    },

    competition:
      event.strLeague
        ? {
            name:
              event.strLeague,

            id:
              event.idLeague ||
              null
          }
        : null
  };
}

async function findTeam(
  name,
  key
) {
  const normKey = normalizeName(name);
  const now = Date.now();
  if (TEAM_CACHE.has(normKey)) {
    const cached = TEAM_CACHE.get(normKey);
    if (now - cached.time < CACHE_TTL_MS) {
      return cached.team;
    }
  }

  const queryName = name;
  const aliasName = resolveTeamAlias(name);

  let url =
    `${API_BASE}/${encodeURIComponent(
      key
    )}/searchteams.php?t=${encodeURIComponent(
      queryName
    )}`;

  let payload = await getJson(url);
  let teams = Array.isArray(payload?.teams) ? payload.teams : [];

  if (!teams.length && aliasName && aliasName !== queryName) {
    url =
      `${API_BASE}/${encodeURIComponent(
        key
      )}/searchteams.php?t=${encodeURIComponent(
        aliasName
      )}`;
    payload = await getJson(url);
    teams = Array.isArray(payload?.teams) ? payload.teams : [];
  }

  if (!teams.length) {
    TEAM_CACHE.set(normKey, { team: null, time: now, rateLimited: Boolean(payload?.rateLimited) });
    return null;
  }

  const exact =
    teams.find(
      team =>
        normalizeName(
          team.strTeam
        ) ===
        normalizeName(name)
    );

  const matched = (
    exact ||
    teams.find(
      team =>
        namesMatch(
          team.strTeam,
          name
        )
    ) ||
    teams[0] ||
    null
  );

  TEAM_CACHE.set(normKey, { team: matched, time: now });
  return matched;
}

async function lastEvents(
  teamId,
  key
) {
  const cacheKey = `last-${teamId}`;
  const now = Date.now();
  if (EVENTS_CACHE.has(cacheKey)) {
    const c = EVENTS_CACHE.get(cacheKey);
    if (now - c.time < CACHE_TTL_MS) return c.events;
  }

  const url =
    `${API_BASE}/${encodeURIComponent(
      key
    )}/eventslast.php?id=${encodeURIComponent(
      teamId
    )}`;

  const payload =
    await getJson(url);

  const events =
    Array.isArray(
      payload?.results
    )
      ? payload.results
      : Array.isArray(
          payload?.events
        )
        ? payload.events
        : [];

  const mapped = events
    .map(eventToMatch)
    .filter(Boolean);

  EVENTS_CACHE.set(cacheKey, { events: mapped, time: now });
  return mapped;
}

async function nextEvents(
  teamId,
  key
) {
  const cacheKey = `next-${teamId}`;
  const now = Date.now();
  if (EVENTS_CACHE.has(cacheKey)) {
    const c = EVENTS_CACHE.get(cacheKey);
    if (now - c.time < CACHE_TTL_MS) return c.events;
  }

  const url =
    `${API_BASE}/${encodeURIComponent(
      key
    )}/eventsnext.php?id=${encodeURIComponent(
      teamId
    )}`;

  const payload =
    await getJson(url);

  const events =
    Array.isArray(
      payload?.events
    )
      ? payload.events
      : Array.isArray(
          payload?.results
        )
        ? payload.results
        : [];

  const mapped = events
    .map(eventToMatch)
    .filter(Boolean);

  EVENTS_CACHE.set(cacheKey, { events: mapped, time: now });
  return mapped;
}

function findFixture(
  homeNext,
  awayNext,
  home,
  away
) {
  return (
    homeNext.find(
      event =>
        namesMatch(
          event?.homeTeam?.name,
          home
        ) &&
        namesMatch(
          event?.awayTeam?.name,
          away
        )
    ) ||

    awayNext.find(
      event =>
        namesMatch(
          event?.homeTeam?.name,
          home
        ) &&
        namesMatch(
          event?.awayTeam?.name,
          away
        )
    ) ||

    null
  );
}

function dedupe(matches) {
  const seen =
    new Set();

  return matches
    .filter(Boolean)

    .filter(match => {
      const key =
        String(
          match.id ||
          [
            match.utcDate,
            match.homeTeam?.name,
            match.awayTeam?.name,
            match.score?.fullTime?.home,
            match.score?.fullTime?.away
          ].join("|")
        );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })

    .sort(
      (a, b) =>
        new Date(
          b.utcDate ||
          b.date ||
          0
        ).getTime() -
        new Date(
          a.utcDate ||
          a.date ||
          0
        ).getTime()
    )

    .slice(
      0,
      MAX_HISTORY
    );
}

async function getMatchData(
  home,
  away,
  env = {}
) {
  if (!home || !away) {
    return {
      status: "invalid",
      message:
        "Home or Away team parameter is missing",
      data: null
    };
  }

  const key =
    apiKey(env);

  const [
    homeTeam,
    awayTeam
  ] = await Promise.all([
    findTeam(
      home,
      key
    ),

    findTeam(
      away,
      key
    )
  ]);

  if (
    !homeTeam &&
    !awayTeam
  ) {
    return {
      status: "ready",
      message:
        "TheSportsDB: متصل وجاهز (قاعدة البيانات الرياضية العالمية).",
      data: {
        matchFound: false,
        fixture: null,
        teams: {
          home: null,
          away: null
        },
        recentMatches: {
          home: [],
          away: []
        }
      }
    };
  }

  const safe =
    promise =>
      promise.catch(
        () => []
      );

  const [
    homeEvents,
    awayEvents,
    homeNext,
    awayNext
  ] =
    await Promise.all([
      homeTeam
        ? safe(
            lastEvents(
              homeTeam.idTeam,
              key
            )
          )
        : Promise.resolve([]),

      awayTeam
        ? safe(
            lastEvents(
              awayTeam.idTeam,
              key
            )
          )
        : Promise.resolve([]),

      homeTeam
        ? safe(
            nextEvents(
              homeTeam.idTeam,
              key
            )
          )
        : Promise.resolve([]),

      awayTeam
        ? safe(
            nextEvents(
              awayTeam.idTeam,
              key
            )
          )
        : Promise.resolve([])
    ]);

  const fixture =
    (homeTeam && awayTeam)
      ? findFixture(
          homeNext,
          awayNext,
          homeTeam.strTeam ||
            home,
          awayTeam.strTeam ||
            away
        )
      : null;

  const historyAvailable =
    homeEvents.length > 0 ||
    awayEvents.length > 0;

  return {
    status:
      fixture
        ? "success"
        : historyAvailable
          ? "partial_success"
          : "ready",

    message:
      fixture
        ? "TheSportsDB: تم التحقق من المباراة والمواجهات السابقة."
        : historyAvailable
          ? "TheSportsDB: تم استخراج سجل المباريات السابقة للفرق بنجاح."
          : "TheSportsDB: متصل وجاهز (تم فحص الفرق بنجاح).",

    data: {
      matchFound:
        Boolean(fixture),

      fixture,

      teams: {
        home:
          cleanTeam(homeTeam),

        away:
          cleanTeam(awayTeam)
      },

      recentMatches: {
        home:
          dedupe(homeEvents),

        away:
          dedupe(awayEvents)
      }
    }
  };
}

const provider = {
  name:
    "TheSportsDB",

  version:
    "3.2.0",

  description:
    "TheSportsDB V1 football provider",

  enabled:
    true,

  getMatchData
};

registerProvider(
  provider
);

export {
  getMatchData
};

export default provider;
