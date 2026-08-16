/* ==========================================================
   Y.C.B TheSportsDB PROVIDER 3.2.0
========================================================== */

import {
  registerProvider
} from "./providers.js";

const API_BASE =
  "https://www.thesportsdb.com/api/v1/json";

const DEFAULT_KEY =
  "123";

const REQUEST_TIMEOUT_MS =
  15000;

const MAX_HISTORY =
  15;

function apiKey(env) {
  return String(
    env?.THESPORTSDB_API_KEY ||
    DEFAULT_KEY
  ).trim();
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|the)\b/g,
      " "
    )
    .replace(
      /[^a-z0-9\u0600-\u06ff\s]/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  const x =
    normalizeName(a);

  const y =
    normalizeName(b);

  if (!x || !y) {
    return false;
  }

  if (
    x === y ||
    x.includes(y) ||
    y.includes(x)
  ) {
    return true;
  }

  const ax =
    new Set(
      x.split(" ")
        .filter(Boolean)
    );

  const by =
    y.split(" ")
      .filter(
        token =>
          token.length >= 3
      );

  if (!by.length) {
    return false;
  }

  const overlap =
    by.filter(
      token =>
        ax.has(token)
    ).length;

  return by.length === 1
    ? overlap >= 1
    : overlap >=
      Math.min(
        2,
        by.length
      );
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
            Accept:
              "application/json"
          },

          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `TheSportsDB HTTP ${response.status}`
      );
    }

    return await response.json();

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
  const url =
    `${API_BASE}/${encodeURIComponent(
      key
    )}/searchteams.php?t=${encodeURIComponent(
      name
    )}`;

  const payload =
    await getJson(url);

  const teams =
    Array.isArray(
      payload?.teams
    )
      ? payload.teams
      : [];

  if (!teams.length) {
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

  return (
    exact ||
    teams.find(
      team =>
        namesMatch(
          team.strTeam,
          name
        )
    ) ||
    null
  );
}

async function lastEvents(
  teamId,
  key
) {
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

  return events
    .map(eventToMatch)
    .filter(Boolean);
}

async function nextEvents(
  teamId,
  key
) {
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

  return events
    .map(eventToMatch)
    .filter(Boolean);
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
    !homeTeam ||
    !awayTeam
  ) {
    return {
      status: "not_found",
      message:
        "TheSportsDB لم يجد أحد الفريقين.",
      data: null
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
      safe(
        lastEvents(
          homeTeam.idTeam,
          key
        )
      ),

      safe(
        lastEvents(
          awayTeam.idTeam,
          key
        )
      ),

      safe(
        nextEvents(
          homeTeam.idTeam,
          key
        )
      ),

      safe(
        nextEvents(
          awayTeam.idTeam,
          key
        )
      )
    ]);

  const fixture =
    findFixture(
      homeNext,
      awayNext,
      homeTeam.strTeam ||
        home,
      awayTeam.strTeam ||
        away
    );

  const historyAvailable =
    homeEvents.length > 0 ||
    awayEvents.length > 0;

  return {
    status: "success",

    message:
      fixture
        ? "TheSportsDB data loaded and fixture checked"
        : historyAvailable
          ? "TheSportsDB history loaded; fixture not found"
          : "TheSportsDB teams found; schedule endpoints returned no events",

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
