// ==========================================================
// Y.C.B TheSportsDB PROVIDER 3.1.0
// ==========================================================

import {
  registerProvider
} from "./providers.js";


const API_BASE =
  "https://www.thesportsdb.com/api/v1/json";


const DEFAULT_KEY =
  "3";


/* ==========================================================
   API KEY
========================================================== */

function apiKey(
  env
) {

  return String(
    env?.THESPORTSDB_API_KEY ||
    DEFAULT_KEY
  ).trim();

}


/* ==========================================================
   JSON
========================================================== */

async function getJson(
  url
) {

  const response =
    await fetch(
      url,
      {
        headers:{
          Accept:
            "application/json"
        }
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `TheSportsDB HTTP ${response.status}`
    );

  }


  return response.json();

}


/* ==========================================================
   CLEAN TEAM
========================================================== */

function cleanTeam(
  team
) {

  if (
    !team
  ) {

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


/* ==========================================================
   EVENT TO MATCH
========================================================== */

function eventToMatch(
  event
) {

  if (
    !event
  ) {

    return null;

  }


  const homeScore =
    event.intHomeScore ==
      null

      ? null

      : Number(
          event.intHomeScore
        );


  const awayScore =
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

      `${event.strHomeTeam}|${event.strAwayTeam}|${date}`,

    utcDate:
      date,

    date,

    homeTeam:{
      name:
        event.strHomeTeam ||
        ""
    },

    awayTeam:{
      name:
        event.strAwayTeam ||
        ""
    },

    score:{
      fullTime:{

        home:
          Number.isFinite(
            homeScore
          )
            ? homeScore
            : null,

        away:
          Number.isFinite(
            awayScore
          )
            ? awayScore
            : null

      }
    },

    competition:
      event.strLeague
        ? {
            name:
              event.strLeague
          }
        : null

  };

}


/* ==========================================================
   FIND TEAM
========================================================== */

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


  const data =
    await getJson(
      url
    );


  const teams =
    Array.isArray(
      data?.teams
    )

      ? data.teams

      : [];


  if (
    !teams.length
  ) {

    return null;

  }


  const target =
    String(
      name
    ).toLowerCase();


  return teams.sort(
    (
      a,
      b
    ) => {

      const aa =
        String(
          a.strTeam ||
          ""
        ).toLowerCase() ===
        target
          ? 0
          : 1;


      const bb =
        String(
          b.strTeam ||
          ""
        ).toLowerCase() ===
        target
          ? 0
          : 1;


      return aa - bb;

    }
  )[0];

}


/* ==========================================================
   LAST EVENTS
========================================================== */

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


  const data =
    await getJson(
      url
    );


  return (

    Array.isArray(
      data?.results
    )
      ? data.results
      : []

  )

    .map(
      eventToMatch
    )

    .filter(
      Boolean
    );

}


/* ==========================================================
   NEXT EVENTS
========================================================== */

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


  const data =
    await getJson(
      url
    );


  return (

    Array.isArray(
      data?.events
    )
      ? data.events
      : []

  )

    .map(
      eventToMatch
    )

    .filter(
      Boolean
    );

}


/* ==========================================================
   GET MATCH DATA
========================================================== */

async function getMatchData(
  home,
  away,
  env
) {

  const key =
    apiKey(
      env
    );


  const [
    homeTeam,
    awayTeam
  ] =

    await Promise.all([

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

      status:
        "not_found",

      message:
        "TheSportsDB لم يجد أحد الفريقين.",

      data:
        null

    };

  }


  const [
    homeEvents,
    awayEvents,
    homeNext,
    awayNext
  ] =

    await Promise.all([

      lastEvents(
        homeTeam.idTeam,
        key
      ),

      lastEvents(
        awayTeam.idTeam,
        key
      ),

      nextEvents(
        homeTeam.idTeam,
        key
      ),

      nextEvents(
        awayTeam.idTeam,
        key
      )

    ]);


  const fixture =

    homeNext.find(
      event =>

        String(
          event?.awayTeam?.name ||
          ""
        )

          .toLowerCase()

          .includes(
            String(
              awayTeam.strTeam ||
              away
            ).toLowerCase()
          )

    )

    ||

    awayNext.find(
      event =>

        String(
          event?.homeTeam?.name ||
          ""
        )

          .toLowerCase()

          .includes(
            String(
              homeTeam.strTeam ||
              home
            ).toLowerCase()
          )

    )

    ||

    null;


  return {

    status:
      "success",

    message:
      "TheSportsDB data loaded",

    data:{

      matchFound:
        Boolean(
          fixture
        ),

      fixture,

      teams:{

        home:
          cleanTeam(
            homeTeam
          ),

        away:
          cleanTeam(
            awayTeam
          )

      },

      recentMatches:{

        home:
          homeEvents.slice(
            0,
            15
          ),

        away:
          awayEvents.slice(
            0,
            15
          )

      }

    }

  };

}


/* ==========================================================
   REGISTER
========================================================== */

registerProvider({

  name:
    "TheSportsDB",

  version:
    "3.1.0",

  description:
    "TheSportsDB football provider",

  getMatchData

});


export {
  getMatchData
};
