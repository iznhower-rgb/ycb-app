// ==========================================
// Y.C.B SOFASCORE PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE =
  "https://www.sofascore.com/api/v1";


// ==========================================
// PROVIDER
// ==========================================

class SofaScoreProvider
  extends DataProvider {

  constructor() {

    super(
      "SofaScore"
    );

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(
    home,
    away
  ) {

    try {

      const events =
        await fetchJSON(
          `${API_BASE}/sport/football/scheduled-events/0`
        );


      const todayMatches =
        Array.isArray(
          events?.events
        )
          ? events.events
          : [];


      let match =
        findMatch(
          todayMatches,
          home,
          away
        );


      if (!match) {

        for (
          let day = 1;
          day <= 7;
          day++
        ) {

          const date =
            new Date();


          date.setUTCDate(
            date.getUTCDate() + day
          );


          const dateString =
            date
              .toISOString()
              .slice(0, 10);


          const result =
            await fetchJSON(
              `${API_BASE}/sport/football/scheduled-events/${dateString}`
            );


          const dayEvents =
            Array.isArray(
              result?.events
            )
              ? result.events
              : [];


          match =
            findMatch(
              dayEvents,
              home,
              away
            );


          if (match) {

            break;

          }

        }

      }


      if (!match) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن المباراة المطلوبة لم يتم العثور عليها.",

          data: {

            source:
              "sofascore",

            available:
              true,

            matchFound:
              false

          }

        };

      }


      // ====================================
      // GET TEAM RECENT MATCHES
      // ====================================

      const homeTeamId =
        match.homeTeam?.id;


      const awayTeamId =
        match.awayTeam?.id;


      const homeRecent =
        homeTeamId
          ? await getRecentTeamMatches(
              homeTeamId
            )
          : [];


      const awayRecent =
        awayTeamId
          ? await getRecentTeamMatches(
              awayTeamId
            )
          : [];


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبيانات الفريقين عبر SofaScore.",

        data: {

          source:
            "sofascore",

          available:
            true,

          matchFound:
            true,

          match: {

            id:
              match.id || null,

            startTimestamp:
              match.startTimestamp || null,

            status:
              match.status || null,

            tournament:
              match.tournament?.name ||
              null,

            homeTeam: {

              id:
                match.homeTeam?.id ||
                null,

              name:
                match.homeTeam?.name ||
                null,

              shortName:
                match.homeTeam?.shortName ||
                null

            },

            awayTeam: {

              id:
                match.awayTeam?.id ||
                null,

              name:
                match.awayTeam?.name ||
                null,

              shortName:
                match.awayTeam?.shortName ||
                null

            }

          },

          recentMatches: {

            home:
              homeRecent,

            away:
              awayRecent

          }

        }

      };

    } catch (error) {

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


// ==========================================
// FETCH JSON
// ==========================================

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

          "Accept":
            "application/json",

          "User-Agent":
            "YCB-Football-Prediction-Engine"

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
        ? JSON.parse(text)
        : null;

  } catch {

    data =
      null;

  }


  if (!response.ok) {

    throw new Error(
      `SofaScore HTTP ${response.status}`
    );

  }


  return data;

}


// ==========================================
// FIND MATCH
// ==========================================

function findMatch(
  events,
  home,
  away
) {

  const homeName =
    normalizeName(home);


  const awayName =
    normalizeName(away);


  return events.find(
    event => {

      const eventHome =
        normalizeName(
          event?.homeTeam?.name ||
          event?.homeTeam?.shortName
        );


      const eventAway =
        normalizeName(
          event?.awayTeam?.name ||
          event?.awayTeam?.shortName
        );


      return (

        namesMatch(
          eventHome,
          homeName
        )

        &&

        namesMatch(
          eventAway,
          awayName
        )

      );

    }
  );

}


// ==========================================
// RECENT MATCHES
// ==========================================

async function getRecentTeamMatches(
  teamId
) {

  try {

    const data =
      await fetchJSON(
        `${API_BASE}/team/${teamId}/events/last/0`
      );


    const events =
      Array.isArray(
        data?.events
      )
        ? data.events
        : [];


    return events
      .slice(0, 10)
      .map(
        event => {

          const isHome =
            event.homeTeam?.id ===
            teamId;


          const opponent =
            isHome
              ? event.awayTeam?.name
              : event.homeTeam?.name;


          const score =
            isHome
              ? event.homeScore
              : event.awayScore;


          const opponentScore =
            isHome
              ? event.awayScore
              : event.homeScore;


          return {

            id:
              event.id || null,

            timestamp:
              event.startTimestamp ||
              null,

            opponent:
              opponent ||
              null,

            isHome:
              isHome,

            result:
              getResult(
                score?.current,
                opponentScore?.current
              ),

            goalsFor:
              Number(
                score?.current ?? 0
              ),

            goalsAgainst:
              Number(
                opponentScore?.current ?? 0
              )

          };

        }
      );

  } catch {

    return [];

  }

}


// ==========================================
// RESULT
// ==========================================

function getResult(
  goalsFor,
  goalsAgainst
) {

  if (
    goalsFor > goalsAgainst
  ) {

    return "W";

  }


  if (
    goalsFor < goalsAgainst
  ) {

    return "L";

  }


  return "D";

}


// ==========================================
// NORMALIZE
// ==========================================

function normalizeName(
  value
) {

  return String(
    value || ""
  )

    .toLowerCase()

    .trim()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /&/g,
      " and "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club)\b/gi,
      ""
    )

    .replace(
      /[^a-z0-9\s]/gi,
      " "
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ==========================================
// MATCH NAMES
// ==========================================

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
    first === second
  ) {

    return true;

  }


  if (
    first.includes(second) ||
    second.includes(first)
  ) {

    return true;

  }


  const firstTokens =
    first.split(" ");


  const secondTokens =
    second.split(" ");


  const common =
    secondTokens.filter(
      token =>
        token.length >= 3 &&
        firstTokens.includes(
          token
        )
    );


  return (
    common.length >= 1
  );

}


// ==========================================
// REGISTER
// ==========================================

const sofaScoreProvider =
  new SofaScoreProvider();


registerProvider(
  sofaScoreProvider
);


export default sofaScoreProvider;
