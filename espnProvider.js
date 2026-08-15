// ==========================================================
// Y.C.B ESPN PROVIDER 3.1.0
// ==========================================================

import {
  registerProvider
} from "./providers.js";


const DEFAULT_LEAGUES = [

  "eng.1",
  "esp.1",
  "ger.1",
  "ita.1",
  "fra.1",
  "ned.1",
  "por.1",
  "bel.1",
  "sco.1",
  "tur.1",
  "usa.1",
  "mex.1",
  "bra.1",
  "arg.1"

];


const BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";


/* ==========================================================
   NORMALIZE
========================================================== */

function normalize(
  value
) {

  return String(
    value ||
    ""
  )

    .toLowerCase()

    .replace(
      /[^a-z0-9\u0600-\u06ff]/gi,
      ""
    );

}


/* ==========================================================
   TEAM MATCH
========================================================== */

function teamMatches(
  name,
  target
) {

  const a =
    normalize(
      name
    );


  const b =
    normalize(
      target
    );


  return Boolean(

    a &&
    b &&

    (

      a === b ||
      a.includes(b) ||
      b.includes(a)

    )

  );

}


/* ==========================================================
   JSON
========================================================== */

async function getJson(
  url
) {

  const response =
    await fetch(
      url,
      {
        headers:{
          Accept:
            "application/json"
        }
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `ESPN HTTP ${response.status}`
    );

  }


  return response.json();

}


/* ==========================================================
   CONVERT COMPETITION
========================================================== */

function convertCompetition(
  comp
) {

  const event =
    comp?.competitions?.[0];


  if (
    !event
  ) {

    return null;

  }


  const competitors =
    Array.isArray(
      event.competitors
    )
      ? event.competitors
      : [];


  const h =
    competitors.find(
      x =>
        x.homeAway ===
        "home"
    );


  const a =
    competitors.find(
      x =>
        x.homeAway ===
        "away"
    );


  if (
    !h ||
    !a
  ) {

    return null;

  }


  const hs =
    h.score == null
      ? null
      : Number(
          h.score
        );


  const as =
    a.score == null
      ? null
      : Number(
          a.score
        );


  const completed =
    Boolean(
      event.status?.type?.completed
    );


  return {

    id:
      comp.id ||
      event.id ||
      `${h.team?.displayName}|${a.team?.displayName}|${comp.date}`,

    utcDate:
      comp.date ||
      null,

    date:
      comp.date ||
      null,

    homeTeam:{
      name:
        h.team?.displayName ||
        h.team?.name ||
        ""
    },

    awayTeam:{
      name:
        a.team?.displayName ||
        a.team?.name ||
        ""
    },

    score:{
      fullTime:{

        home:
          completed &&
          Number.isFinite(hs)
            ? hs
            : null,

        away:
          completed &&
          Number.isFinite(as)
            ? as
            : null

      }
    },

    competition:{
      name:
        comp.league?.name ||
        "ESPN"
    }

  };

}


/* ==========================================================
   LOAD LEAGUE
========================================================== */

async function loadLeague(
  league,
  date
) {

  const url =

    `${BASE}/${encodeURIComponent(
      league
    )}/scoreboard?limit=100` +

    (

      date
        ? `&dates=${encodeURIComponent(
            date
          )}`
        : ""

    );


  const data =
    await getJson(
      url
    );


  return Array.isArray(
    data?.events
  )

    ? data.events

    : [];

}


/* ==========================================================
   GET MATCH DATA
========================================================== */

async function getMatchData(
  home,
  away,
  env
) {

  const leagues =
    String(
      env?.ESPN_LEAGUES ||
      DEFAULT_LEAGUES.join(",")
    )

      .split(",")

      .map(
        x =>
          x.trim()
      )

      .filter(
        Boolean
      );


  const today =
    new Date();


  const dates =
    [];


  for (
    let i = -45;
    i <= 45;
    i++
  ) {

    const d =
      new Date(
        today
      );


    d.setUTCDate(
      d.getUTCDate() +
      i
    );


    dates.push(

      d
        .toISOString()
        .slice(
          0,
          10
        )
        .replaceAll(
          "-",
          ""
        )

    );

  }


  const fixtureEvents =
    [];


  const recentEvents =
    [];


  for (
    const league
    of leagues
  ) {

    // تم توسيع نطاق عينات التاريخ لتجنب تفويت المباريات التاريخية ورفع جودة البيانات
    const sampleDates = [];
    for (let i = 0; i < dates.length; i += 4) {
      sampleDates.push(dates[i]);
    }


    for (
      const date
      of sampleDates
    ) {

      try {

        const events =
          await loadLeague(
            league,
            date
          );


        for (
          const raw
          of events
        ) {

          const m =
            convertCompetition(
              raw
            );


          if (
            !m
          ) {

            continue;

          }


          const related =

            teamMatches(
              m.homeTeam.name,
              home
            )

            ||

            teamMatches(
              m.awayTeam.name,
              home
            )

            ||

            teamMatches(
              m.homeTeam.name,
              away
            )

            ||

            teamMatches(
              m.awayTeam.name,
              away
            );


          if (
            related
          ) {

            recentEvents.push(
              m
            );

          }


          if (

            teamMatches(
              m.homeTeam.name,
              home
            )

            &&

            teamMatches(
              m.awayTeam.name,
              away
            )

          ) {

            fixtureEvents.push(
              m
            );

          }

        }

      } catch (
        _
      ) {}

    }

  }


  const homeHistory =

    recentEvents

      .filter(
        m =>

          teamMatches(
            m.homeTeam.name,
            home
          )

          ||

          teamMatches(
            m.awayTeam.name,
            home
          )

      )

      .filter(
        m =>

          m.score.fullTime.home !=
            null

          &&

          m.score.fullTime.away !=
            null

      );


  const awayHistory =

    recentEvents

      .filter(
        m =>

          teamMatches(
            m.homeTeam.name,
            away
          )

          ||

          teamMatches(
            m.awayTeam.name,
            away
          )

      )

      .filter(
        m =>

          m.score.fullTime.home !=
            null

          &&

          m.score.fullTime.away !=
            null

      );


  if (

    !homeHistory.length &&

    !awayHistory.length &&

    !fixtureEvents.length

  ) {

    return {

      status:
        "not_found",

      message:
        "ESPN لم يجد بيانات للمباراة ضمن الدوريات المحددة.",

      data:
        null

    };

  }


  return {

    status:
      "success",

    message:
      "ESPN data loaded",

    data:{

      matchFound:
        Boolean(
          fixtureEvents[0]
        ),

      fixture:
        fixtureEvents[0] ||
        null,

      recentMatches:{

        home:
          homeHistory.slice(
            0,
            15
          ),

        away:
          awayHistory.slice(
            0,
            15
          )

      }

    }

  };

}


/* ==========================================================
   REGISTER
========================================================== */

registerProvider({

  name:
    "ESPN",

  version:
    "3.1.0",

  description:
    "ESPN football scoreboard provider",

  getMatchData

});


export {
  getMatchData
};
