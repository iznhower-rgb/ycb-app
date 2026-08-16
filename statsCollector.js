/* ==========================================================
   Y.C.B STATS COLLECTOR 3.1.0
========================================================== */

/*
 * Responsibilities:
 *
 *   mergeProviderData()
 *   dedupeMatches()
 *   buildTeamAnalysis()
 *   calculateTeamStats()
 *   normalizeName()
 *   namesMatch()
 */


/* ==========================================================
   MERGE PROVIDER DATA
========================================================== */

export function mergeProviderData(
  results
) {

  let fixture =
    null;


  const homeMatches =
    [];


  const awayMatches =
    [];


  const sourceProviders =
    [];


  for (
    const item
    of Array.isArray(
      results
    )
      ? results
      : []
  ) {

    if (
      !item
    ) {

      continue;

    }


    const data =
      item.data ||
      {};


    if (
      !fixture &&
      data.fixture
    ) {

      fixture =
        data.fixture;

    }


    if (
      item.provider
    ) {

      sourceProviders.push(
        item.provider
      );

    }


    if (
      Array.isArray(
        data.recentMatches?.home
      )
    ) {

      homeMatches.push(
        ...data.recentMatches.home
      );

    }


    if (
      Array.isArray(
        data.recentMatches?.away
      )
    ) {

      awayMatches.push(
        ...data.recentMatches.away
      );

    }

  }


  return {

    fixture,

    homeMatches:
      dedupeMatches(
        homeMatches
      ),

    awayMatches:
      dedupeMatches(
        awayMatches
      ),

    sourceProviders: [

      ...new Set(
        sourceProviders
      )

    ]

  };

}


/* ==========================================================
   DEDUPE MATCHES
========================================================== */

export function dedupeMatches(
  matches
) {

  const seen =
    new Set();


  const result =
    [];


  for (
    const match
    of Array.isArray(
      matches
    )
      ? matches
      : []
  ) {

    if (
      !match
    ) {

      continue;

    }


    const key =
      String(

        match.id ||

        [
          match.utcDate,
          match.date,
          match.homeTeam?.name,
          match.awayTeam?.name,
          match.score?.fullTime?.home,
          match.score?.fullTime?.away
        ].join(
          "|"
        )

      );


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    result.push(
      match
    );

  }


  result.sort(
    (
      a,
      b
    ) =>

      parseDate(
        b?.utcDate ||
        b?.date
      )

      -

      parseDate(
        a?.utcDate ||
        a?.date
      )
  );


  return result.slice(
    0,
    15
  );

}


/* ==========================================================
   BUILD TEAM ANALYSIS
========================================================== */

export function buildTeamAnalysis(
  homeName,
  awayName,
  merged
) {

  const safe =
    merged ||
    {};


  const home =
    calculateTeamStats(
      homeName,
      safe.homeMatches ||
      []
    );


  const away =
    calculateTeamStats(
      awayName,
      safe.awayMatches ||
      []
    );


  const homeXg =
    clamp(

      (

        home.goalsForAvg *
        0.55

        +

        away.goalsAgainstAvg *
        0.45

      )

      *

      1.08,

      0.15,

      4

    );


  const awayXg =
    clamp(

      (

        away.goalsForAvg *
        0.55

        +

        home.goalsAgainstAvg *
        0.45

      )

      *

      0.92,

      0.10,

      3.50

    );


  return {

    home,

    away,

    model: {

      homeXg:
        round(
          homeXg
        ),

      awayXg:
        round(
          awayXg
        )

    }

  };

}


/* ==========================================================
   CALCULATE TEAM STATS
========================================================== */

