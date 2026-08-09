// ==========================================
// Y.C.B SOFASCORE PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


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

      let match =
        null;


      for (
        let offset = 0;
        offset <= 7 &&
        !match;
        offset++
      ) {

        const date =
          new Date();


        date.setUTCDate(
          date.getUTCDate() +
          offset
        );


        const day =
          date
            .toISOString()
            .slice(
              0,
              10
            );


        const data =
          await fetchJSON(

            `${API_BASE}/sport/football/scheduled-events/${day}`

          );


        match =
          findMatch(
            data?.events ||
            [],
            home,
            away
          );

      }


      if (!match) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن المباراة غير موجودة خلال الأيام السبعة القادمة.",

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


      const homeId =
        match.homeTeam?.id;


      const awayId =
        match.awayTeam?.id;


      const [
        homeRecent,
        awayRecent
      ] =
        await Promise.all([

          getRecent(
            homeId
          ),

          getRecent(
            awayId
          )

        ]);


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
              match.id ||
              null,

            startTimestamp:
              match.startTimestamp ||
              null,

            status:
              match.status?.type ||
              match.status ||
              null,

            tournament:
              match.tournament?.name ||
              null,

            homeTeam: {

              id:
                homeId ||
                null,

              name:
                match.homeTeam?.name ||
                null

            },

            awayTeam: {

              id:
                awayId ||
                null,

              name:
                match.awayTeam?.name ||
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
    normalizeName(
      home
    );


  const awayName =
    normalizeName(
      away
    );


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

async function getRecent(
  teamId
) {

  if (!teamId) {

    return [];

  }


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

      .map(
        event => {

          const isHome =
            event.homeTeam?.id ===
            teamId;


          const gf =
            Number(

              (
                isHome
                  ? event.homeScore
                  : event.awayScore
              )?.current

            );


          const ga =
            Number(

              (
                isHome
                  ? event.awayScore
                  : event.homeScore
              )?.current

            );


          if (
            !Number.isFinite(gf) ||
            !Number.isFinite(ga)
          ) {

            return null;

          }


          return {

            id:
              event.id ||
              null,

            utcDate:
              event.startTimestamp
                ? new Date(
                    event.startTimestamp *
                    1000
                  ).toISOString()
                : null,

            homeTeam: {

              name:
                event.homeTeam?.name ||
                null

            },

            awayTeam: {

              name:
                event.awayTeam?.name ||
                null

            },

            score: {

              fullTime: {

                home:
                  isHome
                    ? gf
                    : ga,

                away:
                  isHome
                    ? ga
                    : gf

              }

            }

          };

        }
      )

      .filter(
        Boolean
      )

      .slice(
        0,
        10
      );

  } catch {

    return [];

  }

}


// ==========================================
// NORMALIZE NAME
// ==========================================

function normalizeName(
  value
) {

  return String(
    value || ""
  )

    .toLowerCase()

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
    first === second ||
    first.includes(second) ||
    second.includes(first)
  ) {

    return true;

  }


  const tokens =
    new Set(
      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );


  return second
    .split(" ")
    .some(
      token =>
        token.length >= 3 &&
        tokens.has(
          token
        )
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
