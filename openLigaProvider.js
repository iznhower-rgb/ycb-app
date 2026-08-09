// Y.C.B OPENLIGADB PROVIDER 2.2.1

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.openligadb.de";


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

      /*
       * 1. Try direct team-vs-team search.
       *
       * OpenLigaDB provides an endpoint
       * for matches between two team IDs.
       * Since we do not know the IDs yet,
       * we first search each team.
       */

      const [
        homeTeams,
        awayTeams
      ] = await Promise.all([

        findTeams(home),

        findTeams(away)

      ]);


      /*
       * 2. Try to find the requested fixture
       * from team match histories.
       */

      let fixture =
        null;


      let homeTeam =
        selectBestTeam(
          homeTeams,
          home
        );


      let awayTeam =
        selectBestTeam(
          awayTeams,
          away
        );


      /*
       * 3. If both team IDs are available,
       * ask OpenLigaDB directly for
       * matches between them.
       */

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


      /*
       * 4. If direct search failed,
       * search recent/upcoming matches
       * for each team.
       */

      let homeMatches =
        homeTeam?.teamId
          ? await getTeamMatches(
              homeTeam.teamId
            )
          : [];


      let awayMatches =
        awayTeam?.teamId
          ? await getTeamMatches(
              awayTeam.teamId
            )
          : [];


      /*
       * 5. Try to locate the requested
       * fixture inside the team matches.
       */

      if (!fixture) {

        fixture =
          findFixtureInMatches(
            homeMatches,
            home,
            away
          );

      }


      if (!fixture) {

        fixture =
          findFixtureInMatches(
            awayMatches,
            home,
            away
          );

      }


      /*
       * 6. Remove the requested fixture
       * from historical samples.
       */

      homeMatches =
        homeMatches.filter(
          event =>
            !sameEvent(
              event,
              fixture
            )
        );


      awayMatches =
        awayMatches.filter(
          event =>
            !sameEvent(
              event,
              fixture
            )
        );


      /*
       * 7. Keep only valid finished
       * historical matches.
       */

      const homeRecent =
        homeMatches

          .filter(
            event =>
              isFinished(
                event
              )
          )

          .sort(
            (a, b) =>
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
          )

          .map(
            normalizeMatch
          );


      const awayRecent =
        awayMatches

          .filter(
            event =>
              isFinished(
                event
              )
          )

          .sort(
            (a, b) =>
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
          )

          .map(
            normalizeMatch
          );


      /*
       * 8. No useful data.
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
            "OpenLigaDB متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "openligadb",

            available:
              true,

            matchFound:
              false,

            teamsFound: {

              home:
                Boolean(
                  homeTeam
                ),

              away:
                Boolean(
                  awayTeam
                )

            },

            recentMatches: {

              home: [],
              away: []

            }

          }

        };

      }


      /*
       * 9. Partial data is still useful.
       */

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
   FIND TEAMS
========================================== */

async function findTeams(
  name
) {

  /*
   * OpenLigaDB's team search is
   * available through league/season
   * endpoints rather than a universal
   * global team-search endpoint.
   *
   * We therefore use a small list of
   * major competitions first.
   */

  const leagues = [

    {
      shortcut:
        "bl1",

      season:
        currentSeason()

    },

    {
      shortcut:
        "bl2",

      season:
        currentSeason()

    },

    {
      shortcut:
        "bl3",

      season:
        currentSeason()

    }

  ];


  const results = [];


  for (
    const league
    of leagues
  ) {

    try {

      const data =
        await fetchJSON(

          `${API}/getavailableteams/` +
          `${league.shortcut}/` +
          `${league.season}`

        );


      const teams =
        Array.isArray(
          data
        )
          ? data
          : [];


      for (
        const team
        of teams
      ) {

        if (
          namesMatch(
            normalizeName(
              team?.teamName
            ),

            normalizeName(
              name
            )
          )
        ) {

          results.push(
            team
          );

        }

      }

    } catch {

      /*
       * Continue with the next
       * competition.
       */

    }

  }


  return results;

}


/* ==========================================
   SELECT BEST TEAM
========================================== */

function selectBestTeam(
  teams,
  requestedName
) {

  if (
    !Array.isArray(
      teams
    ) ||
    teams.length === 0
  ) {

    return null;

  }


  const requested =
    normalizeName(
      requestedName
    );


  const exact =
    teams.find(
      team =>
        normalizeName(
          team?.teamName
        ) === requested
    );


  if (
    exact
  ) {

    return exact;

  }


  const partial =
    teams.find(
      team =>
        namesMatch(
          normalizeName(
            team?.teamName
          ),

          requested
        )
    );


  return (
    partial ||
    teams[0] ||
    null
  );

}


