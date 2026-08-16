// ==========================================================
// Y.C.B ESPN PROVIDER 3.2.0
// ==========================================================
// ESPN provider
//
// الوظائف:
// 1) اكتشاف الفريق من عدة دوريات
// 2) استخدام Web API الحديث لمسار team schedule
// 3) استخدام Site API كـ fallback
// 4) البحث عن المباراة القادمة/المجدولة
// 5) جمع آخر المباريات المكتملة
// 6) البحث عبر scoreboard عند فشل schedule
// 7) عدم إسقاط الـ Worker إذا فشل أحد طلبات ESPN
//
// لا يحتاج API Key.
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================================
// API BASES
// ==========================================================

const SITE_API =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const WEB_API =
  "https://site.web.api.espn.com/apis/site/v2/sports/soccer";


// ==========================================================
// SETTINGS
// ==========================================================

const PROVIDER_VERSION =
  "3.2.0";

const HISTORY_LIMIT =
  15;

const REQUEST_TIMEOUT_MS =
  12000;

const FUTURE_DAYS =
  120;

const PAST_DAYS =
  365;

const SCOREBOARD_FUTURE_DAYS =
  120;

const SCOREBOARD_PAST_DAYS =
  120;


// ==========================================================
// ESPN SOCCER LEAGUES
// ==========================================================
//
// إذا كان الدوري غير مدعوم من ESPN فسيفشل الطلب فقط
// ويتم تجاهله بدون إسقاط باقي المصادر.
//
// أضفنا دوريات أكثر من النسخة القديمة حتى لا يكون
// البحث محصورًا في إنجلترا/إسبانيا/إيطاليا فقط.
// ==========================================================

const LEAGUES = [

  // England
  "eng.1",
  "eng.2",
  "eng.3",
  "eng.4",

  // Spain
  "esp.1",
  "esp.2",

  // Germany
  "ger.1",
  "ger.2",

  // Italy
  "ita.1",
  "ita.2",

  // France
  "fra.1",
  "fra.2",

  // Netherlands
  "ned.1",

  // Portugal
  "por.1",

  // Belgium
  "bel.1",

  // Turkey
  "tur.1",

  // Scotland
  "sco.1",

  // Greece
  "gre.1",

  // Austria
  "aut.1",

  // Switzerland
  "sui.1",

  // Denmark
  "den.1",

  // Norway
  "nor.1",

  // Sweden
  "swe.1",

  // Finland
  "fin.1",

  // Poland
  "pol.1",

  // Czech Republic
  "cze.1",

  // Croatia
  "cro.1",

  // Serbia
  "srb.1",

  // Romania
  "rou.1",

  // Hungary
  "hun.1",

  // Slovakia
  "svk.1",

  // Ukraine
  "ukr.1",

  // Bulgaria
  "bul.1",

  // Slovenia
  "slo.1",

  // Ireland
  "irl.1",

  // Israel
  "isr.1",

  // Saudi Arabia
  "sau.1",

  // United States
  "usa.1",

  // Mexico
  "mex.1",

  // Brazil
  "bra.1",

  // Argentina
  "arg.1",

  // International
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
  "uefa.wchampions",
  "fifa.world"

];


// ==========================================================
// MEMORY CACHE
// ==========================================================

const TEAM_CACHE =
  new Map();

const SCHEDULE_CACHE =
  new Map();


// ==========================================================
// PROVIDER
// ==========================================================

