// ==========================================================
// Y.C.B SOFASCORE PROVIDER 3.0.0
// Public SofaScore football API
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.sofascore.com/api/v1";


const SEARCH_API =
  "https://api.sofascore.com/api/v1/search/all";


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


      const teamResults =
        await Promise.all(

          [
            homeTeam,
            awayTeam
          ]

          .filter(
            Boolean
          )

          .map(
            team =>
              getTeamEvents(
                team.id
              )
          )

        );


      const events =
        dedupeEvents(
          teamResults.flat()
        );


      const fixture =
        events.find(
          event =>
            isExactFixture(
              event,
              home,
              away
            )
        );


      const homeRecent =
        buildRecentForTeam(
          home,
          events
        );


      const awayRecent =
        buildRecentForTeam(
          away,
          events
        );


      if (
        !fixture &&
        homeRecent.length === 0 &&
        awayRecent.length === 0
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن لم يتم العثور على المباراة أو تاريخ كافٍ.",

          data:
            emptyData()

        };

      }


      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture

            ? "تم التحقق من المباراة وبياناتها عبر SofaScore."

            : "تم العثور على بيانات تاريخية عبر SofaScore لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "sofascore",

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
          String(error),

        data:
          null

      };

    }

  }

}


/* ==========================================================
   FIND TEAM
========================================================== */

async function findTeam(
  name
) {

  const data =
    await fetchJSON(

      `${SEARCH_API}?q=${encodeURIComponent(
        name
      )}`

    );


  const results =
    Array.isArray(
      data?.results
    )

      ? data.results

      : [];


  const candidates =
    results

      .filter(
        item =>
          item?.entity
            ?.sport
            ?.slug ===
          "football"
      )

      .filter(
        item =>
          item?.entity
            ?.type ===
          "team"
      )

      .map(
        item => ({

          team:
            item.entity,

          score:
            nameScore(
              item.entity.name,
              name
            )

        })
      )

      .filter(
        item =>
          item.score > 0
      )

      .sort(
        (a,b) =>
          b.score -
          a.score
      );


  const team =
    candidates[0]?.team;


  return team?.id

    ? {

        id:
          String(
            team.id
          ),

        name:
          team.name,

        shortName:
          team.shortName ||
          team.name

      }

    : null;

}


/* ==========================================================
   TEAM EVENTS
========================================================== */

async function getTeamEvents(
  teamId
) {

  const pages =
    [
      0,
      1
    ];


  const [
    lastPages,
    nextPages
  ] =
    await Promise.all([

      Promise.all(

        pages.map(
          page =>
            fetchJSON(

              `${API}/team/${encodeURIComponent(
                teamId
              )}/events/last/${page}`

            )

            .catch(
              () =>
                ({
                  events: []
                })
            )
        )

      ),

      Promise.all(

        pages.map(
          page =>
            fetchJSON(

              `${API}/team/${encodeURIComponent(
                teamId
              )}/events/next/${page}`

            )

            .catch(
              () =>
                ({
                  events: []
                })
            )
        )

      )

    ]);


  return [

    ...lastPages.flatMap(
      item =>
        Array.isArray(
          item?.events
        )

          ? item.events

          : []
    ),

    ...nextPages.flatMap(
      item =>
        Array.isArray(
          item?.events
        )

          ? item.events

          : []
    )

  ];

}


/* ==========================================================
   EXACT FIXTURE
========================================================== */

function isExactFixture(
  event,
  home,
  away
) {

  return (

    namesMatch(
      event?.homeTeam?.name,
      home
    )

    &&

    namesMatch(
      event?.awayTeam?.name,
      away
    )

  );

}


/* ==========================================================
   RECENT TEAM EVENTS
========================================================== */

