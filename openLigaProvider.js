// Y.C.B OPENLIGADB PROVIDER 2.3.0
// Safe provider
// Browser-safe execution


import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://api.openligadb.de";


const REQUEST_TIMEOUT =
  15000;


/* ==========================================
   PROVIDER
========================================== */

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

      const [
        homeTeams,
        awayTeams
      ] = await Promise.all([

        findTeams(
          home
        ),

        findTeams(
          away
        )

      ]);


      const homeTeam =
        selectBestTeam(
          homeTeams,
          home
        );


      const awayTeam =
        selectBestTeam(
          awayTeams,
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


      if (
        !fixture
      ) {

        fixture =
          findFixtureInMatches(
            homeMatches,
            home,
            away
          );

      }


      if (
        !fixture
      ) {

        fixture =
          findFixtureInMatches(
            awayMatches,
            home,
            away
          );

      }


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
              getMatchTimestamp(
                b
              ) -
              getMatchTimestamp(
                a
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
              getMatchTimestamp(
                b
              ) -
              getMatchTimestamp(
                a
              )
          )

          .slice(
            0,
            15
          )

          .map(
            normalizeMatch
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

      const classified =
        classifyError(
          error
        );


      return {

        status:
          classified.status,

        message:
          classified.message,

        data: {

          source:
            "openligadb",

          available:
            false,

          matchFound:
            false,

          error:
            error?.message ||
            String(
              error
            )

        }

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


  const results =
    [];


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

          if (
            !results.some(
              item =>
                String(
                  item?.teamId
                ) ===
                String(
                  team?.teamId
                )
            )
          ) {

            results.push(
              team
            );

          }

        }

      }

    } catch {

      /*
       * Continue.
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
        ) ===
        requested
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


/* ==========================================
   FIND FIXTURE
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


  const final =
    results.find(
      item => {

        const name =
          String(
            item?.resultName ||
            ""
          ).toLowerCase();


        return (
          name.includes(
            "end"
          ) ||

          name.includes(
            "final"
          )

        );

      }
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
   TIMESTAMP
========================================== */

function getMatchTimestamp(
  match
) {

  const date =
    match?.matchDateTimeUTC ||
    match?.matchDateTime ||
    null;


  if (
    !date
  ) {

    return 0;

  }


  const timestamp =
    Date.parse(
      date
    );


  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;

}


/* ==========================================
   FETCH JSON
========================================== */

async function fetchJSON(
  url
) {

  const controller =
    typeof AbortController !==
    "undefined"

      ? new AbortController()

      : null;


  let timeoutId =
    null;


  if (
    controller
  ) {

    timeoutId =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT
      );

  }


  try {

    const response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            "Accept":
              "application/json"

          },

          signal:
            controller?.signal

        }
      );


    const text =
      await response.text();


    const data =
      safeJsonParse(
        text
      );


    if (
      !response.ok
    ) {

      const error =
        new Error(
          `OpenLigaDB HTTP ${response.status}`
        );


      error.httpStatus =
        response.status;


      throw error;

    }


    return data;

  } finally {

    if (
      timeoutId !== null
    ) {

      clearTimeout(
        timeoutId
      );

    }

  }

}


/* ==========================================
   SAFE JSON
========================================== */

function safeJsonParse(
  text
) {

  if (
    !text
  ) {

    return null;

  }


  try {

    return JSON.parse(
      text
    );

  } catch {

    return null;

  }

}


/* ==========================================
   ERROR
========================================== */

function classifyError(
  error
) {

  const status =
    Number(
      error?.httpStatus
    );


  if (
    status === 401 ||
    status === 403
  ) {

    return {

      status:
        "access_blocked",

      message:
        `OpenLigaDB رفض الوصول (HTTP ${status}).`

    };

  }


  if (
    status === 429
  ) {

    return {

      status:
        "rate_limited",

      message:
        "OpenLigaDB وصل إلى حد الطلبات."

    };

  }


  if (
    error?.name ===
      "AbortError"
  ) {

    return {

      status:
        "timeout",

      message:
        "OpenLigaDB لم يستجب خلال المهلة المحددة."

    };

  }


  const message =
    String(
      error?.message ||
      error ||
      ""
    );


  if (
    message
      .toLowerCase()
      .includes(
        "failed to fetch"
      )
  ) {

    return {

      status:
        "access_blocked",

      message:
        "OpenLigaDB لم يسمح للمتصفح بالوصول إلى المصدر أو حدث حجب CORS."

    };

  }


  return {

    status:
      "network_error",

    message:
      message ||
      "OpenLigaDB request failed."

  };

}


/* ==========================================
   SEASON
========================================== */

function currentSeason() {

  const now =
    new Date();


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
      /[-_./]/g,
      " "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|women|woman|f)\b/g,
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


  const firstTokens =
    new Set(
      a
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  const secondTokens =
    b
      .split(" ")
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


/* ==========================================
   REGISTER
========================================== */

const provider =
  new OpenLigaDBProvider();


registerProvider(
  provider
);


export default provider;
