/* ==========================================================
   Y.C.B ESPN PROVIDER 3.2.0
   Real ESPN Site API collector
========================================================== */

import { registerProvider, DataProvider } from "./providers.js";

const SITE_API = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const DEFAULT_LEAGUES = [
  "eng.1",
  "esp.1",
  "ger.1",
  "ita.1",
  "fra.1",
  "ned.1",
  "por.1",
  "bel.1",
  "sco.1",
  "tur.1",
  "usa.1",
  "mex.1",
  "bra.1",
  "arg.1"
];

const MAX_HISTORY = 15;
const REQUEST_TIMEOUT_MS = 15000;
const TEAM_SCAN_LIMIT = 200;

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(fc|cf|afc|sc|ac|fk|club|the)\b/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);

  if (!x || !y) return false;

  if (
    x === y ||
    x.includes(y) ||
    y.includes(x)
  ) {
    return true;
  }

  const ax = new Set(
    x.split(" ").filter(Boolean)
  );

  const by = y
    .split(" ")
    .filter(token => token.length >= 3);

  if (!by.length) {
    return false;
  }

  const overlap = by.filter(
    token => ax.has(token)
  ).length;

  return by.length === 1
    ? overlap >= 1
    : overlap >= Math.min(2, by.length);
}

function leaguesFromEnv(env) {
  const raw = String(
    env?.ESPN_LEAGUES || ""
  ).trim();

  const list = raw
    ? raw
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
    : DEFAULT_LEAGUES;

  return [
    ...new Set(list)
  ].slice(0, 30);
}

async function fetchJson(
  url,
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        `ESPN HTTP ${response.status}`
      );
    }

    return await response.json();

  } finally {
    clearTimeout(timer);
  }
}

function extractTeams(payload) {
  const rows =
    Array.isArray(
      payload?.sports?.[0]
        ?.leagues?.[0]
        ?.teams
    )
      ? payload.sports[0]
          .leagues[0]
          .teams
      : [];

  return rows
    .map(row => row?.team || row)
    .filter(Boolean);
}

async function findTeam(
  name,
  leagues
) {
  for (const league of leagues) {
    try {
      const url =
        `${SITE_API}/${encodeURIComponent(
          league
        )}/teams?limit=${TEAM_SCAN_LIMIT}`;

      const payload =
        await fetchJson(url);

      const teams =
        extractTeams(payload);

      const exact =
        teams.find(
          team =>
            normalizeName(
              team.displayName ||
              team.name
            ) === normalizeName(name)
        );

      const strong =
        exact ||
        teams.find(
          team =>
            namesMatch(
              team.displayName ||
              team.name,
              name
            )
        );

      if (strong?.id) {
        return {
          team: strong,
          league
        };
      }

    } catch {
      // Continue scanning the remaining leagues.
    }
  }

  return null;
}

function eventToMatch(event) {
  const competition =
    event?.competitions?.[0];

  const competitors =
    Array.isArray(
      competition?.competitors
    )
      ? competition.competitors
      : [];

  const home =
    competitors.find(
      item => item?.homeAway === "home"
    );

  const away =
    competitors.find(
      item => item?.homeAway === "away"
    );

  if (
    !home?.team?.displayName ||
    !away?.team?.displayName
  ) {
    return null;
  }

  const homeScore =
    Number(home.score);

  const awayScore =
    Number(away.score);

  return {
    id: String(
      event.id ||
      competition.id ||
      ""
    ),

    utcDate:
      event.date || null,

    date:
      event.date || null,

    homeTeam: {
      id:
        home.team.id ||
        null,

      name:
        home.team.displayName
    },

    awayTeam: {
      id:
        away.team.id ||
        null,

      name:
        away.team.displayName
    },

    score: {
      fullTime: {
        home:
          Number.isFinite(homeScore)
            ? homeScore
            : null,

        away:
          Number.isFinite(awayScore)
            ? awayScore
            : null
      }
    },

    status:
      event?.status?.type?.name ||
      null,

    competition:
      event?.league
        ? {
            name:
              event.league.name,

            id:
              event.league.id ||
              null
          }
        : null
  };
}

function isCompleted(match) {
  const h =
    Number(
      match?.score?.fullTime?.home
    );

  const a =
    Number(
      match?.score?.fullTime?.away
    );

  return (
    Number.isFinite(h) &&
    Number.isFinite(a)
  );
}

function sortNewest(matches) {
  return matches.sort(
    (a, b) =>
      new Date(
        b?.utcDate ||
        b?.date ||
        0
      ).getTime() -
      new Date(
        a?.utcDate ||
        a?.date ||
        0
      ).getTime()
  );
}