export function calculateTeamStats(
  teamName,
  matches
) {

  const team =
    normalizeName(
      teamName
    );


  const usable =
    (
      Array.isArray(
        matches
      )
        ? matches
        : []
    )

      .map(
        match => {

          if (
            !match
          ) {

            return null;

          }


          const home =
            normalizeName(
              match.homeTeam?.name
            );


          const away =
            normalizeName(
              match.awayTeam?.name
            );


          const homeGoals =
            Number(
              match.score?.fullTime?.home
            );


          const awayGoals =
            Number(
              match.score?.fullTime?.away
            );


          if (

            !Number.isFinite(
              homeGoals
            )

            ||

            !Number.isFinite(
              awayGoals
            )

            ||

            (

              !namesMatch(
                home,
                team
              )

              &&

              !namesMatch(
                away,
                team
              )

            )

          ) {

            return null;

          }


          const isHome =
            namesMatch(
              home,
              team
            );


          const gf =
            isHome
              ? homeGoals
              : awayGoals;


          const ga =
            isHome
              ? awayGoals
              : homeGoals;


          return {

            id:
              match.id ||
              null,

            utcDate:
              match.utcDate ||
              match.date ||
              null,

            gf,

            ga,

            result:

              gf > ga
                ? "W"

                : gf < ga
                  ? "L"
                  : "D"

          };

        }
      )

      .filter(
        Boolean
      );


  const last5 =
    usable.slice(
      0,
      5
    );


  const last10 =
    usable.slice(
      0,
      10
    );


  const average =
    (
      items,
      key
    ) => {

      if (
        !items.length
      ) {

        return 0;

      }


      return (

        items.reduce(
          (
            sum,
            item
          ) =>

            sum +
            Number(
              item[key] ||
              0
            ),

          0
        )

        /

        items.length

      );

    };


  const gf5 =
    average(
      last5,
      "gf"
    );


  const gf10 =
    average(
      last10,
      "gf"
    );


  const ga5 =
    average(
      last5,
      "ga"
    );


  const ga10 =
    average(
      last10,
      "ga"
    );


  const wins =
    usable.filter(
      item =>
        item.result ===
        "W"
    ).length;


  const draws =
    usable.filter(
      item =>
        item.result ===
        "D"
    ).length;


  const losses =
    usable.filter(
      item =>
        item.result ===
        "L"
    ).length;


  const games =
    usable.length;


  const formPoints =
    wins * 3 +
    draws;


  const formRate =
    games

      ? formPoints /
        (
          games *
          3
        )

      : 0;


  return {

    team:
      teamName,

    games,

    wins,

    draws,

    losses,

    formPoints,

    formRate:
      round(
        formRate
      ),

    goalsForAvg:
      round(

        last5.length

          ? gf5 * 0.60 +
            gf10 * 0.40

          : gf10

      ),

    goalsAgainstAvg:
      round(

        last5.length

          ? ga5 * 0.60 +
            ga10 * 0.40

          : ga10

      ),

    last5:
      last5.map(
        item => ({

          gf:
            item.gf,

          ga:
            item.ga,

          result:
            item.result

        })
      )

  };

}


/* ==========================================================
   NORMALIZE NAME
========================================================== */

export function normalizeName(
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

export function namesMatch(
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
    a === b
  ) {

    return true;

  }


  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }


  const ta =
    new Set(

      a
        .split(
          " "
        )
        .filter(
          token =>
            token.length >= 3
        )

    );


  const tb =
    b
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 3
      );


  if (
    ta.size === 0 ||
    tb.length === 0
  ) {

    return false;

  }


  const overlap =
    tb.filter(
      token =>
        ta.has(
          token
        )
    ).length;


  if (
    tb.length === 1
  ) {

    return overlap >= 1;

  }


  return (
    overlap >=
    Math.min(
      2,
      tb.length
    )
  );

}


/* ==========================================================
   DATE
========================================================== */

function parseDate(
  value
) {

  if (
    !value
  ) {

    return 0;

  }


  const time =
    new Date(
      value
    ).getTime();


  return Number.isFinite(
    time
  )
    ? time
    : 0;

}


/* ==========================================================
   CLAMP
========================================================== */

function clamp(
  value,
  min,
  max
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return min;

  }


  return Math.min(

    Math.max(
      number,
      min
    ),

    max

  );

}


/* ==========================================================
   ROUND
========================================================== */

function round(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return 0;

  }


  return Math.round(
    number *
    100
  ) / 100;

}


/* ==========================================================
   END statsCollector.js
========================================================== */
