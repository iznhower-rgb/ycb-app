// Y.C.B SOFASCORE PROVIDER

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.sofascore.com/api/v1";


class SofaScoreProvider
  extends DataProvider {

  constructor() {

    super(
      "SofaScore"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    const now =
      new Date();


    const from =
      -7;


    const to =
      14;


    try {

      let match =
        null;


      for (
        let offset = from;
        offset <= to;
        offset++
      ) {

        const date =
          shiftDate(
            now,
            offset
          );


        const payload =
          await fetchJSON(

            `${API}/sport/football/scheduled-events/${formatDate(date)}`

          );


        const events =
          Array.isArray(
            payload?.events
          )
            ? payload.events
            : [];


        match =
          findMatch(
            events,
            home,
            away
          );


        if (match) {

          break;

        }

      }


      if (!match) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "sofascore",

            available:
              true,

            matchFound:
              false

          }

        };

      }


      const homeId =
        match
          ?.homeTeam
          ?.id;


      const awayId =
        match
          ?.awayTeam
          ?.id;


      const [
        homeRecent,
        awayRecent
      ] =
        await Promise.all([

          homeId
            ? getRecentTeamMatches(
                homeId
              )
            : Promise.resolve([]),

          awayId
            ? getRecentTeamMatches(
                awayId
              )
            : Promise.resolve([])

        ]);


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبياناتها عبر SofaScore.",

        data: {

          source:
            "sofascore",

          available:
            true,

          matchFound:
            true,

          fixture:
            normalizeEvent(
              match
            ),

          recentMatches: {

            home:
              homeRecent,

            away:
              awayRecent

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
            "Mozilla/5.0 (compatible; YCB/2.2)"

        }

      }
    );


  const text =
    await response.text();


  let data =
    null;


  try {

    data =
      text
        ? JSON.parse(
            text
          )
        : null;

  } catch {}


  if (
    !response.ok
  ) {

    throw new Error(
      `SofaScore HTTP ${response.status}`
    );

  }


  return data;

}


async function getRecentTeamMatches(
  teamId
) {

  const data =
    await fetchJSON(

      `${API}/team/${teamId}/events/last/0`

    );


  const events =
    Array.isArray(
      data?.events
    )
      ? data.events
      : [];


  return events

    .filter(
      event =>
        isFinished(
          event
        )
    )

    .slice(
      0,
      15
    )

    .map(
      normalizeEvent
    );

}


function normalizeEvent(
  event
) {

  const home =
    event?.homeTeam ||
    {};


  const away =
    event?.awayTeam ||
    {};


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.startTimestamp

        ? new Date(
            event.startTimestamp *
            1000
          ).toISOString()

        : null,

    status:
      isFinished(
        event
      )
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home?.id ||
        null,

      name:
        home?.name ||
        null,

      shortName:
        home?.shortName ||
        null

    },

    awayTeam: {

      id:
        away?.id ||
        null,

      name:
        away?.name ||
        null,

      shortName:
        away?.shortName ||
        null

    },

    score: {

      fullTime: {

        home:
          finiteOrNull(
            event
              ?.homeScore
              ?.normaltime ??
            event
              ?.homeScore
              ?.current
          ),

        away:
          finiteOrNull(
            event
              ?.awayScore
              ?.normaltime ??
            event
              ?.awayScore
              ?.current
          )

      }

    },

    tournament:
      event
        ?.tournament
        ?.name ||
      null

  };

}


function findMatch(
  events,
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


  return events.find(
    event =>

      namesMatch(
        normalizeName(
          event
            ?.homeTeam
            ?.name
        ),

        homeName
      )

      &&

      namesMatch(
        normalizeName(
          event
            ?.awayTeam
            ?.name
        ),

        awayName
      )

  );

}


function isFinished(
  event
) {

  return (

    event
      ?.status
      ?.type ===
    "finished"

    ||

    event
      ?.status
      ?.type ===
    "after_penalties"

    ||

    event
      ?.status
      ?.type ===
    "after_extra_time"

  );

}


function finiteOrNull(
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


  const tokens =
    new Set(

      first
        .split(" ")
        .filter(
          item =>
            item.length >= 3
        )

    );


  return second
    .split(" ")
    .some(
      item =>
        item.length >= 3 &&
        tokens.has(
          item
        )
    );

}


const provider =
  new SofaScoreProvider();


registerProvider(
  provider
);


export default provider;
