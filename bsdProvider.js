/* ==========================================================
   Y.C.B BSD PROVIDER 3.1.0
========================================================== */

/*
 * BSD is optional.
 *
 * Configure:
 *
 *   BSD_API_URL
 *
 * Optional:
 *
 *   BSD_API_KEY
 *
 * The endpoint should accept:
 *
 *   ?home=...&away=...
 *
 * and return normalized Y.C.B data or raw match data.
 */

import {
  registerProvider
} from "./providers.js";


/* ==========================================================
   NORMALIZE BSD DATA
========================================================== */

function normalizeRaw(
  data,
  home,
  away
) {

  if (
    !data ||
    typeof data !==
      "object"
  ) {

    return null;

  }


  if (
    data.fixture ||
    data.recentMatches
  ) {

    return data;

  }


  const fixture =
    data.fixture ||
    data.match ||
    null;


  const homeMatches =
    data.recentMatches?.home ||
    data.homeMatches ||
    [];


  const awayMatches =
    data.recentMatches?.away ||
    data.awayMatches ||
    [];


  return {

    matchFound:
      Boolean(
        fixture
      ),

    fixture,

    recentMatches: {

      home:
        Array.isArray(
          homeMatches
        )
          ? homeMatches
          : [],

      away:
        Array.isArray(
          awayMatches
        )
          ? awayMatches
          : []

    },

    requested: {

      home,

      away

    }

  };

}


/* ==========================================================
   GET MATCH DATA
========================================================== */

async function getMatchData(
  home,
  away,
  env
) {

  const endpoint =
    String(
      env?.BSD_API_URL ||
      ""
    ).trim();


  if (
    !endpoint
  ) {

    return {

      status:
        "disabled",

      message:
        "BSD_API_URL غير مضبوط.",

      data:
        null

    };

  }


  const url =
    new URL(
      endpoint
    );


  url.searchParams.set(
    "home",
    home
  );


  url.searchParams.set(
    "away",
    away
  );


  const response =
    await fetch(
      url.toString(),
      {

        headers: {

          Accept:
            "application/json",

          ...(

            env?.BSD_API_KEY

              ? {

                  Authorization:
                    `Bearer ${env.BSD_API_KEY}`

                }

              : {}

          )

        }

      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `BSD HTTP ${response.status}`
    );

  }


  const raw =
    await response.json();


  const data =
    normalizeRaw(
      raw,
      home,
      away
    );


  return {

    status:
      data
        ? "success"
        : "empty",

    message:
      data
        ? "BSD data loaded"
        : "BSD returned no usable data",

    data

  };

}


/* ==========================================================
   REGISTER
========================================================== */

registerProvider({

  name:
    "BSD",

  version:
    "3.1.0",

  description:
    "Optional BSD football data provider",

  getMatchData

});


export {
  getMatchData
};
