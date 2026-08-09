// ==========================================================
// Y.C.B SOFASCORE PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const API =
  "https://www.sofascore.com/api/v1";


class SofaScoreProvider
  extends DataProvider {

  constructor() {

    super(
      "SofaScore"
    );

  }


  async getMatchData(
    home,
    away
  ) {

    try {

      const [
        homeTeam,
        awayTeam
      ] =
        await Promise.all([

          findTeam(
            home
          ),

          findTeam(
            away
          )

        ]);


      let fixture =
        await findScheduledFixture(
          home,
          away
        );


      if (
        !fixture &&
        homeTeam?.id
      ) {

        fixture =
          await findTeamFixture(
            homeTeam.id,
            home,
            away
          );

      }


      if (
        !fixture &&
        awayTeam?.id
      ) {

        fixture =
          await findTeamFixture(
            awayTeam.id,
            home,
            away
          );

      }


      const [
        homeRecent,
        awayRecent
      ] =
        await Promise.all([

          homeTeam?.id

            ? getLast(
                homeTeam.id
              )

            : Promise.resolve([]),

          awayTeam?.id

            ? getLast(
                awayTeam.id
              )

            : Promise.resolve([])

        ]);


      const fixtureId =
        String(
          fixture?.id ||
          ""
        );


      const cleanHome =
        homeRecent.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            fixtureId
        );


      const cleanAway =
        awayRecent.filter(
          match =>
            String(
              match?.id ||
              ""
            ) !==
            fixtureId
        );


      if (
        !fixture &&
        !cleanHome.length &&
        !cleanAway.length
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "SofaScore متصل لكن لم يتم العثور على المباراة أو بيانات تاريخية كافية.",

          data: {

            source:
              "sofascore",

            available:
              true,

            matchFound:
              false,

            recentMatches: {

              home: [],
              away: []

            }

          }

        };

      }


      return {

        status:
          fixture
            ? "success"
            : "partial_success",

        message:
          fixture

            ? "تم العثور على المباراة وبياناتها عبر SofaScore."

            : "تم العثور على بيانات تاريخية عبر SofaScore لكن لم يتم التحقق من المباراة.",

        data: {

          source:
            "sofascore",

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

          recentMatches: {

            home:
              cleanHome,

            away:
              cleanAway

          }

        }

      };

    } catch (
      error
    ) {

      return {

        status:
          "network_error",

        message:
          error?.message ||
          String(
            error
          ),

        data:
          null

      };

    }

  }

}


// ==========================================================
// FIND TEAM
// ==========================================================

