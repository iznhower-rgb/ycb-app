// ==========================================================
// Y.C.B OPENLIGADB PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.openligadb.de";


const LEAGUES = [

  "bl1",
  "bl2",
  "bl3"

];


// ==========================================================
// PROVIDER
// ==========================================================

class OpenLigaDBProvider
  extends DataProvider {

  constructor() {

    super(
      "OpenLigaDB"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    try {

      const season =
        currentSeason();


      const teamResults =
        await Promise.all(

          LEAGUES.map(
            async shortcut => {

              try {

                return await fetchJSON(

                  `${API}/getavailableteams/` +
                  `${shortcut}/` +
                  `${season}`

                );

              } catch {

                return [];

              }

            }
          )

        );


      const teams =
        teamResults.flat();


      const homeTeam =
        selectBestTeam(
          teams,
          home
        );


      const awayTeam =
        selectBestTeam(
          teams,
          away
        );


      let fixture =
        null;


      if (
        homeTeam?.teamId &&
        awayTeam?.teamId
      ) {

        fixture =
          await findDirectMatch(
            homeTeam.teamId,
            awayTeam.teamId,
            home,
            away
          );

      }


      const [
        homeMatches,
        awayMatches
      ] =
        await Promise.all([

          homeTeam?.teamId

            ? getTeamMatches(
                homeTeam.teamId
              )

            : Promise.resolve([]),

          awayTeam?.teamId

            ? getTeamMatches(
                awayTeam.teamId
              )

            : Promise.resolve([])

        ]);


      if (
        !fixture
      ) {

        fixture =
          findFixtureInMatches(
            homeMatches,
            home,
            away
          )

          ||

          findFixtureInMatches(
            awayMatches,
            home,
            away
          );

      }


      const homeRecent =
        cleanRecent(
          homeMatches,
          fixture
        );


      const awayRecent =
        cleanRecent(
          awayMatches,
          fixture
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
            "OpenLigaDB متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "openligadb",

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

            ? "تم العثور على المباراة وبياناتها عبر OpenLigaDB."

            : "تم العثور على بيانات تاريخية عبر OpenLigaDB لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "openligadb",

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
              homeRecent.map(
                normalizeMatch
              ),

            away:
              awayRecent.map(
                normalizeMatch
              )

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
// TEAM MATCHES
// ==========================================================

async function getTeamMatches(
  teamId
) {

  try {

    const data =
      await fetchJSON(

        `${API}/getmatchesbyteamid/` +
        `${encodeURIComponent(
          teamId
        )}/20/10`

      );


    return Array.isArray(
      data
    )

      ? data

      : [];

  } catch {

    return [];

  }

}


// ==========================================================
// DIRECT MATCH
// ==========================================================

async function findDirectMatch(
  homeId,
  awayId,
  home,
  away
) {

  try {

    const data =
      await fetchJSON(

        `${API}/getmatchdata/` +
        `${encodeURIComponent(
          homeId
        )}/` +
        `${encodeURIComponent(
          awayId
        )}`

      );


    const matches =
      Array.isArray(
        data
      )

        ? data

        : [];


    return (

      matches.find(
        match =>
          namesMatch(
            match?.team1?.teamName,
            home
          )

          &&

          namesMatch(
            match?.team2?.teamName,
            away
          )
      )

      ||

      matches.find(
        match =>
          namesMatch(
            match?.team1?.teamName,
            away
          )

          &&

          namesMatch(
            match?.team2?.teamName,
            home
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
// FIND FIXTURE
// ==========================================================

function findFixtureInMatches(
  matches,
  home,
  away
) {

  return (

    Array.isArray(
      matches
    )

      ? matches

      : []

  ).find(
    match =>
      namesMatch(
        match?.team1?.teamName,
        home
      )

      &&

      namesMatch(
        match?.team2?.teamName,
        away
      )
  )

  || null;

}


// ==========================================================
// CLEAN RECENT
// ==========================================================

function cleanRecent(
  matches,
  fixture
) {

  return (

    Array.isArray(
      matches
    )

      ? matches

      : []

  )

    .filter(
      match =>
        !sameEvent(
          match,
          fixture
        )
    )

    .filter(
      isFinished
    )

    .sort(
      (a,b) =>
        new Date(
          b?.matchDateTime ||
          0
        ) -

        new Date(
          a?.matchDateTime ||
          0
        )
    )

    .slice(
      0,
      15
    );

}


// ==========================================================
// SELECT TEAM
// ==========================================================

function selectBestTeam(
  teams,
  name
) {

  const list =
    Array.isArray(
      teams
    )

      ? teams

      : [];


  const requested =
    normalizeName(
      name
    );


  return (

    list.find(
      team =>
        normalizeName(
          team?.teamName
        ) ===
        requested
    )

    ||

    list.find(
      team =>
        namesMatch(
          team?.teamName,
          requested
        )
    )

    ||

    null

  );

}


// ==========================================================
// NORMALIZE MATCH
// ==========================================================

function normalizeMatch(
  match
) {

  const result =
    getFinalResult(
      match
    );


  const team1 =
    match?.team1 ||
    {};


  const team2 =
    match?.team2 ||
    {};


  return {

    id:
      String(
        match?.matchID ||
        ""
      ),

    utcDate:
      match?.matchDateTimeUTC ||
      match?.matchDateTime ||
      null,

    status:
      isFinished(
        match
      )

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        team1?.teamId ||
        null,

      name:
        team1?.teamName ||
        null,

      shortName:
        team1?.shortName ||
        null

    },

    awayTeam: {

      id:
        team2?.teamId ||
        null,

      name:
        team2?.teamName ||
        null,

      shortName:
        team2?.shortName ||
        null

    },

    score: {

      fullTime: {

        home:
          result.home,

        away:
          result.away

      }

    },

    tournament:
      match?.leagueName ||
      null

  };

}


// ==========================================================
// FINAL RESULT
// ==========================================================

function getFinalResult(
  match
) {

  const results =
    Array.isArray(
      match?.matchResults
    )

      ? match.matchResults

      : [];


  const final =
    results.find(
      item =>
        /end|final/i.test(
          String(
            item?.resultName ||
            ""
          )
        )
    )

    ||

    results[
      results.length - 1
    ];


  return {

    home:
      finiteOrNull(
        final?.pointsTeam1
      ),

    away:
      finiteOrNull(
        final?.pointsTeam2
      )

  };

}


// ==========================================================
// FINISHED
// ==========================================================

function isFinished(
  match
) {

  const result =
    getFinalResult(
      match
    );


  return (

    result.home !== null &&

    result.away !== null

  );

}


// ==========================================================
// SAME EVENT
// ==========================================================

function sameEvent(
  first,
  second
) {

  return Boolean(
    first &&
    second
  )

  &&

  String(
    first?.matchID ||
    ""
  )

  ===

  String(
    second?.matchID ||
    ""
  );

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
      `OpenLigaDB HTTP ${response.status}`
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
      "OpenLigaDB invalid JSON"
    );

  }

}


// ==========================================================
// SEASON
// ==========================================================

function currentSeason() {

  const now =
    new Date();


  const year =
    now.getUTCFullYear();


  const month =
    now.getUTCMonth();


  return month >= 7
    ? year
    : year - 1;

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
  new OpenLigaDBProvider();


registerProvider(
  provider
);


export default provider;
