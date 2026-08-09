// Y.C.B ESPN PROVIDER 2.2.0

import {
  DataProvider,
  registerProvider
} from "./providers.js";

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";

const ESPN =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

class ESPNProvider extends DataProvider {

  constructor() {
    super("ESPN");
  }

  async getMatchData(home, away) {

    const now = new Date();

    const from = shiftDate(now, -45);
    const to = shiftDate(now, 45);

    try {

      const events = await getScoreboardEvents(
        from,
        to
      );

      const fixtureEvent =
        events.find(event =>
          eventMatches(
            event,
            home,
            away
          )
        );

      if (!fixtureEvent) {

        return {
          status: "api_ok_no_match",

          message:
            "ESPN متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {
            source: "espn",
            available: true,
            matchFound: false,
            searchRange: {
              dateFrom: formatDate(from),
              dateTo: formatDate(to)
            },
            totalEvents: events.length
          }
        };
      }

      const fixture =
        normalizeEvent(
          fixtureEvent
        );

      const competitors =
        fixtureEvent
          ?.competitions?.[0]
          ?.competitors || [];

      const homeCompetitor =
        competitors.find(
          item =>
            item?.homeAway === "home"
        );

      const awayCompetitor =
        competitors.find(
          item =>
            item?.homeAway === "away"
        );

      const homeId =
        homeCompetitor?.team?.id || null;

      const awayId =
        awayCompetitor?.team?.id || null;

      /*
       * ESPN's generic scoreboard is not reliable
       * for obtaining enough historical matches.
       *
       * We therefore use the team's own ESPN
       * schedule endpoint whenever possible.
       */

      const [
        homeSchedule,
        awaySchedule
      ] = await Promise.all([

        homeId
          ? fetchTeamSchedule(
              homeId
            )
          : Promise.resolve([]),

        awayId
          ? fetchTeamSchedule(
              awayId
            )
          : Promise.resolve([])

      ]);

      let homeRecent =
        homeSchedule
          .filter(
            event =>
              isFinished(event) &&
              !sameEvent(
                event,
                fixtureEvent
              )
          )
          .sort(
            (a, b) =>
              new Date(
                b?.date || 0
              ) -
              new Date(
                a?.date || 0
              )
          )
          .slice(0, 15)
          .map(
            normalizeEvent
          );

      let awayRecent =
        awaySchedule
          .filter(
            event =>
              isFinished(event) &&
              !sameEvent(
                event,
                fixtureEvent
              )
          )
          .sort(
            (a, b) =>
              new Date(
                b?.date || 0
              ) -
              new Date(
                a?.date || 0
              )
          )
          .slice(0, 15)
          .map(
            normalizeEvent
          );

      /*
       * Fallback:
       * if ESPN team schedules failed, use the
       * events already returned by scoreboard.
       */

      if (
        homeRecent.length === 0
      ) {

        homeRecent =
          events
            .filter(
              event =>
                isFinished(event) &&
                isTeamEvent(
                  event,
                  home
                ) &&
                !sameEvent(
                  event,
                  fixtureEvent
                )
            )
            .sort(
              (a, b) =>
                new Date(
                  b?.date || 0
                ) -
                new Date(
                  a?.date || 0
                )
            )
            .slice(0, 15)
            .map(
              normalizeEvent
            );
      }

      if (
        awayRecent.length === 0
      ) {

        awayRecent =
          events
            .filter(
              event =>
                isFinished(event) &&
                isTeamEvent(
                  event,
                  away
                ) &&
                !sameEvent(
                  event,
                  fixtureEvent
                )
            )
            .sort(
              (a, b) =>
                new Date(
                  b?.date || 0
                ) -
                new Date(
                  a?.date || 0
                )
            )
            .slice(0, 15)
            .map(
              normalizeEvent
            );
      }

      return {

        status: "success",

        message:
          "تم العثور على المباراة وبياناتها عبر ESPN.",

        data: {

          source: "espn",

          available: true,

          matchFound: true,

          fixture,

          recentMatches: {

            home: homeRecent,

            away: awayRecent

          }

        }

      };

    } catch (error) {

      return {

        status: "network_error",

        message:
          error?.message ||
          String(error),

        data: null

      };
    }
  }
}


/* ==========================================
   SCOREBOARD
========================================== */

async function getScoreboardEvents(
  from,
  to
) {

  /*
   * ESPN accepts a date range in the form:
   * YYYYMMDD-YYYYMMDD
   */

  const url =
    `${SCOREBOARD}?dates=` +
    `${formatDate(from)}-${formatDate(to)}` +
    `&limit=1000`;

  const payload =
    await fetchJSON(
      url
    );

  return Array.isArray(
    payload?.events
  )
    ? payload.events
    : [];
}


/* ==========================================
   TEAM SCHEDULE
========================================== */