class ESPNProvider
  extends DataProvider {

  constructor() {

    super("ESPN");

  }


  // ========================================================
  // MAIN
  // ========================================================

  async getMatchData(
    home,
    away
  ) {

    const startedAt =
      Date.now();

    try {

      const homeName =
        cleanInput(home);

      const awayName =
        cleanInput(away);


      if (
        !homeName ||
        !awayName
      ) {

        return {
          status:
            "invalid_input",

          message:
            "ESPN: أسماء الفرق غير صالحة.",

          data:
            emptyData()

        };

      }


      // ----------------------------------------------------
      // 1. DISCOVER TEAMS
      // ----------------------------------------------------

      const teams =
        await discoverTeams(
          homeName,
          awayName
        );


      // ----------------------------------------------------
      // 2. BUILD TEAM TARGETS
      // ----------------------------------------------------

      const selectedTeams = [
        teams.home,
        teams.away
      ].filter(Boolean);


      // ----------------------------------------------------
      // 3. GET TEAM SCHEDULES
      // ----------------------------------------------------

      let rawEvents = [];


      if (
        selectedTeams.length
      ) {

        const targets =
          unique(

            selectedTeams.flatMap(
              team => {

                const leagues =
                  Array.isArray(
                    team.leagues
                  )
                    ? team.leagues
                    : [];

                return leagues.map(
                  league =>
                    `${league}:${team.id}`
                );

              }
            )

          );


        const schedules =
          await Promise.all(

            targets.map(
              target => {

                const parts =
                  target.split(":");

                return getTeamSchedules(
                  parts[0],
                  parts[1]
                );

              }
            )

          );


        rawEvents.push(
          ...schedules.flat()
        );

      }


      // ----------------------------------------------------
      // 4. REMOVE DUPLICATES
      // ----------------------------------------------------

      rawEvents =
        dedupeEvents(
          rawEvents
        );


      // ----------------------------------------------------
      // 5. FIND FIXTURE
      // ----------------------------------------------------

      let fixture =
        findExactFixture(
          rawEvents,
          homeName,
          awayName
        );


      // ----------------------------------------------------
      // 6. SCOREBOARD FALLBACK
      // ----------------------------------------------------
      //
      // إذا لم نجد المباراة من team schedule،
      // نستخدم scoreboard للدوريات التي وجدنا فيها
      // أحد الفريقين.
      // ----------------------------------------------------

      if (
        !fixture
      ) {

        const scoreboardLeagues =
          unique(

            selectedTeams.flatMap(
              team =>
                Array.isArray(
                  team.leagues
                )
                  ? team.leagues
                  : []
            )

          );


        if (
          scoreboardLeagues.length
        ) {

          const futureResults =
            await Promise.all(

              scoreboardLeagues.map(
                league =>
                  getScoreboardRange(
                    league,
                    SCOREBOARD_FUTURE_DAYS
                  )
              )

            );


          rawEvents.push(
            ...futureResults.flat()
          );


          rawEvents =
            dedupeEvents(
              rawEvents
            );


          fixture =
            findExactFixture(
              rawEvents,
              homeName,
              awayName
            );

        }

      }


      // ----------------------------------------------------
      // 7. HISTORY
      // ----------------------------------------------------

      //
      // لا نحتاج إلى تحميل scoreboard لكل الدوريات
      // إذا كانت لدينا schedules للفريقين.
      //
      // نضيف past scoreboard فقط إذا كانت بيانات
      // history غير كافية.
      //

      let homeRecent =
        buildRecentForTeam(
          homeName,
          rawEvents
        );

      let awayRecent =
        buildRecentForTeam(
          awayName,
          rawEvents
        );


      if (
        homeRecent.length <
          HISTORY_LIMIT ||
        awayRecent.length <
          HISTORY_LIMIT
      ) {

        const historyLeagues =
          unique(

            selectedTeams.flatMap(
              team =>
                Array.isArray(
                  team.leagues
                )
                  ? team.leagues
                  : []
            )

          );


        if (
          historyLeagues.length
        ) {

          const pastResults =
            await Promise.all(

              historyLeagues.map(
                league =>
                  getScoreboardRangePast(
                    league,
                    SCOREBOARD_PAST_DAYS
                  )
              )

            );


          rawEvents.push(
            ...pastResults.flat()
          );


          rawEvents =
            dedupeEvents(
              rawEvents
            );


          homeRecent =
            buildRecentForTeam(
              homeName,
              rawEvents
            );

          awayRecent =
            buildRecentForTeam(
              awayName,
              rawEvents
            );

        }

      }


      // ----------------------------------------------------
      // 8. IF TEAM DISCOVERY FAILED
      // ----------------------------------------------------

      //
      // لا نعتبر مجرد عدم وجود الفريق في قائمة الدوريات
      // خطأ شبكة.
      //

      if (
        !teams.home &&
        !teams.away
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل، لكن لم يتم العثور على الفريقين في الدوريات المدعومة حاليًا.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            fixture:
              null,

            recentMatches: {

              home:
                [],

              away:
                []

            },

            diagnostics: {

              teamsDiscovered:
                0,

              eventsCollected:
                rawEvents.length,

              durationMs:
                Date.now() -
                startedAt

            }

          }

        };

      }


      // ----------------------------------------------------
      // 9. RETURN SUCCESS / PARTIAL
      // ----------------------------------------------------

      const normalizedFixture =
        fixture
          ? normalizeEvent(
              fixture
            )
          : null;


      const success =
        Boolean(
          normalizedFixture
        ) &&
        (
          homeRecent.length > 0 ||
          awayRecent.length > 0
        );


      if (
        normalizedFixture
      ) {

        return {

          status:
            "success",

          message:
            "تم التحقق من المباراة وجمع التاريخ من ESPN.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              true,

            fixture:
              normalizedFixture,

            recentMatches: {

              home:
                homeRecent,

              away:
                awayRecent

            },

            historyAvailable:
              homeRecent.length > 0 ||
              awayRecent.length > 0,

            diagnostics: {

              homeTeamFound:
                Boolean(
                  teams.home
                ),

              awayTeamFound:
                Boolean(
                  teams.away
                ),

              eventsCollected:
                rawEvents.length,

              homeHistory:
                homeRecent.length,

              awayHistory:
                awayRecent.length,

              durationMs:
                Date.now() -
                startedAt

            }

          }

        };

      }


      if (
        success
      ) {

        return {

          status:
            "partial_success",

          message:
            "تم جمع بيانات تاريخية من ESPN، لكن لم يتم التحقق من المباراة.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            fixture:
              null,

            recentMatches: {

              home:
                homeRecent,

              away:
                awayRecent

            },

            historyAvailable:
              true,

            diagnostics: {

              homeTeamFound:
                Boolean(
                  teams.home
                ),

              awayTeamFound:
                Boolean(
                  teams.away
                ),

              eventsCollected:
                rawEvents.length,

              homeHistory:
                homeRecent.length,

              awayHistory:
                awayRecent.length,

              durationMs:
                Date.now() -
                startedAt

            }

          }

        };

      }


      return {

        status:
          "api_ok_no_match",

        message:
          "ESPN متصل، لكن لم يتم العثور على المباراة أو تاريخ كافٍ للفريقين.",

        data: {

          source:
            "espn",

          available:
            true,

          matchFound:
            false,

          fixture:
            null,

          recentMatches: {

            home:
              homeRecent,

            away:
              awayRecent

          },

          diagnostics: {

            homeTeamFound:
              Boolean(
                teams.home
              ),

            awayTeamFound:
              Boolean(
                teams.away
              ),

            eventsCollected:
              rawEvents.length,

            homeHistory:
              homeRecent.length,

            awayHistory:
              awayRecent.length,

            durationMs:
              Date.now() -
              startedAt

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          classifyError(
            error
          ),

        message:
          `ESPN: ${
            error?.message ||
            String(error)
          }`,

        data:
          null

      };

    }

  }

}


