// Y.C.B ESPN PROVIDER

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";


class ESPNProvider
  extends DataProvider {

  constructor() {

    super(
      "ESPN"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    const now =
      new Date();


    const from =
      shiftDate(
        now,
        -30
      );


    const to =
      shiftDate(
        now,
        45
      );


    const url =
      `${BASE}?dates=${formatDate(from)}-${formatDate(to)}&limit=1000`;


    try {

      const payload =
        await fetchJSON(
          url
        );


      const events =
        Array.isArray(
          payload?.events
        )
          ? payload.events
          : [];


      const fixtureEvent =
        events.find(
          event =>
            eventMatches(
              event,
              home,
              away
            )
        );


      if (!fixtureEvent) {

        return {

          status:
            "api_ok_no_match",

          message:
            "ESPN متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "espn",

            available:
              true,

            matchFound:
              false,

            searchRange: {

              dateFrom:
                formatDate(from),

              dateTo:
                formatDate(to)

            },

            totalEvents:
              events.length

          }

        };

      }


      const fixture =
        normalizeEvent(
          fixtureEvent
        );


      const league =
        inferLeague(
          fixtureEvent
        );


      let homeRecent =
        events

          .filter(
            event =>
              isTeamEvent(
                event,
                home
              ) &&
              isFinished(
                event
              ) &&
              !sameEvent(
                event,
                fixtureEvent
              )
          )

          .slice(
            -15
          )

          .reverse()

          .map(
            normalizeEvent
          );


      let awayRecent =
        events

          .filter(
            event =>
              isTeamEvent(
                event,
                away
              ) &&
              isFinished(
                event
              ) &&
              !sameEvent(
                event,
                fixtureEvent
              )
          )

          .slice(
            -15
          )

          .reverse()

          .map(
            normalizeEvent
          );


      if (league) {

        const competitors =
          fixtureEvent
            ?.competitions?.[0]
            ?.competitors ||
          [];


        const homeId =
          competitors.find(
            item =>
              item?.homeAway ===
              "home"
          )?.team?.id;


        const awayId =
          competitors.find(
            item =>
              item?.homeAway ===
              "away"
          )?.team?.id;


        const [
          homeSchedule,
          awaySchedule
        ] =
          await Promise.all([

            homeId
              ? fetchTeamSchedule(
                  league,
                  homeId
                )
              : Promise.resolve([]),

            awayId
              ? fetchTeamSchedule(
                  league,
                  awayId
                )
              : Promise.resolve([])

          ]);


        if (
          homeSchedule.length
        ) {

          homeRecent =
            homeSchedule

              .filter(
                event =>
                  isFinished(
                    event
                  ) &&
                  !sameEvent(
                    event,
                    fixtureEvent
                  )
              )

              .sort(
                (a, b) =>
                  new Date(
                    b?.date || 0
                  ) -
                  new Date(
                    a?.date || 0
                  )
              )

              .slice(
                0,
                15
              )

              .map(
                normalizeEvent
              );

        }


        if (
          awaySchedule.length
        ) {

          awayRecent =
            awaySchedule

              .filter(
                event =>
                  isFinished(
                    event
                  ) &&
                  !sameEvent(
                    event,
                    fixtureEvent
                  )
              )

              .sort(
                (a, b) =>
                  new Date(
                    b?.date || 0
                  ) -
                  new Date(
                    a?.date || 0
                  )
              )

              .slice(
                0,
                15
              )

              .map(
                normalizeEvent
              );

        }

      }


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة عبر ESPN.",

        data: {

          source:
            "espn",

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


async function fetchJSON(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          Accept:
            "application/json",

          "User-Agent":
            "YCB-Football-Prediction-Engine/2.2"

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

  } catch {}


  if (!response.ok) {

    throw new Error(
      `ESPN HTTP ${response.status}` +
      (
        data?.message
          ? `: ${data.message}`
          : ""
      )
    );

  }


  return data;

}


async function fetchTeamSchedule(
  league,
  teamId
) {

  try {

    const data =
      await fetchJSON(

        `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${encodeURIComponent(teamId)}/schedule`

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


function inferLeague(
  event
) {

  const text = [

    event?.league?.slug,

    event?.league?.name,

    event?.season?.slug,

    event?.season?.displayName

  ]

    .filter(Boolean)

    .join(" ")

    .toLowerCase();


  const maps = [

    [
      /english[- ]premier[- ]league|premier[- ]league/,
      "eng.1"
    ],

    [
      /english[- ]championship/,
      "eng.2"
    ],

    [
      /spanish[- ]laliga|la[- ]liga/,
      "esp.1"
    ],

    [
      /german[- ]bundesliga/,
      "ger.1"
    ],

    [
      /italian[- ]serie[- ]a/,
      "ita.1"
    ],

    [
      /french[- ]ligue[- ]1/,
      "fra.1"
    ],

    [
      /major[- ]league[- ]soccer|\bmls\b/,
      "usa.1"
    ],

    [
      /uefa[- ]champions[- ]league/,
      "uefa.champions"
    ],

    [
      /copa[- ]libertadores/,
      "conmebol.libertadores"
    ],

    [
      /brazilian[- ]serie[- ]a|brasileirao/,
      "bra.1"
    ],

    [
      /argentine[- ]liga|liga[- ]profesional/,
      "arg.1"
    ]

  ];


  const found =
    maps.find(
      ([regex]) =>
        regex.test(
          text
        )
    );


  return found
    ? found[1]
    : null;

}


function normalizeEvent(
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
    ) ||
    competitors[0] ||
    {};


  const away =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    ) ||
    competitors[1] ||
    {};


  const homeScore =
    numberOrNull(
      home?.score
    );


  const awayScore =
    numberOrNull(
      away?.score
    );


  const completed =
    isFinished(
      event
    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.date ||
      null,

    status:
      completed
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type
              ?.name ||
            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home
          ?.team
          ?.id ||
        null,

      name:
        home
          ?.team
          ?.displayName ||
        home
          ?.team
          ?.name ||
        null,

      shortName:
        home
          ?.team
          ?.shortDisplayName ||
        home
          ?.team
          ?.abbreviation ||
        null

    },

    awayTeam: {

      id:
        away
          ?.team
          ?.id ||
        null,

      name:
        away
          ?.team
          ?.displayName ||
        away
          ?.team
          ?.name ||
        null,

      shortName:
        away
          ?.team
          ?.shortDisplayName ||
        away
          ?.team
          ?.abbreviation ||
        null

    },

    score: {

      fullTime: {

        home:
          completed
            ? homeScore
            : null,

        away:
          completed
            ? awayScore
            : null

      }

    },

    tournament:
      event?.league?.name ||
      event?.season?.slug ||
      null

  };

}


function eventMatches(
  event,
  home,
  away
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


  const h =
    competitors.find(
      item =>
        item?.homeAway ===
        "home"
    )?.team;


  const a =
    competitors.find(
      item =>
        item?.homeAway ===
        "away"
    )?.team;


  return (

    namesMatch(
      normalizeName(
        h?.displayName ||
        h?.name
      ),

      normalizeName(
        home
      )
    )

    &&

    namesMatch(
      normalizeName(
        a?.displayName ||
        a?.name
      ),

      normalizeName(
        away
      )
    )

  );

}


function isTeamEvent(
  event,
  team
) {

  const competitors =
    event
      ?.competitions?.[0]
      ?.competitors ||
    [];


  return competitors.some(
    item =>
      namesMatch(
        normalizeName(
          item
            ?.team
            ?.displayName ||
          item
            ?.team
            ?.name
        ),

        normalizeName(
          team
        )
      )
  );

}


function isFinished(
  event
) {

  return (

    event
      ?.status
      ?.type
      ?.completed ===
    true

    ||

    [

      "STATUS_FINAL",

      "STATUS_FINAL_PEN",

      "STATUS_FINAL_AET"

    ].includes(

      event
        ?.status
        ?.type
        ?.name

    )

  );

}


function sameEvent(
  first,
  second
) {

  return (

    String(
      first?.id ||
      ""
    )

    ===

    String(
      second?.id ||
      ""
    )

  );

}


function numberOrNull(
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
          item =>
            item.length >= 3
        )

    );


  return second
    .split(" ")
    .some(
      item =>
        item.length >= 3 &&
        tokens.has(
          item
        )
    );

}


function shiftDate(
  date,
  days
) {

  const result =
    new Date(
      date
    );


  result.setUTCDate(
    result.getUTCDate() +
    days
  );


  return result;

}


function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    )
    .replace(
      /-/g,
      ""
    );

}


const provider =
  new ESPNProvider();


registerProvider(
  provider
);


export default provider;