function buildRecentForTeam(
  teamName,
  events
) {

  return events

    .filter(
      event => {

        const home =
          event?.homeTeam?.name;


        const away =
          event?.awayTeam?.name;


        return (

          (
            namesMatch(
              home,
              teamName
            )

            ||

            namesMatch(
              away,
              teamName
            )

          )

          &&

          hasValidScore(
            event
          )

        );

      }
    )

    .sort(
      (a,b) =>
        eventTimestamp(
          b
        ) -

        eventTimestamp(
          a
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


/* ==========================================================
   VALID SCORE
========================================================== */

function hasValidScore(
  event
) {

  return (

    finiteOrNull(
      event?.homeScore?.current
    ) !== null

    &&

    finiteOrNull(
      event?.awayScore?.current
    ) !== null

    &&

    isFinished(
      event
    )

  );

}


/* ==========================================================
   FINISHED
========================================================== */

function isFinished(
  event
) {

  const type =
    String(
      event?.status?.type ||
      ""
    ).toLowerCase();


  const code =
    Number(
      event?.status?.code
    );


  return (

    type ===
      "finished"

    ||

    type ===
      "ended"

    ||

    code ===
      100

  );

}


/* ==========================================================
   NORMALIZE EVENT
========================================================== */

function normalizeEvent(
  event
) {

  const homeScore =
    finiteOrNull(
      event?.homeScore?.current
    );


  const awayScore =
    finiteOrNull(
      event?.awayScore?.current
    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:

      Number.isFinite(
        Number(
          event?.startTimestamp
        )
      )

        ? new Date(
            Number(
              event.startTimestamp
            ) * 1000
          ).toISOString()

        : null,

    status:

      homeScore !== null &&
      awayScore !== null &&
      isFinished(
        event
      )

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        event?.homeTeam?.id ||
        null,

      name:
        event?.homeTeam?.name ||
        null,

      shortName:
        event?.homeTeam?.shortName ||
        null

    },

    awayTeam: {

      id:
        event?.awayTeam?.id ||
        null,

      name:
        event?.awayTeam?.name ||
        null,

      shortName:
        event?.awayTeam?.shortName ||
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

      event?.tournament
        ?.uniqueTournament
        ?.name

      ||

      event?.tournament
        ?.name

      ||

      null

  };

}


/* ==========================================================
   DEDUPE EVENTS
========================================================== */

function dedupeEvents(
  events
) {

  const seen =
    new Set();


  return events.filter(
    event => {

      const key =
        String(

          event?.id ||

          [

            event?.startTimestamp,

            event?.homeTeam?.name,

            event?.awayTeam?.name

          ].join("|")

        );


      if (
        seen.has(
          key
        )
      ) {

        return false;

      }


      seen.add(
        key
      );


      return true;

    }
  );

}


/* ==========================================================
   EVENT TIMESTAMP
========================================================== */

function eventTimestamp(
  event
) {

  const value =
    Number(
      event?.startTimestamp
    );


  return Number.isFinite(
    value
  )

    ? value * 1000

    : 0;

}


/* ==========================================================
   FETCH JSON
========================================================== */

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
            "Mozilla/5.0 YCB-Football-Prediction-Engine/3.0"

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

    throw new Error(
      "SofaScore returned invalid JSON"
    );

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `SofaScore HTTP ${response.status}`
    );

  }


  return data;

}


/* ==========================================================
   NORMALIZE NAME
========================================================== */

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


/* ==========================================================
   NAMES MATCH
========================================================== */

function namesMatch(
  first,
  second
) {

  const a =
    normalizeName(
      first
    );


  const b =
    normalizeName(
      second
    );


  if (
    !a ||
    !b
  ) {

    return false;

  }


  if (
    a === b ||
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
          x =>
            x.length >= 3
        )

    );


  const tb =
    b
      .split(" ")
      .filter(
        x =>
          x.length >= 3
      );


  const overlap =
    tb.filter(
      token =>
        ta.has(
          token
        )
    ).length;


  return (
    overlap >=
    Math.min(
      2,
      tb.length
    )
  );

}


/* ==========================================================
   NAME SCORE
========================================================== */

function nameScore(
  candidate,
  wanted
) {

  const a =
    normalizeName(
      candidate
    );


  const b =
    normalizeName(
      wanted
    );


  if (
    !a ||
    !b
  ) {

    return 0;

  }


  if (
    a === b
  ) {

    return 100;

  }


  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return 85;

  }


  const ta =
    new Set(

      a
        .split(" ")
        .filter(
          x =>
            x.length >= 3
        )

    );


  const tb =
    b
      .split(" ")
      .filter(
        x =>
          x.length >= 3
      );


  const overlap =
    tb.filter(
      x =>
        ta.has(
          x
        )
    ).length;


  return overlap
    ? 40 + overlap * 10
    : 0;

}


/* ==========================================================
   NUMBER
========================================================== */

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


/* ==========================================================
   EMPTY DATA
========================================================== */

function emptyData() {

  return {

    source:
      "sofascore",

    available:
      true,

    matchFound:
      false,

    fixture:
      null,

    recentMatches: {

      home: [],

      away: []

    }

  };

}


/* ==========================================================
   REGISTER
========================================================== */

const provider =
  new SofaScoreProvider();


registerProvider(
  provider
);


export default provider;
