// ==========================================
// Y.C.B SOFASCORE PROVIDER
// FINAL VERSION
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE =
  "https://api.sofascore.com/api/v1";


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

      // ------------------------------------
      // SEARCH TODAY + NEXT 7 DAYS
      // ------------------------------------

      let match = null;

      for (
        let offset = 0;
        offset <= 7;
        offset++
      ) {

        const date =
          new Date();

        date.setUTCDate(
          date.getUTCDate() + offset
        );

        const dateString =
          date
            .toISOString()
            .slice(0, 10);


        const url =
          `${API_BASE}/sport/football/scheduled-events/${dateString}`;


        const data =
          await fetchJSON(
            url
          );


        const events =
          Array.isArray(
            data?.events
          )
            ? data.events
            : [];


        match =
          findMatch(
            events,
            home,
            away
          );


        if (match) {

          break;

        }

      }


      // ------------------------------------
      // MATCH NOT FOUND
      // ------------------------------------

      if (!match) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل بنجاح، لكن المباراة المطلوبة غير موجودة خلال الأيام السبعة القادمة.",

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


      // ------------------------------------
      // TEAM IDS
      // ------------------------------------

      const homeTeamId =
        Number(
          match?.homeTeam?.id || 0
        );


      const awayTeamId =
        Number(
          match?.awayTeam?.id || 0
        );


      // ------------------------------------
      // RECENT MATCHES
      // ------------------------------------

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


      // ------------------------------------
      // CONVERT TO Y.C.B FORMAT
      // ------------------------------------

      const homeMatches =
        convertRecentMatches(
          homeRecent
        );


      const awayMatches =
        convertRecentMatches(
          awayRecent
        );


      // ------------------------------------
      // RESULT
      // ------------------------------------

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

          fixture: {

            id:
              match.id || null,

            utcDate:
              match.startTimestamp
                ? new Date(
                    match.startTimestamp * 1000
                  ).toISOString()
                : null,

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
              homeMatches,

            away:
              awayMatches

          }

        }

      };

    } catch (error) {

      return {

        status:
          "network_error",

        message:
          `SofaScore: ${error?.message || String(error)}`,

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
            "YCB-Football-Prediction-Engine/2.0"

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


  if (!response.ok) {

    throw new Error(

      `HTTP ${response.status}` +

      (
        data?.message
          ? `: ${data.message}`
          : ""
      )

    );

  }


  if (!data) {

    throw new Error(
      "استجابة JSON فارغة أو غير صالحة."
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
    normalizeName(
      home
    );


  const awayName =
    normalizeName(
      away
    );


  if (
    !homeName ||
    !awayName
  ) {

    return null;

  }


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
  ) || null;

}


// ==========================================
// RECENT TEAM MATCHES
// ==========================================

async function getRecentTeamMatches(
  teamId
) {

  try {

    const url =
      `${API_BASE}/team/${teamId}/events/last/0`;


    const data =
      await fetchJSON(
        url
      );


    const events =
      Array.isArray(
        data?.events
      )
        ? data.events
        : [];


    return events
      .filter(
        event =>
          event?.status?.type ===
            "finished" ||
          event?.status?.type ===
            "ended"
      )
      .slice(
        0,
        10
      )
      .map(
        event => {

          const isHome =
            Number(
              event?.homeTeam?.id
            ) ===
            Number(teamId);


          const homeScore =
            Number(
              event?.homeScore?.current
            );


          const awayScore =
            Number(
              event?.awayScore?.current
            );


          const goalsFor =
            isHome
              ? homeScore
              : awayScore;


          const goalsAgainst =
            isHome
              ? awayScore
              : homeScore;


          return {

            id:
              event?.id ||
              null,

            utcDate:
              event?.startTimestamp
                ? new Date(
                    event.startTimestamp * 1000
                  ).toISOString()
                : null,

            homeTeam: {

              name:
                event?.homeTeam?.name ||
                null

            },

            awayTeam: {

              name:
                event?.awayTeam?.name ||
                null

            },

            score: {

              fullTime: {

                home:
                  Number.isFinite(
                    homeScore
                  )
                    ? homeScore
                    : 0,

                away:
                  Number.isFinite(
                    awayScore
                  )
                    ? awayScore
                    : 0

              }

            },

            opponent:
              isHome
                ? event?.awayTeam?.name ||
                  null
                : event?.homeTeam?.name ||
                  null,

            isHome,

            result:
              getResult(
                goalsFor,
                goalsAgainst
              ),

            goalsFor,

            goalsAgainst

          };

        }
      );

  } catch {

    return [];

  }

}


// ==========================================
// CONVERT MATCHES
// ==========================================

function convertRecentMatches(
  matches
) {

  if (
    !Array.isArray(matches)
  ) {

    return [];

  }


  return matches
    .filter(
      match =>
        match &&
        match.score &&
        match.homeTeam &&
        match.awayTeam
    )
    .slice(
      0,
      10
    );

}


// ==========================================
// RESULT
// ==========================================

function getResult(
  goalsFor,
  goalsAgainst
) {

  if (
    goalsFor >
    goalsAgainst
  ) {

    return "W";

  }


  if (
    goalsFor <
    goalsAgainst
  ) {

    return "L";

  }


  return "D";

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(
  value
) {

  return String(
    value || ""
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
      /\b(fc|cf|afc|sc|ac|fk|club)\b/gi,
      " "
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
// TEAM NAME MATCH
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


  // Exact
  if (
    first === second
  ) {

    return true;

  }


  // One contains the other
  if (
    first.includes(second) ||
    second.includes(first)
  ) {

    return true;

  }


  // Token comparison
  const firstTokens =
    first
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  const secondTokens =
    second
      .split(" ")
      .filter(
        token =>
          token.length >= 3
      );


  if (
    !firstTokens.length ||
    !secondTokens.length
  ) {

    return false;

  }


  const common =
    secondTokens.filter(
      token =>
        firstTokens.includes(
          token
        )
    );


  // Require at least one meaningful
  // common token
  return (
    common.length >= 1
  );

}


// ==========================================
// REGISTER PROVIDER
// ==========================================

const sofaScoreProvider =
  new SofaScoreProvider();


registerProvider(
  sofaScoreProvider
);


export default sofaScoreProvider;