// ==========================================================
// DISCOVER TEAMS
// ==========================================================

async function discoverTeams(
  home,
  away
) {

  const results =
    await mapWithConcurrency(

      LEAGUES,

      async league => {

        try {

          const teams =
            await getLeagueTeams(
              league
            );


          return teams.map(
            team => ({

              ...team,

              league

            })
          );

        } catch {

          return [];

        }

      },

      8

    );


  const all =
    results.flat();


  return {

    home:
      bestTeamMatch(
        all,
        home
      ),

    away:
      bestTeamMatch(
        all,
        away
      )

  };

}


// ==========================================================
// LEAGUE TEAMS
// ==========================================================

async function getLeagueTeams(
  league
) {

  if (
    TEAM_CACHE.has(
      league
    )
  ) {

    return TEAM_CACHE.get(
      league
    );

  }


  const urls = [

    `${SITE_API}/${league}/teams?limit=500`,

    `${WEB_API}/${league}/teams?limit=500`

  ];


  let lastError =
    null;


  for (
    const url of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      const teams =
        extractTeams(
          data
        );


      if (
        teams.length
      ) {

        TEAM_CACHE.set(
          league,
          teams
        );


        return teams;

      }

    } catch (
      error
    ) {

      lastError =
        error;

    }

  }


  TEAM_CACHE.set(
    league,
    []
  );


  if (
    lastError
  ) {

    throw lastError;

  }


  return [];

}


