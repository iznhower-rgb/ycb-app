// ==========================================
// Y.C.B ESPN PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";


// أهم الدوريات التي يدعمها ESPN
const LEAGUES = [

  "eng.1",
  "eng.2",
  "eng.3",
  "eng.4",

  "esp.1",
  "esp.2",

  "ita.1",
  "ita.2",

  "ger.1",
  "ger.2",

  "fra.1",
  "fra.2",

  "ned.1",

  "por.1",

  "bel.1",

  "tur.1",

  "sco.1",

  "usa.1",

  "mex.1",

  "bra.1",
  "bra.2",

  "arg.1",

  "col.1",

  "chi.1",

  "rsa.1",

  "ksa.1",

  "jpn.1",

  "aus.1",

  "uefa.champions",

  "uefa.europa",

  "uefa.europa.conf"

];


// ==========================================
// PROVIDER
// ==========================================

class ESPNProvider
  extends DataProvider {

  constructor() {

    super(
      "ESPN"
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

      const requestedHome =
        normalizeName(home);

      const requestedAway =
        normalizeName(away);


      if (
        !requestedHome ||
        !requestedAway
      ) {

        return {

          status:
            "invalid_request",

          message:
            "أسماء الفرق غير صالحة.",

          data:
            null

        };

      }


      // ====================================
      // FIND TEAMS + LEAGUE
      // ====================================

      let foundHome =
        null;

      let foundAway =
        null;

      let foundLeague =
        null;


      for (
        const league
        of LEAGUES
      ) {

        const data =
          await fetchJSON(
            `${API_BASE}/${league}/teams`
          );


        const teams =
          extractTeams(data);


        const homeTeam =
          findTeam(
            teams,
            requestedHome
          );


        const awayTeam =
          findTeam(
            teams,
            requestedAway
          );


        if (
          homeTeam &&
          awayTeam
        ) {

          foundHome =
            homeTeam;

          foundAway =
            awayTeam;

          foundLeague =
            league;

          break;

        }

      }


      // ====================================
      // TEAMS NOT FOUND
      // ====================================

      if (
        !foundHome ||
        !foundAway ||
        !foundLeague
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "تم الاتصال بـ ESPN لكن لم يتم العثور على الفريقين داخل الدوريات المدعومة.",

          data: {

            source:
              "ESPN",

            available:
              true,

            matchFound:
              false

          }

        };

      }


      // ====================================
      // TEAM SCHEDULES
      // ====================================

      const schedules =
        await Promise.all([

          fetchTeamSchedule(
            foundLeague,
            foundHome.id
          ),

          fetchTeamSchedule(
            foundLeague,
            foundAway.id
          )

        ]);


      const homeSchedule =
        schedules[0];

      const awaySchedule =
        schedules[1];


      // ====================================
      // FIND REQUESTED FIXTURE
      // ====================================

      const fixtureEvent =
        findFixture(
          homeSchedule,
          foundHome.id,
          foundAway.id
        );


      // بعض المباريات قد تظهر في جدول الفريق
      // الآخر فقط، لذلك نجرب الجدول الثاني أيضًا.

      const fixtureEvent2 =
        fixtureEvent ||
        findFixture(
          awaySchedule,
          foundHome.id,
          foundAway.id
        );


      // ====================================
      // RECENT MATCHES
      // ====================================

      const recentHome =
        normalizeRecentMatches(
          homeSchedule,
          foundHome.id
        );


      const recentAway =
        normalizeRecentMatches(
          awaySchedule,
          foundAway.id
        );


      // ====================================
      // NO FIXTURE
      // ====================================

      if (!fixtureEvent2) {

        return {

          status:
            "api_ok_no_match",

          message:
            "تم العثور على الفريقين وبياناتهما عبر ESPN، لكن المباراة المطلوبة غير موجودة في الجدول الحالي.",

          data: {

            source:
              "ESPN",

            available:
              true,

            matchFound:
              false,

            league:
              foundLeague,

            teams: {

              home:
                teamInfo(foundHome),

              away:
                teamInfo(foundAway)

            },

            recentMatches: {

              home:
                recentHome,

              away:
                recentAway

            }

          }

        };

      }


      // ====================================
      // NORMALIZE FIXTURE
      // ====================================

      const fixture =
        normalizeEvent(
          fixtureEvent2
        );


      // ====================================
      // SUCCESS
      // ====================================

      return {

        status:
          "success",

        message:
          "تم العثور على المباراة وبيانات الفريقين عبر ESPN.",

        data: {

          source:
            "ESPN",

          available:
            true,

          matchFound:
            true,

          league:
            foundLeague,

          fixture,

          recentMatches: {

            home:
              recentHome,

            away:
              recentAway

          }

        }

      };

    } catch (error) {

      return {

        status:
          "provider_error",

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
            "YCB-Football-Prediction-Engine/2.1"

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

    throw new Error(
      `ESPN returned invalid JSON (HTTP ${response.status})`
    );

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `ESPN HTTP ${response.status}`
    );

  }


  return data;

}


// ==========================================
// EXTRACT TEAMS
// ==========================================

