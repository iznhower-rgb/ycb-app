// ==========================================================
// Y.C.B THESPORTSDB PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://www.thesportsdb.com/api/v1/json/123";


class TheSportsDBProvider
  extends DataProvider {

  constructor() {

    super(
      "TheSportsDB"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    try {

      const [
        homeTeam,
        awayTeam
      ] =
        await Promise.all([

          findTeam(
            home
          ),

          findTeam(
            away
          )

        ]);


      let fixture =
        await findFixture(
          home,
          away
        );


      if (
        !fixture &&
        homeTeam?.idTeam
      ) {

        fixture =
          await findUpcomingFixture(
            homeTeam.idTeam,
            home,
            away
          );

      }


      if (
        !fixture &&
        awayTeam?.idTeam
      ) {

        fixture =
          await findUpcomingFixture(
            awayTeam.idTeam,
            home,
            away
          );

      }


      const [
        homeMatches,
        awayMatches
      ] =
        await Promise.all([

          homeTeam?.idTeam

            ? getRecentMatches(
                homeTeam.idTeam
              )

            : Promise.resolve([]),

          awayTeam?.idTeam

            ? getRecentMatches(
                awayTeam.idTeam
              )

            : Promise.resolve([])

        ]);


      const fixtureId =
        String(
          fixture?.idEvent ||
          ""
        );


      const cleanHome =
        homeMatches.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            fixtureId
        );


      const cleanAway =
        awayMatches.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            fixtureId
        );


      if (
        !fixture &&
        !cleanHome.length &&
        !cleanAway.length
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "TheSportsDB متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "thesportsdb",

            available:
              true,

            matchFound:
              false,

            recentMatches: {

              home: [],
              away: []

            }

          }

        };

      }


      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture

            ? "تم العثور على المباراة وبياناتها عبر TheSportsDB."

            : "تم العثور على بيانات تاريخية عبر TheSportsDB لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "thesportsdb",

          available:
            true,

          matchFound:
            Boolean(
              fixture
            ),

          fixture:
            fixture
              ? normalizeEvent(
                  fixture
                )
              : null,

          recentMatches: {

            home:
              cleanHome,

            away:
              cleanAway

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          "network_error",

        message:
          error?.message ||
          String(
            error
          ),

        data:
          null

      };

    }

  }

}


// ==========================================================
// FIND TEAM
// ==========================================================

async function findTeam(
  name
) {

  const data =
    await fetchJSON(

      `${API}/searchteams.php?t=` +
      encodeURIComponent(
        name
      )

    );


  const teams =
    Array.isArray(
      data?.teams
    )

      ? data.teams

      : [];


  return (

    teams.find(
      team =>
        namesMatch(
          team?.strTeam,
          name
        )
    )

    ||

    teams[0]

    ||

    null

  );

}


// ==========================================================
// FIND FIXTURE
// ==========================================================

async function findFixture(
  home,
  away
) {

  const queries = [

    `${home}_vs_${away}`,

    `${home}_v_${away}`

  ];


  for (
    const query
    of queries
  ) {

    try {

      const data =
        await fetchJSON(

          `${API}/searchevents.php?e=` +
          encodeURIComponent(
            query
          )

        );


      const events =
        Array.isArray(
          data?.event
        )

          ? data.event

          : [];


      const match =
        events.find(
          event =>

            namesMatch(
              event?.strHomeTeam,
              home
            )

            &&

            namesMatch(
              event?.strAwayTeam,
              away
            )

        );


      if (
        match
      ) {

        return match;

      }

    } catch {

      /*
       * Try next query.
       */

    }

  }


  return null;

}


// ==========================================================
// UPCOMING
// ==========================================================

async function findUpcomingFixture(
  teamId,
  home,
  away
) {

  try {

    const data =
      await fetchJSON(

        `${API}/eventsnext.php?id=` +
        encodeURIComponent(
          teamId
        )

      );


    const events =
      Array.isArray(
        data?.events
      )

        ? data.events

        : [];


    return (

      events.find(
        event =>

          namesMatch(
            event?.strHomeTeam,
            home
          )

          &&

          namesMatch(
            event?.strAwayTeam,
            away
          )

      )

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// RECENT
// ==========================================================

async function getRecentMatches(
  teamId
) {

  try {

    const data =
      await fetchJSON(

        `${API}/eventslast.php?id=` +
        encodeURIComponent(
          teamId
        )

      );


    const events =
      Array.isArray(
        data?.results
      )

        ? data.results

        : Array.isArray(
            data?.events
          )

          ? data.events

          : [];


    return events

      .filter(
        hasValidScore
      )

      .sort(
        (a,b) =>
          new Date(
            getEventDate(
              b
            )
          ) -

          new Date(
            getEventDate(
              a
            )
          )
      )

      .slice(
        0,
        15
      )

      .map(
        normalizeEvent
      );

  } catch {

    return [];

  }

}


// ==========================================================
// FETCH
// ==========================================================

async function fetchJSON(
  url
) {

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


  if (
    !response.ok
  ) {

    throw new Error(
      `TheSportsDB HTTP ${response.status}`
    );

  }


  try {

    return text
      ? JSON.parse(
          text
        )
      : null;

  } catch {

    throw new Error(
      "TheSportsDB invalid JSON"
    );

  }

}


// ==========================================================
// NORMALIZE
// ==========================================================

function normalizeEvent(
  event
) {

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );


  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );


  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate:
      getEventDate(
        event
      ),

    status:
      homeScore !== null &&
      awayScore !== null

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


// ==========================================================
// DATE
// ==========================================================

function getEventDate(
  event
) {

  if (
    !event?.dateEvent
  ) {

    return null;

  }


  return (

    `${event.dateEvent}T` +

    `${event.strTime || "00:00:00"}Z`

  );

}


// ==========================================================
// VALID SCORE
// ==========================================================

function hasValidScore(
  event
) {

  return (

    finiteOrNull(
      event?.intHomeScore
    ) !== null

    &&

    finiteOrNull(
      event?.intAwayScore
    ) !== null

  );

}


// ==========================================================
// NUMBER
// ==========================================================

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


// ==========================================================
// NAME NORMALIZATION
// ==========================================================

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


// ==========================================================
// NAME MATCH
// ==========================================================

function namesMatch(
  first,
  second
) {

  first =
    normalizeName(
      first
    );


  second =
    normalizeName(
      second
    );


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


  return (

    secondTokens.length > 0 &&

    secondTokens.filter(
      token =>
        firstTokens.has(
          token
        )
    ).length >=
      Math.min(
        2,
        secondTokens.length
      )

  );

}


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new TheSportsDBProvider();


registerProvider(
  provider
);


export default provider;