// ==========================================================
// EXTRACT TEAMS
// ==========================================================

function extractTeams(
  data
) {

  const output =
    [];


  //
  // ESPN normal:
  //
  // sports[0].leagues[].teams[].team
  //

  for (
    const sport
      of data?.sports ||
      []
  ) {

    for (
      const league
        of sport?.leagues ||
        []
    ) {

      for (
        const item
          of league?.teams ||
          []
      ) {

        const team =
          item?.team;


        if (
          team?.id &&
          team?.displayName
        ) {

          output.push({

            id:
              String(
                team.id
              ),

            name:
              team.displayName,

            shortName:
              team.shortDisplayName ||
              team.name ||
              team.displayName,

            abbreviation:
              team.abbreviation ||
              null

          });

        }

      }

    }

  }


  //
  // بعض استجابات ESPN قد تكون:
  //
  // sports[0].leagues[0].teams
  //

  if (
    output.length === 0 &&
    Array.isArray(
      data?.teams
    )
  ) {

    for (
      const item
        of data.teams
    ) {

      const team =
        item?.team ||
        item;


      if (
        team?.id &&
        team?.displayName
      ) {

        output.push({

          id:
            String(
              team.id
            ),

          name:
            team.displayName,

          shortName:
            team.shortDisplayName ||
            team.name ||
            team.displayName,

          abbreviation:
            team.abbreviation ||
            null

        });

      }

    }

  }


  return dedupeTeams(
    output
  );

}


// ==========================================================
// BEST TEAM MATCH
// ==========================================================

function bestTeamMatch(
  teams,
  wanted
) {

  const candidates =
    teams

      .map(
        team => ({

          team,

          score:
            nameScore(
              team.name,
              wanted
            )

        })
      )

      .filter(
        item =>
          item.score >=
          70
      )

      .sort(
        (
          a,
          b
        ) =>
          b.score -
          a.score
      );


  if (
    !candidates.length
  ) {

    return null;

  }


  const best =
    candidates[0].team;


  const threshold =
    Math.max(
      70,
      candidates[0].score -
      12
    );


  const leagues =
    unique(

      candidates

        .filter(
          item =>
            item.score >=
            threshold
        )

        .map(
          item =>
            item.team.league
        )

    );


  return {

    ...best,

    leagues:
      leagues.length
        ? leagues
        : [
            best.league
          ]

  };

}


// ==========================================================
// TEAM SCHEDULE
// ==========================================================

