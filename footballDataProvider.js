// ==========================================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.football-data.org/v4";


const COMPETITIONS = [

  "PL",
  "PD",
  "BL1",
  "SA",
  "FL1",
  "CL",
  "DED",
  "PPL",
  "BSA"

];


// ==========================================================
// PROVIDER
// ==========================================================

class FootballDataProvider
  extends DataProvider {

  constructor() {

    super(
      "Football-Data.org"
    );

  }


  async getMatchData(
    home,
    away,
    env
  ) {

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN ||
        ""
      ).trim();


    if (
      !token
    ) {

      return {

        status:
          "not_configured",

        message:
          "Football-Data.org يحتاج FOOTBALL_DATA_TOKEN في إعدادات Worker.",

        data:
          null

      };

    }


    try {

      const from =
        daysFromNow(
          -120
        );


      const to =
        daysFromNow(
          45
        );


      const headers = {

        Accept:
          "application/json",

        "X-Auth-Token":
          token

      };


      const allMatches =
        [];


      for (
        const competition
        of COMPETITIONS
      ) {

        try {

          const data =
            await fetchJSON(

              `${API}/competitions/` +
              `${competition}/matches` +
              `?dateFrom=${from}` +
              `&dateTo=${to}`,

              headers

            );


          if (
            Array.isArray(
              data?.matches
            )
          ) {

            allMatches.push(
              ...data.matches
            );

          }

        } catch {

          /*
           * Continue with next competition.
           */

        }

      }


      const fixture =
        allMatches.find(
          match =>
            sameTeams(
              match,
              home,
              away
            )

            &&

            !isFinished(
              match
            )
        )

        ||

        allMatches.find(
          match =>
            sameTeams(
              match,
              home,
              away
            )
        )

        ||

        null;


      const homeRecent =
        allMatches

          .filter(
            match =>
              isFinished(
                match
              )

              &&

              (
                namesMatch(
                  match?.homeTeam?.name,
                  home
                )

                ||

                namesMatch(
                  match?.awayTeam?.name,
                  home
                )

              )
          )

          .sort(
            (a,b) =>
              new Date(
                b?.utcDate ||
                0
              ) -

              new Date(
                a?.utcDate ||
                0
              )
          )

          .slice(
            0,
            15
          )

          .map(
            normalizeMatch
          )

          .filter(
            match =>
              String(
                match?.id ||
                ""
              ) !==
              String(
                fixture?.id ||
                ""
              )
          );


      const awayRecent =
        allMatches

          .filter(
            match =>
              isFinished(
                match
              )

              &&

              (
                namesMatch(
                  match?.homeTeam?.name,
                  away
                )

                ||

                namesMatch(
                  match?.awayTeam?.name,
                  away
                )

              )
          )

          .sort(
            (a,b) =>
              new Date(
                b?.utcDate ||
                0
              ) -

              new Date(
                a?.utcDate ||
                0
              )
          )

          .slice(
            0,
            15
          )

          .map(
            normalizeMatch
          )

          .filter(
            match =>
              String(
                match?.id ||
                ""
              ) !==
              String(
                fixture?.id ||
                ""
              )
          );


      if (
        !fixture &&
        !homeRecent.length &&
        !awayRecent.length
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "Football-Data.org متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "football-data",

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

            ? "تم العثور على المباراة وبياناتها عبر Football-Data.org."

            : "تم العثور على بيانات تاريخية عبر Football-Data.org لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "football-data",

          available:
            true,

          matchFound:
            Boolean(
              fixture
            ),

          fixture:
            fixture
              ? normalizeMatch(
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


// ==========================================================
// SAME TEAMS
// ==========================================================

function sameTeams(
  match,
  home,
  away
) {

  return (

    namesMatch(
      match?.homeTeam?.name,
      home
    )

    &&

    namesMatch(
      match?.awayTeam?.name,
      away
    )

  );

}


// ==========================================================
// NORMALIZE
// ==========================================================

function normalizeMatch(
  match
) {

  const homeScore =
    finiteOrNull(
      match?.score?.fullTime?.home
    );


  const awayScore =
    finiteOrNull(
      match?.score?.fullTime?.away
    );


  return {

    id:
      String(
        match?.id ||
        ""
      ),

    utcDate:
      match?.utcDate ||
      null,

    status:
      homeScore !== null &&
      awayScore !== null

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        match?.homeTeam?.id ||
        null,

      name:
        match?.homeTeam?.name ||
        null,

      shortName:
        match?.homeTeam?.shortName ||
        null

    },

    awayTeam: {

      id:
        match?.awayTeam?.id ||
        null,

      name:
        match?.awayTeam?.name ||
        null,

      shortName:
        match?.awayTeam?.shortName ||
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
      match?.competition?.name ||
      null

  };

}


// ==========================================================
// FINISHED
// ==========================================================

function isFinished(
  match
) {

  const home =
    finiteOrNull(
      match?.score?.fullTime?.home
    );


  const away =
    finiteOrNull(
      match?.score?.fullTime?.away
    );


  return (

    home !== null &&
    away !== null

  );

}


// ==========================================================
// DATE
// ==========================================================

function daysFromNow(
  days
) {

  const date =
    new Date(
      Date.now() +
      days *
      86400000
    );


  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


// ==========================================================
// FETCH
// ==========================================================

async function fetchJSON(
  url,
  headers
) {

  const response =
    await fetch(
      url,
      {
        headers
      }
    );


  const text =
    await response.text();


  if (
    !response.ok
  ) {

    throw new Error(
      `Football-Data.org HTTP ${response.status}`
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
      "Football-Data.org invalid JSON"
    );

  }

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
// REGISTER
// ==========================================================

const provider =
  new FootballDataProvider();


registerProvider(
  provider
);


export default provider;