/* ==========================================
   DIRECT MATCH
========================================== */

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
            normalizeName(
              match?.team1?.teamName
            ),
            normalizeName(
              home
            )
          )

          &&

          namesMatch(
            normalizeName(
              match?.team2?.teamName
            ),
            normalizeName(
              away
            )
          )

      )

      ||

      matches.find(
        match =>

          namesMatch(
            normalizeName(
              match?.team1?.teamName
            ),
            normalizeName(
              away
            )
          )

          &&

          namesMatch(
            normalizeName(
              match?.team2?.teamName
            ),
            normalizeName(
              home
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
   TEAM MATCHES
========================================== */

async function getTeamMatches(
  teamId
) {

  try {

    /*
     * Search a reasonable window
     * around the current date.
     */

    const data =
      await fetchJSON(

        `${API}/getmatchesbyteamid/` +
        `${encodeURIComponent(
          teamId
        )}/` +
        `20/10`

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


/* ==========================================
   FIND FIXTURE IN MATCHES
========================================== */

function findFixtureInMatches(
  matches,
  home,
  away
) {

  if (
    !Array.isArray(
      matches
    )
  ) {

    return null;

  }


  return (

    matches.find(
      match =>

        namesMatch(
          normalizeName(
            match?.team1?.teamName
          ),

          normalizeName(
            home
          )

        )

        &&

        namesMatch(
          normalizeName(
            match?.team2?.teamName
          ),

          normalizeName(
            away
          )

        )

    )

    ||

    null

  );

}


/* ==========================================
   NORMALIZE MATCH
========================================== */

function normalizeMatch(
  match
) {

  const team1 =
    match?.team1 ||
    {};


  const team2 =
    match?.team2 ||
    {};


  const result =
    getFinalResult(
      match
    );


  const finished =
    isFinished(
      match
    );


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
      finished
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


/* ==========================================
   FINAL RESULT
========================================== */

function getFinalResult(
  match
) {

  const results =
    Array.isArray(
      match?.matchResults
    )
      ? match.matchResults
      : [];


  /*
   * Prefer the normal final result.
   */

  const final =
    results.find(
      item =>

        String(
          item?.resultName ||
          ""
        ).toLowerCase()

          .includes(
            "end"
          )

    )

    ||

    results.find(
      item =>

        String(
          item?.resultName ||
          ""
        ).toLowerCase()

          .includes(
            "final"
          )

    )

    ||

    results[results.length - 1];


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


/* ==========================================
   FINISHED
========================================== */

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


/* ==========================================
   SAME EVENT
========================================== */

function sameEvent(
  first,
  second
) {

  if (
    !first ||
    !second
  ) {

    return false;

  }


  return String(
    first?.matchID ||
    ""
  )

  ===

  String(
    second?.matchID ||
    ""
  );

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

        method:
          "GET",

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

      `OpenLigaDB HTTP ${response.status}`

    );

  }


  return data;

}


/* ==========================================
   SEASON
========================================== */

function currentSeason() {

  const now =
    new Date();


  /*
   * Bundesliga season normally
   * crosses two calendar years.
   */

  const year =
    now.getUTCFullYear();


  const month =
    now.getUTCMonth();


  return (
    month >= 7
      ? year
      : year - 1
  );

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
      /\b(fc|cf|afc|sc|ac|fk|club|1899|1900|1904|1905|1906|1907|1908|1909|1910|1911|1912|1913|1914|1919|1920|1921|1922|1923|1924|1925|1926|1927|1928|1929|1930|1931|1932|1933|1934|1935|1936|1937|1938|1939|1940|1941|1942|1943|1944|1945|1946|1947|1948|1949|1950|1951|1952|1953|1954|1955|1956|1957|1958|1959|1960|1961|1962|1963|1964|1965|1966|1967|1968|1969|1970|1971|1972|1973|1974|1975|1976|1977|1978|1979|1980|1981|1982|1983|1984|1985|1986|1987|1988|1989|1990|1991|1992|1993|1994|1995|1996|1997|1998|1999|2000)\b/g,
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


  const secondTokens =
    second
      .split(
        " "
      )
      .filter(
        token =>
          token.length >= 3
        );


  return secondTokens.some(
    token =>
      firstTokens.has(
        token
      )
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
   REGISTER
========================================== */

const provider =
  new OpenLigaDBProvider();


registerProvider(
  provider
);


export default provider;