async function getTeamSchedules(
  league,
  teamId
) {

  const key =
    `${league}:${teamId}`;


  if (
    SCHEDULE_CACHE.has(
      key
    )
  ) {

    return SCHEDULE_CACHE.get(
      key
    );

  }


  const urls = [

    //
    // IMPORTANT:
    // هذا هو المسار الحديث الذي أثبتناه.
    //

    `${WEB_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?fixture=true&limit=100`,

    `${WEB_API}/all/teams/${encodeURIComponent(
      teamId
    )}/schedule?limit=100`,

    //
    // fallback القديم/league based
    //

    `${SITE_API}/${league}/teams/${encodeURIComponent(
      teamId
    )}/schedule?fixture=true&limit=100`,

    `${SITE_API}/${league}/teams/${encodeURIComponent(
      teamId
    )}/schedule?limit=100`

  ];


  const all =
    [];


  for (
    const url of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      if (
        Array.isArray(
          data?.events
        )
      ) {

        all.push(
          ...data.events
        );

      }

    } catch {

      //
      // لا نوقف باقي المحاولات.
      //

    }

  }


  const events =
    dedupeEvents(
      all
    );


  SCHEDULE_CACHE.set(
    key,
    events
  );


  return events;

}


// ==========================================================
// SCOREBOARD FUTURE
// ==========================================================

async function getScoreboardRange(
  league,
  daysForward
) {

  const now =
    new Date();


  const end =
    new Date(
      now.getTime() +
      daysForward *
      86400000
    );


  return getScoreboardByDates(
    league,
    formatDate(
      now
    ),
    formatDate(
      end
    )
  );

}


// ==========================================================
// SCOREBOARD PAST
// ==========================================================

async function getScoreboardRangePast(
  league,
  daysBack
) {

  const now =
    new Date();


  const start =
    new Date(
      now.getTime() -
      daysBack *
      86400000
    );


  return getScoreboardByDates(
    league,
    formatDate(
      start
    ),
    formatDate(
      now
    )
  );

}


// ==========================================================
// SCOREBOARD BY DATE RANGE
// ==========================================================

async function getScoreboardByDates(
  league,
  from,
  to
) {

  const fromValue =
    from.replace(
      /-/g,
      ""
    );


  const toValue =
    to.replace(
      /-/g,
      ""
    );


  const query =
    `?dates=${fromValue}-${toValue}&limit=1000`;


  const urls = [

    `${SITE_API}/${league}/scoreboard${query}`,

    `${WEB_API}/${league}/scoreboard${query}`

  ];


  const all =
    [];


  for (
    const url of urls
  ) {

    try {

      const data =
        await fetchJSON(
          url
        );


      if (
        Array.isArray(
          data?.events
        )
      ) {

        all.push(
          ...data.events
        );

      }

    } catch {

      //
      // fallback التالي
      //

    }

  }


  return dedupeEvents(
    all
  );

}


// ==========================================================
// FIND EXACT FIXTURE
// ==========================================================

function findExactFixture(
  events,
  home,
  away
) {

  const candidates =
    events
      .filter(
        event =>
          event &&
          hasTeams(
            event
          )
      );


  //
  // أولاً:
  // Home / Away بالترتيب الصحيح.
  //

  const exact =
    candidates.find(
      event =>
        isExactFixture(
          event,
          home,
          away
        )
    );


  if (
    exact
  ) {

    return exact;

  }


  //
  // fallback:
  // بعض الأحداث قد يكون homeAway غير مضبوط.
  //

  const samePair =
    candidates.find(
      event => {

        const pair =
          getTeamNames(
            event
          );


        return (

          (
            namesMatch(
              pair.home,
              home
            ) &&
            namesMatch(
              pair.away,
              away
            )

          )

          ||

          (

            namesMatch(
              pair.home,
              away
            ) &&
            namesMatch(
              pair.away,
              home
            )

          )

        );

      }
    );


  return samePair ||
    null;

}


// ==========================================================
// EXACT FIXTURE
// ==========================================================

function isExactFixture(
  event,
  home,
  away
) {

  const pair =
    getTeamNames(
      event
    );


  return (

    namesMatch(
      pair.home,
      home
    ) &&

    namesMatch(
      pair.away,
      away
    )

  );

}