function dedupe(matches) {
  const seen = new Set();

  return sortNewest(
    matches.filter(match => {
      const key =
        String(
          match?.id ||
          [
            match?.utcDate,
            match?.homeTeam?.name,
            match?.awayTeam?.name,
            match?.score?.fullTime?.home,
            match?.score?.fullTime?.away
          ].join("|")
        );

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
  );
}

async function getTeamSchedule(
  teamId,
  league
) {
  const url =
    `${SITE_API}/${encodeURIComponent(
      league
    )}/teams/${encodeURIComponent(
      teamId
    )}/schedule?limit=100`;

  const payload =
    await fetchJson(url);

  return Array.isArray(
    payload?.events
  )
    ? payload.events
        .map(eventToMatch)
        .filter(Boolean)
    : [];
}

function fixtureBetween(
  events,
  homeName,
  awayName
) {
  return (
    events.find(
      match =>
        namesMatch(
          match?.homeTeam?.name,
          homeName
        ) &&
        namesMatch(
          match?.awayTeam?.name,
          awayName
        )
    ) ||
    null
  );
}

async function scoreboardRange(
  league,
  startDate,
  endDate
) {
  const start =
    startDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

  const end =
    endDate
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

  const url =
    `${SITE_API}/${encodeURIComponent(
      league
    )}/scoreboard?dates=${start}-${end}&limit=500`;

  try {
    const payload =
      await fetchJson(url);

    return Array.isArray(
      payload?.events
    )
      ? payload.events
          .map(eventToMatch)
          .filter(Boolean)
      : [];

  } catch {
    return [];
  }
}

async function getFallbackHistory(
  league,
  homeName,
  awayName
) {
  const now =
    new Date();

  const start =
    new Date(now);

  start.setUTCDate(
    start.getUTCDate() - 120
  );

  const events =
    await scoreboardRange(
      league,
      start,
      now
    );

  return {
    fixture:
      fixtureBetween(
        events,
        homeName,
        awayName
      ),

    events
  };
}

class EspnProvider
  extends DataProvider {

  constructor() {
    super({
      name: "ESPN",
      version: "3.2.0",
      description:
        "ESPN Site API soccer collector"
    });
  }

  async getMatchData(
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

    const leagues =
      leaguesFromEnv(env);

    const [
      homeFound,
      awayFound
    ] = await Promise.all([
      findTeam(home, leagues),
      findTeam(away, leagues)
    ]);

    if (
      !homeFound ||
      !awayFound
    ) {
      return {
        status: "not_found",
        message:
          "ESPN لم يجد الفريقين في الدوريات المهيأة.",
        data: null
      };
    }

    let homeSchedule = [];
    let awaySchedule = [];

    try {
      [
        homeSchedule,
        awaySchedule
      ] = await Promise.all([
        getTeamSchedule(
          homeFound.team.id,
          homeFound.league
        ),

        getTeamSchedule(
          awayFound.team.id,
          awayFound.league
        )
      ]);

    } catch {
      // Use scoreboard fallback.
    }

    const all =
      dedupe([
        ...homeSchedule,
        ...awaySchedule
      ]);

    let fixture =
      fixtureBetween(
        all,
        home,
        away
      );

    if (
      !fixture &&
      homeFound.league ===
        awayFound.league
    ) {
      const fallback =
        await getFallbackHistory(
          homeFound.league,
          home,
          away
        );

      fixture =
        fallback.fixture ||
        null;

      all.push(
        ...fallback.events
      );
    }

    const completedHome =
      dedupe(homeSchedule)
        .filter(isCompleted)
        .filter(match =>
          namesMatch(
            match?.homeTeam?.name,
            home
          ) ||
          namesMatch(
            match?.awayTeam?.name,
            home
          )
        )
        .slice(
          0,
          MAX_HISTORY
        );

    const completedAway =
      dedupe(awaySchedule)
        .filter(isCompleted)
        .filter(match =>
          namesMatch(
            match?.homeTeam?.name,
            away
          ) ||
          namesMatch(
            match?.awayTeam?.name,
            away
          )
        )
        .slice(
          0,
          MAX_HISTORY
        );

    if (
      completedHome.length < 3 ||
      completedAway.length < 3
    ) {
      const fallback =
        await getFallbackHistory(
          homeFound.league,
          home,
          away
        );

      if (!fixture) {
        fixture =
          fallback.fixture;
      }

      const fallbackHome =
        fallback.events.filter(
          match =>
            isCompleted(match) &&
            (
              namesMatch(
                match?.homeTeam?.name,
                home
              ) ||
              namesMatch(
                match?.awayTeam?.name,
                home
              )
            )
        );

      const fallbackAway =
        fallback.events.filter(
          match =>
            isCompleted(match) &&
            (
              namesMatch(
                match?.homeTeam?.name,
                away
              ) ||
              namesMatch(
                match?.awayTeam?.name,
                away
              )
            )
        );

      completedHome.push(
        ...fallbackHome
      );

      completedAway.push(
        ...fallbackAway
      );
    }

    const recentHome =
      dedupe(
        completedHome
      ).slice(
        0,
        MAX_HISTORY
      );

    const recentAway =
      dedupe(
        completedAway
      ).slice(
        0,
        MAX_HISTORY
      );

    return {
      status: "success",

      message:
        fixture
          ? "ESPN data loaded and fixture checked"
          : "ESPN history loaded; fixture not found",

      data: {
        matchFound:
          Boolean(fixture),

        fixture,

        teams: {
          home: {
            id:
              homeFound.team.id ||
              null,

            name:
              homeFound.team.displayName ||
              home
          },

          away: {
            id:
              awayFound.team.id ||
              null,

            name:
              awayFound.team.displayName ||
              away
          }
        },

        leagues: [
          homeFound.league,
          awayFound.league
        ],

        recentMatches: {
          home:
            recentHome,

          away:
            recentAway
        }
      }
    };
  }
}

const espnProviderInstance =
  new EspnProvider();

registerProvider(
  espnProviderInstance
);

export default
  espnProviderInstance;

export {
  getMatchData
};

async function getMatchData(
  home,
  away,
  env = {}
) {
  return espnProviderInstance
    .getMatchData(
      home,
      away,
      env
    );
}