function extractTeams(
  data
) {

  const leagues =
    Array.isArray(
      data?.sports?.[0]?.leagues
    )
      ? data.sports[0].leagues
      : [];


  const teams =
    [];


  for (
    const league
    of leagues
  ) {

    const leagueTeams =
      Array.isArray(
        league?.teams
      )
        ? league.teams
        : [];


    for (
      const item
      of leagueTeams
    ) {

      if (
        item?.team
      ) {

        teams.push(
          item.team
        );

      }

    }

  }


  return teams;

}


// ==========================================
// FIND TEAM
// ==========================================

function findTeam(
  teams,
  requested
) {

  if (
    !Array.isArray(teams)
  ) {

    return null;

  }


  // Exact match
  const exact =
    teams.find(
      team => {

        const names = [

          team?.displayName,

          team?.name,

          team?.shortDisplayName,

          team?.location,

          team?.abbreviation

        ]

          .map(normalizeName)
          .filter(Boolean);


        return names.includes(
          requested
        );

      }
    );


  if (exact) {

    return exact;

  }


  // Partial / token match
  return (
    teams.find(
      team => {

        const names = [

          team?.displayName,

          team?.name,

          team?.shortDisplayName,

          team?.location

        ]

          .map(normalizeName)
          .filter(Boolean);


        return names.some(
          name =>
            name.includes(requested) ||
            requested.includes(name)
        );

      }
    ) ||
    null
  );

}


// ==========================================
// FETCH TEAM SCHEDULE
// ==========================================

async function fetchTeamSchedule(
  league,
  teamId
) {

  try {

    const data =
      await fetchJSON(
        `${API_BASE}/${league}/teams/${teamId}/schedule`
      );


    return Array.isArray(
      data?.events
    )
      ? data.events
      : [];

  } catch {

    return [];

  }

}


// ==========================================
// FIND FIXTURE
// ==========================================

function findFixture(
  events,
  homeId,
  awayId
) {

  if (
    !Array.isArray(events)
  ) {

    return null;

  }


  return events.find(
    event => {

      const competitors =
        event?.competitions?.[0]?.competitors;


      if (
        !Array.isArray(
          competitors
        )
      ) {

        return false;

      }


      const home =
        competitors.find(
          item =>
            item?.homeAway ===
            "home"
        );


      const away =
        competitors.find(
          item =>
            item?.homeAway ===
            "away"
        );


      return (

        String(
          home?.team?.id ||
          home?.id ||
          ""
        ) ===
        String(homeId)

        &&

        String(
          away?.team?.id ||
          away?.id ||
          ""
        ) ===
        String(awayId)

      );

    }
  ) || null;

}


// ==========================================
// NORMALIZE RECENT MATCHES
// ==========================================

function normalizeRecentMatches(
  events,
  teamId
) {

  if (
    !Array.isArray(events)
  ) {

    return [];

  }


  return events

    .map(
      normalizeEvent
    )

    .filter(
      event => {

        if (
          !event
        ) {

          return false;

        }


        const homeId =
          String(
            event.homeTeam?.id ||
            ""
          );


        const awayId =
          String(
            event.awayTeam?.id ||
            ""
          );


        return (

          homeId ===
            String(teamId)

          ||

          awayId ===
            String(teamId)

        );

      }
    )

    .sort(
      (
        a,
        b
      ) =>

        new Date(
          b.utcDate ||
          0
        ) -

        new Date(
          a.utcDate ||
          0
        )

    )

    .slice(
      0,
      15
    );

}


// ==========================================
// NORMALIZE EVENT
// ==========================================

function normalizeEvent(
  event
) {

  if (
    !event
  ) {

    return null;

  }


  const competition =
    event?.competitions?.[0] ||
    {};


  const competitors =
    Array.isArray(
      competition?.competitors
    )
      ? competition.competitors
      : [];


  const home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    );


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    );


  if (
    !home ||
    !away
  ) {

    return null;

  }


  const homeScore =
    numericScore(
      home?.score
    );


  const awayScore =
    numericScore(
      away?.score
    );


  return {

    id:
      event?.id ||
      competition?.id ||
      null,

    utcDate:
      event?.date ||
      competition?.date ||
      null,

    status:
      competition?.status ||
      event?.status ||
      null,

    homeTeam: {

      id:
        home?.team?.id ||
        home?.id ||
        null,

      name:
        home?.team?.displayName ||
        home?.team?.name ||
        null,

      shortName:
        home?.team?.shortDisplayName ||
        home?.team?.abbreviation ||
        null

    },

    awayTeam: {

      id:
        away?.team?.id ||
        away?.id ||
        null,

      name:
        away?.team?.displayName ||
        away?.team?.name ||
        null,

      shortName:
        away?.team?.shortDisplayName ||
        away?.team?.abbreviation ||
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

    competition: {

      name:
        event?.season?.slug ||
        null

    }

  };

}


// ==========================================
// NUMERIC SCORE
// ==========================================

function numericScore(
  value
) {

  if (
    value ===
    null ||
    value ===
    undefined ||
    value ===
    ""
  ) {

    return undefined;

  }


  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number
    : undefined;

}


// ==========================================
// TEAM INFO
// ==========================================

function teamInfo(
  team
) {

  return {

    id:
      team?.id ||
      null,

    name:
      team?.displayName ||
      team?.name ||
      null,

    shortName:
      team?.shortDisplayName ||
      team?.abbreviation ||
      null

  };

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
// REGISTER
// ==========================================

const espnProvider =
  new ESPNProvider();


registerProvider(
  espnProvider
);


export default espnProvider;