async function fetchTeamSchedule(
  teamId
) {

  /*
   * Use the general soccer endpoint.
   * ESPN team schedules are available under
   * league-specific endpoints, but the generic
   * endpoint is not guaranteed for every team.
   *
   * We therefore try the known major leagues.
   */

  const leagues = [

    "eng.1",
    "eng.2",
    "esp.1",
    "ger.1",
    "ita.1",
    "fra.1",
    "usa.1",
    "uefa.champions",
    "bra.1",
    "arg.1"

  ];

  for (
    const league of leagues
  ) {

    try {

      const url =
        `${ESPN}/${league}` +
        `/teams/${encodeURIComponent(teamId)}` +
        `/schedule`;

      const data =
        await fetchJSON(
          url
        );

      const events =
        Array.isArray(
          data?.events
        )
          ? data.events
          : [];

      if (
        events.length
      ) {

        return events;
      }

    } catch {
      /*
       * Try the next league.
       */
    }
  }

  return [];
}


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url
) {

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",

          "User-Agent":
            "YCB-Football-Prediction-Engine/2.2"
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
    data = null;
  }

  if (
    !response.ok
  ) {

    throw new Error(
      `ESPN HTTP ${response.status}` +
      (
        data?.message
          ? `: ${data.message}`
          : ""
      )
    );
  }

  return data;
}


/* ==========================================
   NORMALIZE EVENT
========================================== */

function normalizeEvent(
  event
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];

  const home =
    competitors.find(
      item =>
        item?.homeAway === "home"
    ) ||
    competitors[0] ||
    {};

  const away =
    competitors.find(
      item =>
        item?.homeAway === "away"
    ) ||
    competitors[1] ||
    {};

  const completed =
    isFinished(event);

  const homeScore =
    numberOrNull(
      home?.score
    );

  const awayScore =
    numberOrNull(
      away?.score
    );

  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.date ||
      null,

    status:
      completed
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type
              ?.name ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home
          ?.team
          ?.id ||
        null,

      name:
        home
          ?.team
          ?.displayName ||
        home
          ?.team
          ?.name ||
        null,

      shortName:
        home
          ?.team
          ?.shortDisplayName ||
        home
          ?.team
          ?.abbreviation ||
        null

    },

    awayTeam: {

      id:
        away
          ?.team
          ?.id ||
        null,

      name:
        away
          ?.team
          ?.displayName ||
        away
          ?.team
          ?.name ||
        null,

      shortName:
        away
          ?.team
          ?.shortDisplayName ||
        away
          ?.team
          ?.abbreviation ||
        null

    },

    score: {

      fullTime: {

        home:
          completed
            ? homeScore
            : null,

        away:
          completed
            ? awayScore
            : null

      }

    },

    tournament:
      event
        ?.league
        ?.name ||
      event
        ?.season
        ?.displayName ||
      null

  };
}


/* ==========================================
   EVENT MATCH
========================================== */

function eventMatches(
  event,
  home,
  away
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];

  const homeTeam =
    competitors.find(
      item =>
        item?.homeAway === "home"
    )?.team;

  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway === "away"
    )?.team;

  if (
    !homeTeam ||
    !awayTeam
  ) {

    return false;
  }

  return (

    namesMatch(

      normalizeName(
        homeTeam?.displayName ||
        homeTeam?.name
      ),

      normalizeName(
        home
      )

    )

    &&

    namesMatch(

      normalizeName(
        awayTeam?.displayName ||
        awayTeam?.name
      ),

      normalizeName(
        away
      )

    )

  );
}


/* ==========================================
   TEAM EVENT
========================================== */

function isTeamEvent(
  event,
  team
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];

  return competitors.some(
    item =>
      namesMatch(

        normalizeName(
          item
            ?.team
            ?.displayName ||
          item
            ?.team
            ?.name
        ),

        normalizeName(
          team
        )

      )
  );
}


/* ==========================================
   FINISHED
========================================== */

function isFinished(
  event
) {

  const type =
    event
      ?.status
      ?.type;

  return (

    type?.completed === true

    ||

    [

      "STATUS_FINAL",
      "STATUS_FINAL_PEN",
      "STATUS_FINAL_AET",
      "STATUS_FINAL_OT"

    ].includes(
      type?.name
    )

  );
}


/* ==========================================
   SAME EVENT
========================================== */

function sameEvent(
  first,
  second
) {

  return (

    String(
      first?.id ||
      ""
    )

    ===

    String(
      second?.id ||
      ""
    )

  );
}


/* ==========================================
   NUMBER
========================================== */

function numberOrNull(
  value
) {

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


/* ==========================================
   NAME NORMALIZATION
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


/* ==========================================
   NAME MATCH
========================================== */

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
    first === second ||
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

  return secondTokens.some(
    token =>
      firstTokens.has(token)
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
   DATE FORMAT
========================================== */

function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    )
    .replace(
      /-/g,
      ""
    );
}


/* ==========================================
   REGISTER
========================================== */

const provider =
  new ESPNProvider();

registerProvider(
  provider
);

export default provider;
