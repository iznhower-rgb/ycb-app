// ==========================================================
// Y.C.B THESPORTSDB PROVIDER 3.0.1
// ==========================================================
//
// Independent fixture verification provider.
//
// We deliberately use Search Events instead of the team-search
// endpoint because the free V1 API has restrictions on several
// search/list endpoints.
//
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

      const fixture =
        await findFixture(
          home,
          away
        );


      if (
        !fixture
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "TheSportsDB متصل لكن لم يتم العثور على المباراة المطلوبة.",

          data: {

            source:
              "thesportsdb",

            available:
              true,

            matchFound:
              false,

            fixture:
              null,

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
          "success",

        message:
          "تم التحقق من المباراة عبر TheSportsDB كمصدر مستقل.",

        data: {

          source:
            "thesportsdb",

          available:
            true,

          matchFound:
            true,

          fixture:
            normalizeEvent(
              fixture
            ),

          recentMatches: {

            home:
              [],

            away:
              []

          },

          historyAvailable:
            false

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
   FIND FIXTURE
========================================================== */

async function findFixture(
  home,
  away
) {

  const patterns = [

    `${home}_vs_${away}`,

    `${home}_v_${away}`,

    `${away}_vs_${home}`,

    `${away}_v_${home}`

  ];


  for (
    const pattern
    of patterns
  ) {

    try {

      const data =
        await fetchJSON(

          `${API}/searchevents.php?e=` +

          encodeURIComponent(
            pattern
          )

        );


      const events =
        Array.isArray(
          data?.event
        )
          ? data.event
          : [];


      const exact =
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
        exact
      ) {

        return exact;

      }

    } catch {

      /*
       * Try the next pattern.
       */

    }

  }


  return null;

}


/* ==========================================================
   NORMALIZE EVENT
========================================================== */

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

    event?.strStatus ===
      "Match Finished"

    ||

    event?.strProgress ===
      "Final"

    ||

    (
      homeScore !== null &&
      awayScore !== null &&
      event?.strStatus ===
        "FT"
    );


  return {

    id:
      String(
        event?.idEvent ||
        ""
      ),

    utcDate:
      event?.dateEvent

        ? `${event.dateEvent}T${event?.strTime || "00:00:00"}Z`

        : null,

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
          finished
            ? homeScore
            : null,

        away:
          finished
            ? awayScore
            : null

      }

    },

    tournament:
      event?.strLeague ||
      null

  };

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
            "YCB-Football-Prediction-Engine/3.0.1"

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
      "TheSportsDB returned invalid JSON"
    );

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
   NAME MATCH
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
      x =>
        ta.has(x)
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
   NUMBER
========================================================== */

function finiteOrNull(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


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
   REGISTER
========================================================== */

const provider =
  new TheSportsDBProvider();


registerProvider(
  provider
);


export default provider;
