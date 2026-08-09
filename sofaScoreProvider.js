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

      let match =
        null;


      // ====================================
      // TODAY
      // ====================================

      const today =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );


      const todayData =
        await fetchJSON(
          `${API_BASE}/sport/football/scheduled-events/${today}`
        );


      match =
        findMatch(
          todayData?.events,
          home,
          away
        );


      // ====================================
      // FUTURE DAYS
      // ====================================

      if (!match) {

        for (
          let day = 1;
          day <= 14;
          day++
        ) {

          const date =
            new Date();


          date.setUTCDate(
            date.getUTCDate() +
            day
          );


          const dateString =
            date
              .toISOString()
              .slice(
                0,
                10
              );


          const result =
            await fetchJSON(
              `${API_BASE}/sport/football/scheduled-events/${dateString}`
            );


          match =
            findMatch(
              result?.events,
              home,
              away
            );


          if (match) {

            break;

          }

        }

      }


      // ====================================
      // NOT FOUND
      // ====================================

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
      // TEAM IDS
      // ====================================

      const homeTeamId =
        match.homeTeam?.id;


      const awayTeamId =
        match.awayTeam?.id;


      // ====================================
      // RECENT MATCHES
      // ====================================

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


      // ====================================
      // RETURN NORMALIZED DATA
      // ====================================

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

          fixture:
            normalizeFixture(
              match
            ),

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

  if (
    !Array.isArray(events)
  ) {

    return null;

  }


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
  ) || null;

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
          "finished"
      )

      .slice(
        0,
        10
      )

      .map(
        event => {

          const isHome =
            event.homeTeam?.id ===
            teamId;


          const homeGoals =
            Number(
              event.homeScore?.current ??
              0
            );


          const awayGoals =
            Number(
              event.awayScore?.current ??
              0
            );


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

            status:
              "FINISHED",

            homeTeam: {

              id:
                event.homeTeam?.id ||
                null,

              name:
                event.homeTeam?.name ||
                null,

              shortName:
                event.homeTeam?.shortName ||
                null

            },

            awayTeam: {

              id:
                event.awayTeam?.id ||
                null,

              name:
                event.awayTeam?.name ||
                null,

              shortName:
                event.awayTeam?.shortName ||
                null

            },

            score: {

              fullTime: {

                home:
                  homeGoals,

                away:
                  awayGoals

              }

            },

            perspective: {

              isHome,

              goalsFor:
                isHome
                  ? homeGoals
                  : awayGoals,

              goalsAgainst:
                isHome
                  ? awayGoals
                  : homeGoals

            }

          };

        }
      );

  } catch {

    return [];

  }

}


// ==========================================
// NORMALIZE FIXTURE
// ==========================================

function normalizeFixture(
  event
) {

  return {

    id:
      event?.id ||
      null,

    utcDate:
      event?.startTimestamp
        ? new Date(
            event.startTimestamp *
            1000
          ).toISOString()
        : null,

    status:
      event?.status?.type ||
      null,

    competition:
      event?.tournament?.name ||
      null,

    homeTeam: {

      id:
        event?.homeTeam?.id ||
        null,

      name:
        event?.homeTeam?.name ||
        null,

      shortName:
        event?.homeTeam?.shortName ||
        null

    },

    awayTeam: {

      id:
        event?.awayTeam?.id ||
        null,

      name:
        event?.awayTeam?.name ||
        null,

      shortName:
        event?.awayTeam?.shortName ||
        null

    }

  };

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
// NAME MATCH
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
