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

      // --------------------------------------
      // SEARCH TODAY + PREVIOUS DAY + NEXT 7
      // --------------------------------------

      let match = null;

      for (
        let offset = -1;
        offset <= 7;
        offset++
      ) {

        const date =
          new Date();

        date.setUTCDate(
          date.getUTCDate() +
          offset
        );


        const dateString =
          date
            .toISOString()
            .slice(0, 10);


        const url =
          `${API_BASE}/sport/football/scheduled-events/${dateString}`;


        const result =
          await fetchJSON(
            url
          );


        const events =
          Array.isArray(
            result?.events
          )
            ? result.events
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


      // --------------------------------------
      // MATCH NOT FOUND
      // --------------------------------------

      if (!match) {

        return {

          status:
            "api_ok_no_match",

          message:
            "تم الاتصال بـ SofaScore بنجاح، لكن المباراة المطلوبة لم يتم العثور عليها.",

          data: {

            source:
              "sofascore",

            available:
              true,

            matchFound:
              false,

            requested: {

              home:
                home,

              away:
                away

            }

          }

        };

      }


      // --------------------------------------
      // TEAM IDS
      // --------------------------------------

      const homeTeamId =
        Number(
          match?.homeTeam?.id
        );


      const awayTeamId =
        Number(
          match?.awayTeam?.id
        );


      // --------------------------------------
      // RECENT MATCHES
      // --------------------------------------

      const homeRecent =
        Number.isFinite(
          homeTeamId
        )
          ? await getRecentTeamMatches(
              homeTeamId
            )
          : [];


      const awayRecent =
        Number.isFinite(
          awayTeamId
        )
          ? await getRecentTeamMatches(
              awayTeamId
            )
          : [];


      // --------------------------------------
      // STANDARDIZED FIXTURE
      // --------------------------------------

      const fixture = {

        id:
          match.id ||
          null,

        utcDate:
          match.startTimestamp
            ? new Date(
                match.startTimestamp *
                1000
              ).toISOString()
            : null,

        status:
          match.status?.type ||
          match.status?.description ||
          null,

        competition:
          match.tournament?.name
            ? {
                name:
                  match.tournament.name
              }
            : null,

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

      };


      // --------------------------------------
      // SUCCESS
      // --------------------------------------

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

          fixture,

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

  let response;

  try {

    response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            "Accept":
              "application/json"

          },

          cf: {

            cacheTtl:
              0,

            cacheEverything:
              false

          }

        }
      );

  } catch (error) {

    throw new Error(
      `SofaScore connection failed: ${
        error?.message ||
        String(error)
      }`
    );

  }


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

    const apiMessage =
      data?.message ||
      data?.error ||
      text ||
      "Unknown SofaScore error";


    throw new Error(
      `SofaScore HTTP ${response.status}: ${apiMessage}`
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

  const requestedHome =
    normalizeName(
      home
    );


  const requestedAway =
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
          requestedHome
        )

        &&

        namesMatch(
          eventAway,
          requestedAway
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

      .filter(
        event =>
          event?.status?.type ===
          "finished" ||
          event?.status?.type ===
          "after_penalties"
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


          const homeGoals =
            Number(
              event?.homeScore?.current
            );


          const awayGoals =
            Number(
              event?.awayScore?.current
            );


          if (
            !Number.isFinite(
              homeGoals
            ) ||
            !Number.isFinite(
              awayGoals
            )
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
                  homeGoals,

                away:
                  awayGoals

              }

            }

          };

        }
      )

      .filter(
        Boolean
      );

  } catch {

    return [];

  }

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
// MATCH TEAM NAMES
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
