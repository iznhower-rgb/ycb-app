// Y.C.B THESPORTSDB PROVIDER 2.2.0

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

      /*
       * 1. Try to find the exact fixture.
       */

      let fixture =
        await findFixture(
          home,
          away
        );


      /*
       * 2. Find both teams.
       */

      const homeTeam =
        await findTeam(
          home
        );

      const awayTeam =
        await findTeam(
          away
        );


      /*
       * 3. If the exact fixture was not found,
       * try the upcoming events of the teams.
       */

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


      /*
       * 4. Historical matches.
       */

      const [
        homeRecent,
        awayRecent
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


      /*
       * 5. No useful information at all.
       */

      if (
        !fixture &&
        homeRecent.length === 0 &&
        awayRecent.length === 0
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

              home:
                [],

              away:
                []

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
              homeRecent,

            away:
              awayRecent

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


/* ==========================================
   FIND TEAM
========================================== */

async function findTeam(
  name
) {

  const url =
    `${API}/searchteams.php?t=` +
    encodeURIComponent(
      name
    );


  const data =
    await fetchJSON(
      url
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
          normalizeName(
            team?.strTeam
          ),
          normalizeName(
            name
          )
        )
    )

    ||

    teams[0]

    ||

    null

  );

}


/* ==========================================
   FIND FIXTURE
========================================== */

async function findFixture(
  home,
  away
) {

  const names = [

    `${home}_vs_${away}`,

    `${home}_v_${away}`

  ];


  for (
    const name
    of names
  ) {

    try {

      const url =
        `${API}/searchevents.php?e=` +
        encodeURIComponent(
          name
        );


      const data =
        await fetchJSON(
          url
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
              normalizeName(
                event?.strHomeTeam
              ),
              normalizeName(
                home
              )
            )

            &&

            namesMatch(
              normalizeName(
                event?.strAwayTeam
              ),
              normalizeName(
                away
              )
            )
        );


      if (
        match
      ) {

        return match;

      }

    } catch {
      /*
       * Try next search pattern.
       */
    }

  }


  return null;

}


/* ==========================================
   FIND UPCOMING FIXTURE
========================================== */

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
            normalizeName(
              event?.strHomeTeam
            ),
            normalizeName(
              home
            )
          )

          &&

          namesMatch(
            normalizeName(
              event?.strAwayTeam
            ),
            normalizeName(
              away
            )
          )

      )

      ||

      null

    );

  } catch {

    return null;

  }

}


/* ==========================================
   RECENT MATCHES
========================================== */

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
        event =>
          hasValidScore(
            event
          )
      )

      .sort(
        (
          a,
          b
        ) =>

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
            "application/json"

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

  } catch {

    data =
      null;

  }


  if (
    !response.ok
  ) {

    throw new Error(

      `TheSportsDB HTTP ${response.status}`

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

  const homeScore =
    finiteOrNull(
      event?.intHomeScore
    );


  const awayScore =
    finiteOrNull(
      event?.intAwayScore
    );


  const finished =
    homeScore !== null &&
    awayScore !== null;


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


/* ==========================================
   EVENT DATE
========================================== */

function getEventDate(
  event
) {

  const date =
    event?.dateEvent ||
    "";


  const time =
    event?.strTime ||
    "00:00:00";


  if (
    !date
  ) {

    return null;

  }


  return `${date}T${time}Z`;

}


/* ==========================================
   VALID SCORE
========================================== */

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


/* ==========================================
   NUMBER
========================================== */

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
    first.includes(
      second
    ) ||
    second.includes(
      first
    )
  ) {

    return true;

  }


  const firstTokens =
    new Set(

      first
        .split(
          " "
        )
        .filter(
          token =>
            token.length >= 3
        )

    );


  return second

    .split(
      " "
    )

    .some(
      token =>
        token.length >= 3 &&
        firstTokens.has(
          token
        )
    );

}


/* ==========================================
   REGISTER
========================================== */

const provider =
  new TheSportsDBProvider();


registerProvider(
  provider
);


export default provider;