// ==========================================================
// TEAM NAMES FROM EVENT
// ==========================================================

function getTeamNames(
  event
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


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


  //
  // fallback إذا لم توجد homeAway
  //

  if (
    !home &&
    !away &&
    competitors.length >= 2
  ) {

    return {

      home:
        competitors[0]
          ?.team
          ?.displayName ||
        null,

      away:
        competitors[1]
          ?.team
          ?.displayName ||
        null

    };

  }


  return {

    home:
      home?.team
        ?.displayName ||
      null,

    away:
      away?.team
        ?.displayName ||
      null

  };

}


// ==========================================================
// BUILD RECENT MATCHES
// ==========================================================

function buildRecentForTeam(
  teamName,
  events
) {

  const matches =
    events

      .filter(
        event => {

          const pair =
            getTeamNames(
              event
            );


          return (

            namesMatch(
              pair.home,
              teamName
            ) ||

            namesMatch(
              pair.away,
              teamName
            )

          );

        }
      )

      .filter(
        event =>
          hasFinalScore(
            event
          )
      )

      .sort(
        (
          a,
          b
        ) =>
          eventTimestamp(b) -
          eventTimestamp(a)
      )

      .slice(
        0,
        HISTORY_LIMIT
      )

      .map(
        normalizeEvent
      );


  return dedupeNormalizedMatches(
    matches
  );

}


// ==========================================================
// FINAL SCORE
// ==========================================================

function hasFinalScore(
  event
) {

  const competition =
    event
      ?.competitions?.[0];


  const competitors =
    competition
      ?.competitors ||
    [];


  if (
    competitors.length <
    2
  ) {

    return false;

  }


  const scores =
    competitors.map(
      item =>
        finiteOrNull(
          item?.score
        )
    );


  if (
    scores.some(
      value =>
        value === null
    )
  ) {

    return false;

  }


  const completed =
    competition
      ?.status
      ?.type
      ?.completed;


  //
  // ESPN قد يعطي completed=true
  // للمباراة المنتهية.
  //
  // إذا لم توجد الحالة، نتحقق من
  // وجود scores.
  //

  return (
    completed === true ||
    completed === undefined
  );

}


// ==========================================================
// NORMALIZE EVENT
// ==========================================================

function normalizeEvent(
  event
) {

  const competition =
    event
      ?.competitions?.[0];


  const competitors =
    competition
      ?.competitors ||
    [];


  let home =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    );


  let away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    );


  if (
    !home &&
    !away &&
    competitors.length >= 2
  ) {

    home =
      competitors[0];

    away =
      competitors[1];

  }


  const homeScore =
    finiteOrNull(
      home?.score
    );


  const awayScore =
    finiteOrNull(
      away?.score
    );


  const completed =
    competition
      ?.status
      ?.type
      ?.completed === true;


  const finished =
    completed &&
    homeScore !== null &&
    awayScore !== null;


  return {

    id:
      String(
        event?.id ||
        competition?.id ||
        ""
      ),


    utcDate:
      event?.date ||
      competition?.date ||
      null,


    status:
      finished
        ? "FINISHED"
        : "SCHEDULED",


    homeTeam: {

      id:
        home?.team?.id
          ? String(
              home.team.id
            )
          : null,

      name:
        home?.team
          ?.displayName ||
        home?.team
          ?.name ||
        null,

      shortName:
        home?.team
          ?.shortDisplayName ||
        home?.team
          ?.shortName ||
        null

    },


    awayTeam: {

      id:
        away?.team?.id
          ? String(
              away.team.id
            )
          : null,

      name:
        away?.team
          ?.displayName ||
        away?.team
          ?.name ||
        null,

      shortName:
        away?.team
          ?.shortDisplayName ||
        away?.team
          ?.shortName ||
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
      competition
        ?.league
        ?.name ||

      event
        ?.season
        ?.displayName ||

      null

  };

}