async function findTeam(
  name
) {

  try {

    const data =
      await fetchJSON(

        `${API}/search/all?q=` +
        encodeURIComponent(
          name
        )

      );


    const results =
      Array.isArray(
        data?.results
      )

        ? data.results

        : [];


    const teams =
      results.filter(
        item =>
          item?.entity?.sport?.slug ===
            "football" &&

          item?.entity?.name
      );


    return (

      teams.find(
        item =>
          namesMatch(
            item.entity.name,
            name
          )
      )
        ?.entity

      ||

      teams[0]
        ?.entity

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// FIND SCHEDULED FIXTURE
// ==========================================================

async function findScheduledFixture(
  home,
  away
) {

  try {

    const data =
      await fetchJSON(

        `${API}/sport/football/` +
        `scheduled-events/` +
        `${today()}`

      );


    const events =
      Array.isArray(
        data?.events
      )

        ? data.events

        : [];


    return (

      events.find(
        event =>
          namesMatch(
            event?.homeTeam?.name,
            home
          )

          &&

          namesMatch(
            event?.awayTeam?.name,
            away
          )
      )

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// TEAM NEXT FIXTURE
// ==========================================================

async function findTeamFixture(
  teamId,
  home,
  away
) {

  try {

    const data =
      await fetchJSON(

        `${API}/team/` +
        `${encodeURIComponent(
          teamId
        )}/events/next/0`

      );


    const events =
      Array.isArray(
        data?.events
      )

        ? data.events

        : [];


    return (

      events.find(
        event =>
          namesMatch(
            event?.homeTeam?.name,
            home
          )

          &&

          namesMatch(
            event?.awayTeam?.name,
            away
          )
      )

      ||

      null

    );

  } catch {

    return null;

  }

}


// ==========================================================
// LAST MATCHES
// ==========================================================

async function getLast(
  teamId
) {

  try {

    const all =
      [];


    for (
      let page = 0;
      page < 3;
      page++
    ) {

      try {

        const data =
          await fetchJSON(

            `${API}/team/` +
            `${encodeURIComponent(
              teamId
            )}/events/last/` +
            `${page}`

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

        /*
         * Continue next page.
         */

      }

    }


    return all

      .filter(
        isFinished
      )

      .sort(
        (a,b) =>
          (
            b?.startTimestamp ||
            0
          ) -

          (
            a?.startTimestamp ||
            0
          )
      )

      .slice(
        0,
        15
      )

      .map(
        normalizeEvent
      );

  } catch {

    return [];

  }

}


// ==========================================================
// NORMALIZE EVENT
// ==========================================================

function normalizeEvent(
  event
) {

  const homeScore =
    finiteOrNull(

      event?.homeScore?.current ??
      event?.homeScore?.normaltime

    );


  const awayScore =
    finiteOrNull(

      event?.awayScore?.current ??
      event?.awayScore?.normaltime

    );


  return {

    id:
      String(
        event?.id ||
        ""
      ),

    utcDate:
      event?.startTimestamp

        ? new Date(
            event.startTimestamp *
            1000
          ).toISOString()

        : null,

    status:
      homeScore !== null &&
      awayScore !== null

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        event?.homeTeam?.id ||
        null,

      name:
        event?.homeTeam?.name ||
        null,

      shortName:
        event?.homeTeam?.shortName ||
        event?.homeTeam?.nameCode ||
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
        event?.awayTeam?.nameCode ||
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
      event?.tournament?.name ||
      event?.uniqueTournament?.name ||
      null

  };

}


// ==========================================================
// FINISHED
// ==========================================================

function isFinished(
  event
) {

  return (

    finiteOrNull(
      event?.homeScore?.current ??
      event?.homeScore?.normaltime
    ) !== null

    &&

    finiteOrNull(
      event?.awayScore?.current ??
      event?.awayScore?.normaltime
    ) !== null

  );

}


// ==========================================================
// FETCH
// ==========================================================

async function fetchJSON(
  url
) {

  const response =
    await fetch(
      url,
      {

        headers: {

          Accept:
            "application/json"

        }

      }
    );


  const text =
    await response.text();


  if (
    !response.ok
  ) {

    throw new Error(
      `SofaScore HTTP ${response.status}`
    );

  }


  try {

    return text
      ? JSON.parse(
          text
        )
      : null;

  } catch {

    throw new Error(
      "SofaScore invalid JSON"
    );

  }

}


// ==========================================================
// TODAY
// ==========================================================

function today() {

  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );

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


// ==========================================================
// NAME MATCH
// ==========================================================

function namesMatch(
  first,
  second
) {

  first =
    normalizeName(
      first
    );


  second =
    normalizeName(
      second
    );


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


  const firstTokens =
    new Set(

      first
        .split(" ")
        .filter(
          token =>
            token.length >= 3
        )

    );


  const secondTokens =
    second
      .split(" ")
      .filter(
        token =>
          token.length >= 3
        );


  return (

    secondTokens.length > 0 &&

    secondTokens.filter(
      token =>
        firstTokens.has(
          token
        )
    ).length >=
      Math.min(
        2,
        secondTokens.length
      )

  );

}


// ==========================================================
// NUMBER
// ==========================================================

function finiteOrNull(
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


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new SofaScoreProvider();


registerProvider(
  provider
);


export default provider;
