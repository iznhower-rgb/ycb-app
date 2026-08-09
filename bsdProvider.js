// Y.C.B BSD PROVIDER
// Bzzoiro Sports Data

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://sports.bzzoiro.com";


class BSDProvider
  extends DataProvider {

  constructor() {

    super(
      "BSD"
    );

  }


  async getMatchData(
    home,
    away,
    env = {}
  ) {

    const token =
      env?.BSD_API_KEY;


    if (!token) {

      return {

        status:
          "not_configured",

        message:
          "BSD API key غير مهيأ.",

        data: {

          source:
            "bsd",

          available:
            false,

          matchFound:
            false

        }

      };

    }


    try {

      const now =
        new Date();


      const from =
        shiftDate(
          now,
          -365
        );


      const to =
        shiftDate(
          now,
          365
        );


      /*
       * أولاً نحاول الحصول على IDs دقيقة للفريقين.
       * استخدام team_id أدق من البحث باسم الفريق.
       */

      const homeTeamId =
        await findTeamId(
          home,
          token
        );


      const awayTeamId =
        await findTeamId(
          away,
          token
        );


      const homeEvents =
        await getTeamEvents(
          home,
          from,
          to,
          token,
          homeTeamId
        );


      const awayEvents =
        await getTeamEvents(
          away,
          from,
          to,
          token,
          awayTeamId
        );


      const allEvents =
        dedupeEvents(
          [
            ...homeEvents,
            ...awayEvents
          ]
        );


      const fixture =
        findMatch(
          allEvents,
          home,
          away
        );


      const homeRecent =
        await getRecentMatches(
          home,
          token,
          homeTeamId
        );


      const awayRecent =
        await getRecentMatches(
          away,
          token,
          awayTeamId
        );


      return {

        status:
          fixture
            ? "success"
            : "api_ok_no_match",

        message:

          fixture

            ? "تم العثور على المباراة وبياناتها عبر BSD."

            : "BSD متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

        data: {

          source:
            "bsd",

          available:
            true,

          matchFound:
            Boolean(
              fixture
            ),

          fixture:
            fixture
              ? normalizeEvent(
                  fixture
                )
              : null,

          teamIds: {

            home:
              homeTeamId,

            away:
              awayTeamId

          },

          recentMatches: {

            home:
              homeRecent
                .map(
                  normalizeEvent
                ),

            away:
              awayRecent
                .map(
                  normalizeEvent
                )

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          error?.message
            ?.includes(
              "HTTP 401"
            )

            ? "auth_error"

            : "network_error",

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }

  }

}


/*
 * البحث عن الفريق في BSD والحصول على team_id.
 *
 * BSD يوفر قائمة الفرق عبر /api/v2/teams/
 * مع دعم البحث بالاسم.
 */

async function findTeamId(
  team,
  token
) {

  if (
    !team
  ) {

    return null;

  }


  const url =
    new URL(
      `${API}/api/v2/teams/`
    );


  url.searchParams.set(
    "search",
    team
  );


  url.searchParams.set(
    "limit",
    "50"
  );


  url.searchParams.set(
    "offset",
    "0"
  );


  const data =
    await fetchJSON(
      url.toString(),
      token
    );


  const results =
    Array.isArray(
      data?.results
    )

      ? data.results

      : Array.isArray(
          data?.teams
        )

        ? data.teams

        : [];


  if (
    !results.length
  ) {

    return null;

  }


  const wanted =
    normalizeName(
      team
    );


  const exact =
    results.find(
      item =>
        namesMatch(
          normalizeName(
            item?.name ||
            item?.short_name ||
            item?.shortName ||
            ""
          ),
          wanted
        )
    );


  if (
    exact?.id != null
  ) {

    return exact.id;

  }


  return (
    results[0]?.id ??
    null
  );

}


/*
 * جلب مباريات الفريق.
 *
 * إذا وجدنا team_id نستخدمه لأنه أدق.
 * إذا لم نجده نستخدم اسم الفريق كـ fallback.
 */

async function getTeamEvents(
  team,
  from,
  to,
  token,
  teamId = null
) {

  const url =
    new URL(
      `${API}/api/events/`
    );


  if (
    teamId != null
  ) {

    url.searchParams.set(
      "team_id",
      String(
        teamId
      )
    );

  } else {

    url.searchParams.set(
      "team",
      team
    );

  }


  url.searchParams.set(
    "date_from",
    formatDate(
      from
    )
  );


  url.searchParams.set(
    "date_to",
    formatDate(
      to
    )
  );


  url.searchParams.set(
    "limit",
    "200"
  );


  url.searchParams.set(
    "offset",
    "0"
  );


  const data =
    await fetchJSON(
      url.toString(),
      token
    );


  return Array.isArray(
    data?.results
  )

    ? data.results

    : Array.isArray(
        data?.events
      )

      ? data.events

      : [];

}


async function getRecentMatches(
  team,
  token,
  teamId = null
) {

  const now =
    new Date();


  const from =
    shiftDate(
      now,
      -180
    );


  const data =
    await getTeamEvents(
      team,
      from,
      now,
      token,
      teamId
    );


  return data

    .filter(
      event =>
        isFinished(
          event
        )
    )

    .sort(
      (
        a,
        b
      ) =>

        getTimestamp(
          b
        ) -

        getTimestamp(
          a
        )
    )

    .slice(
      0,
      15
    );

}


async function fetchJSON(
  url,
  token
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          "Accept":
            "application/json",

          "Authorization":
            `Token ${token}`

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
      `BSD HTTP ${response.status}`
    );

  }


  return data;

}


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
          event
            ?.home_team
            ?.name ||

          event
            ?.homeTeam
            ?.name ||

          event
            ?.home
            ?.name ||

          event
            ?.home_team_name ||

          ""
        );


      const eventAway =
        normalizeName(
          event
            ?.away_team
            ?.name ||

          event
            ?.awayTeam
            ?.name ||

          event
            ?.away
            ?.name ||

          event
            ?.away_team_name ||

          ""
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


function normalizeEvent(
  event
) {

  const home =
    event
      ?.home_team ||

    event
      ?.homeTeam ||

    event
      ?.home ||

    {};


  const away =
    event
      ?.away_team ||

    event
      ?.awayTeam ||

    event
      ?.away ||

    {};


  const homeScore =
    firstNumber(
      event
        ?.home_score,

      event
        ?.homeScore,

      event
        ?.score
        ?.home,

      event
        ?.score
        ?.fullTime
        ?.home
    );


  const awayScore =
    firstNumber(
      event
        ?.away_score,

      event
        ?.awayScore,

      event
        ?.score
        ?.away,

      event
        ?.score
        ?.fullTime
        ?.away
    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      toISODate(
        event
      ),

    status:
      isFinished(
        event
      )
        ? "FINISHED"
        : String(
            event
              ?.status
              ?.type ||

            event
              ?.status ||

            "SCHEDULED"
          ),

    homeTeam: {

      id:
        home
          ?.id ||

        event
          ?.home_team_id ||

        null,

      name:
        home
          ?.name ||

        event
          ?.home_team_name ||

        null,

      shortName:
        home
          ?.short_name ||

        home
          ?.shortName ||

        null

    },

    awayTeam: {

      id:
        away
          ?.id ||

        event
          ?.away_team_id ||

        null,

      name:
        away
          ?.name ||

        event
          ?.away_team_name ||

        null,

      shortName:
        away
          ?.short_name ||

        away
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
      event
        ?.league
        ?.name ||

      event
        ?.tournament
        ?.name ||

      event
        ?.league_name ||

      null

  };

}


function isFinished(
  event
) {

  const status =
    String(

      event
        ?.status
        ?.type ||

      event
        ?.status ||

      ""

    ).toLowerCase();


  return (

    status ===
      "finished"

    ||

    status ===
      "completed"

    ||

    status ===
      "after_extra_time"

    ||

    status ===
      "after_penalties"

  );

}


function firstNumber(
  ...values
) {

  for (
    const value
    of values
  ) {

    const number =
      Number(
        value
      );


    if (
      Number.isFinite(
        number
      )
    ) {

      return number;

    }

  }


  return null;

}


function toISODate(
  event
) {

  const timestamp =
    event
      ?.start_timestamp ||

    event
      ?.startTimestamp ||

    event
      ?.timestamp;


  if (
    Number.isFinite(
      Number(
        timestamp
      )
    )
  ) {

    return new Date(
      Number(
        timestamp
      ) *
      1000
    ).toISOString();

  }


  const date =
    event
      ?.date ||

    event
      ?.start_date ||

    event
      ?.utcDate;


  if (
    date
  ) {

    const parsed =
      new Date(
        date
      );


    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {

      return parsed.toISOString();

    }

  }


  return null;

}


function getTimestamp(
  event
) {

  const date =
    toISODate(
      event
    );


  return date
    ? new Date(
        date
      ).getTime()

    : 0;

}


function dedupeEvents(
  events
) {

  const seen =
    new Set();


  return events.filter(
    event => {

      const key =
        String(

          event?.id ||

          [

            event
              ?.start_timestamp,

            event
              ?.startTimestamp,

            event
              ?.home_team
              ?.name ||

            event
              ?.homeTeam
              ?.name ||

            event
              ?.home_team_name,

            event
              ?.away_team
              ?.name ||

            event
              ?.awayTeam
              ?.name ||

            event
              ?.away_team_name

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
    );

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
    new Set(
      first
        .split(" ")
        .filter(
          item =>
            item.length >= 3
        )
    );


  const secondTokens =
    second
      .split(" ")
      .filter(
        item =>
          item.length >= 3
      );


  return secondTokens.some(
    item =>
      firstTokens.has(
        item
      )
  );

}


const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;