// ==========================================================
// DEDUPE RAW EVENTS
// ==========================================================

function dedupeEvents(
  events
) {

  const seen =
    new Set();


  const output =
    [];


  for (
    const event of events ||
    []
  ) {

    const id =
      String(
        event?.id ||
        event
          ?.competitions?.[0]
          ?.id ||
        ""
      ).trim();


    const pair =
      getTeamNames(
        event
      );


    const fallbackKey = [

      event?.date ||
        "",

      normalizeName(
        pair.home
      ),

      normalizeName(
        pair.away
      )

    ].join("|");


    const key =
      id
        ? `id:${id}`
        : `pair:${fallbackKey}`;


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    output.push(
      event
    );

  }


  return output;

}


// ==========================================================
// DEDUPE TEAMS
// ==========================================================

function dedupeTeams(
  teams
) {

  const seen =
    new Set();


  const output =
    [];


  for (
    const team of teams
  ) {

    const key =
      `${team.id}:${team.name}`;


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    output.push(
      team
    );

  }


  return output;

}


// ==========================================================
// DEDUPE NORMALIZED MATCHES
// ==========================================================

function dedupeNormalizedMatches(
  matches
) {

  const seen =
    new Set();


  return matches.filter(
    match => {

      const key =
        String(
          match?.id ||
          [

            match?.utcDate,

            match
              ?.homeTeam
              ?.name,

            match
              ?.awayTeam
              ?.name

          ].join("|")
        );


      if (
        seen.has(
          key
        )
      ) {

        return false;

      }


      seen.add(
        key
      );


      return true;

    }
  );

}


// ==========================================================
// EVENT TIMESTAMP
// ==========================================================

function eventTimestamp(
  event
) {

  const timestamp =
    Date.parse(
      event?.date ||
      ""
    );


  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;

}


// ==========================================================
// FETCH JSON
// ==========================================================

async function fetchJSON(
  url
) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS
    );


  try {

    const response =
      await fetch(
        url,
        {

          method:
            "GET",

          headers: {

            Accept:
              "application/json",

            "User-Agent":
              `YCB-Football-Prediction-Engine/${PROVIDER_VERSION}`

          },

          signal:
            controller.signal

        }
      );


    const text =
      await response.text();


    let data =
      null;


    if (
      text
    ) {

      try {

        data =
          JSON.parse(
            text
          );

      } catch {

        throw new Error(
          `ESPN invalid JSON (${response.status})`
        );

      }

    }


    if (
      !response.ok
    ) {

      throw new Error(
        `ESPN HTTP ${response.status}`
      );

    }


    return data;

  } catch (
    error
  ) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "ESPN request timeout"
      );

    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }

}


// ==========================================================
// CONCURRENCY LIMIT
// ==========================================================

