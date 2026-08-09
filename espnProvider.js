// Y.C.B ESPN PROVIDER 2.2.1
//
// ESPN is an optional provider.
// If ESPN blocks the Worker request (403) or fails,
// Y.C.B continues normally with the other providers.

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";


class ESPNProvider extends DataProvider {

  constructor() {
    super("ESPN");
  }


  async getMatchData(home, away) {

    const now =
      new Date();


    const from =
      shiftDate(
        now,
        -30
      );


    const to =
      shiftDate(
        now,
        30
      );


    try {

      const events =
        await getScoreboardEvents(
          from,
          to
        );


      const fixtureEvent =
        events.find(
          event =>
            eventMatches(
              event,
              home,
              away
            )
        );


      if (!fixtureEvent) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            searchRange: {

              dateFrom:
                formatDate(
                  from
                ),

              dateTo:
                formatDate(
                  to
                )

            },

            totalEvents:
              events.length

          }

        };

      }


      const fixture =
        normalizeEvent(
          fixtureEvent
        );


      /*
       * We intentionally do not depend on
       * ESPN historical team schedules here.
       *
       * ESPN frequently blocks automated requests
       * from server environments with HTTP 403.
       *
       * The fixture is still returned when ESPN
       * allows the scoreboard request.
       */

      const competitors =
        fixtureEvent
          ?.competitions?.[0]
          ?.competitors ||
        [];


      const homeCompetitor =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );


      const awayCompetitor =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );


      const homeId =
        homeCompetitor
          ?.team
          ?.id ||
        null;


      const awayId =
        awayCompetitor
          ?.team
          ?.id ||
        null;


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة عبر ESPN.",

        data: {

          source:
            "espn",

          available:
            true,

          matchFound:
            true,

          fixture,

          teamIds: {

            home:
              homeId,

            away:
              awayId

          },

          recentMatches: {

            home:
              [],

            away:
              []

          }

        }

      };

    } catch (error) {

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


/* ==========================================
   SCOREBOARD
========================================== */

async function getScoreboardEvents(
  from,
  to
) {

  const url =
    SCOREBOARD +
    "?dates=" +
    formatDate(from) +
    "-" +
    formatDate(to) +
    "&limit=1000";


  const response =
    await fetch(
      url,
      {
        headers: {

          Accept:
            "application/json"

        }

      }
    );


  const text =
    await response.text();


  let payload =
    null;


  try {

    payload =
      text
        ? JSON.parse(text)
        : null;

  } catch {

    payload =
      null;

  }


  if (!response.ok) {

    throw new Error(

      "ESPN HTTP " +
      response.status

    );

  }


  return Array.isArray(
    payload?.events
  )

    ? payload.events

    : [];

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
        item?.homeAway ===
        "home"
    ) ||
    competitors[0] ||
    {};


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    ) ||
    competitors[1] ||
    {};


  const completed =
    isFinished(
      event
    );


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
        item?.homeAway ===
        "home"
    )?.team;


  const awayTeam =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
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

    type?.completed ===
      true

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
      firstTokens.has(
        token
      )
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