async function mapWithConcurrency(
  items,
  worker,
  limit
) {

  const results =
    new Array(
      items.length
    );


  let nextIndex =
    0;


  async function runner() {

    while (
      true
    ) {

      const index =
        nextIndex++;


      if (
        index >=
        items.length
      ) {

        return;

      }


      try {

        results[index] =
          await worker(
            items[index],
            index
          );

      } catch {

        results[index] =
          [];

      }

    }

  }


  const workers =
    Math.min(
      limit,
      items.length
    );


  await Promise.all(
    Array.from(
      {
        length:
          workers
      },
      () =>
        runner()
    )
  );


  return results;

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
      /\b(fc|cf|afc|sc|ac|fk|ks|club|the)\b/g,
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
    a === b
  ) {

    return true;

  }


  if (
    a.includes(b) ||
    b.includes(a)
  ) {

    return true;

  }


  const aliases = {

    "sporting lisbon":
      [
        "sporting cp"
      ],

    "inter milan":
      [
        "internazionale"
      ],

    "inter":
      [
        "internazionale"
      ],

    "psv eindhoven":
      [
        "psv"
      ],

    "paris saint germain":
      [
        "paris saint-germain",
        "psg"
      ],

    "manchester united":
      [
        "man united",
        "man utd"
      ],

    "manchester city":
      [
        "man city"
      ],

    "tottenham hotspur":
      [
        "tottenham"
      ],

    "newcastle united":
      [
        "newcastle"
      ],

    "atletico madrid":
      [
        "atletico"
      ],

    "athletic club":
      [
        "athletic bilbao"
      ]

  };


  if (
    aliases[a]
      ?.some(
        alias =>
          normalizeName(
            alias
          ) === b
      )
  ) {

    return true;

  }


  if (
    aliases[b]
      ?.some(
        alias =>
          normalizeName(
            alias
          ) === a
      )
  ) {

    return true;

  }


  const ta =
    new Set(
      a
        .split(
          " "
        )
        .filter(
          token =>
            token.length >=
            3
        )
    );


  const tb =
    b
      .split(
        " "
      )
      .filter(
        token =>
          token.length >=
          3
      );


  if (
    !ta.size ||
    !tb.length
  ) {

    return false;

  }


  const overlap =
    tb.filter(
      token =>
        ta.has(
          token
        )
    ).length;


  const required =
    Math.min(
      2,
      tb.length
    );


  return (
    overlap >=
    required
  );

}


// ==========================================================
// NAME SCORE
// ==========================================================

function nameScore(
  candidate,
  wanted
) {

  const a =
    normalizeName(
      candidate
    );


  const b =
    normalizeName(
      wanted
    );


  if (
    !a ||
    !b
  ) {

    return 0;

  }


  if (
    a === b
  ) {

    return 100;

  }


  if (
    namesMatch(
      a,
      b
    )
  ) {

    const ta =
      new Set(
        a
          .split(" ")
          .filter(
            token =>
              token.length >=
              3
          )
      );


    const tb =
      b
        .split(" ")
        .filter(
          token =>
            token.length >=
            3
        );


    const overlap =
      tb.filter(
        token =>
          ta.has(
            token
          )
      ).length;


    return Math.min(
      96,
      65 +
      overlap *
      10
    );

  }


  return 0;

}


// ==========================================================
// FINITE NUMBER
// ==========================================================

function finiteOrNull(
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


// ==========================================================
// DATE
// ==========================================================

function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    );

}


// ==========================================================
// UNIQUE
// ==========================================================

function unique(
  values
) {

  return [
    ...new Set(
      (
        values ||
        []
      ).filter(
        Boolean
      )
    )
  ];

}


// ==========================================================
// CLEAN INPUT
// ==========================================================

function cleanInput(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


// ==========================================================
// ERROR CLASSIFICATION
// ==========================================================

function classifyError(
  error
) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();


  if (
    message.includes(
      "timeout"
    )
  ) {

    return "timeout";

  }


  if (
    message.includes(
      "http 401"
    )
  ) {

    return "http_401";

  }


  if (
    message.includes(
      "http 403"
    )
  ) {

    return "http_403";

  }


  if (
    message.includes(
      "http 404"
    )
  ) {

    return "http_404";

  }


  if (
    message.includes(
      "http 429"
    )
  ) {

    return "rate_limited";

  }


  return "network_error";

}


// ==========================================================
// HAS TEAMS
// ==========================================================

function hasTeams(
  event
) {

  const pair =
    getTeamNames(
      event
    );


  return Boolean(
    pair.home &&
    pair.away
  );

}


// ==========================================================
// EMPTY DATA
// ==========================================================

function emptyData() {

  return {

    source:
      "espn",

    available:
      true,

    matchFound:
      false,

    fixture:
      null,

    recentMatches: {

      home:
        [],

      away:
        []

    },

    diagnostics: {

      teamsDiscovered:
        0,

      eventsCollected:
        0,

      homeHistory:
        0,

      awayHistory:
        0

    }

  };

}


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
