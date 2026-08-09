// ==========================================================
// Y.C.B BSD PROVIDER
// Version 2.3.0
// ==========================================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


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
    env
  ) {

    const base =
      String(
        env?.BSD_API_URL ||
        ""
      ).trim();


    if (
      !base
    ) {

      return {

        status:
          "not_configured",

        message:
          "BSD غير مفعّل: أضف BSD_API_URL إذا كان لديك مصدر BSD متوافق.",

        data:
          null

      };

    }


    try {

      const url =
        new URL(
          base
        );


      url.searchParams.set(
        "home",
        home
      );


      url.searchParams.set(
        "away",
        away
      );


      const data =
        await fetchJSON(
          url.toString(),
          env?.BSD_API_TOKEN
        );


      const fixture =
        normalizeAny(
          data?.fixture ||
          data?.match ||
          data?.event ||
          null
        );


      const homeRecent =
        (

          Array.isArray(
            data?.recentMatches?.home
          )

            ? data.recentMatches.home

            : Array.isArray(
                data?.homeRecent
              )

              ? data.homeRecent

              : []

        )

          .map(
            normalizeAny
          )

          .filter(
            Boolean
          )

          .slice(
            0,
            15
          );


      const awayRecent =
        (

          Array.isArray(
            data?.recentMatches?.away
          )

            ? data.recentMatches.away

            : Array.isArray(
                data?.awayRecent
              )

              ? data.awayRecent

              : []

        )

          .map(
            normalizeAny
          )

          .filter(
            Boolean
          )

          .slice(
            0,
            15
          );


      if (
        !fixture &&
        !homeRecent.length &&
        !awayRecent.length
      ) {

        return {

          status:
            "api_ok_no_match",

          message:
            "BSD متصل لكن لم يعط بيانات قابلة للاستخدام.",

          data: {

            source:
              "bsd",

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

            ? "تم العثور على المباراة وبياناتها عبر BSD."

            : "تم العثور على بيانات تاريخية عبر BSD.",

        data: {

          source:
            "bsd",

          available:
            true,

          matchFound:
            Boolean(
              fixture
            ),

          fixture,

          recentMatches: {

            home:
              homeRecent,

            away:
              awayRecent

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
// NORMALIZE ANY BSD FORMAT
// ==========================================================

function normalizeAny(
  match
) {

  if (
    !match
  ) {

    return null;

  }


  const home =
    match?.homeTeam ||
    match?.home ||
    match?.team1 ||
    {};


  const away =
    match?.awayTeam ||
    match?.away ||
    match?.team2 ||
    {};


  const homeScore =
    Number(
      match?.score?.fullTime?.home ??
      match?.homeScore ??
      match?.goalsHome ??
      home?.score
    );


  const awayScore =
    Number(
      match?.score?.fullTime?.away ??
      match?.awayScore ??
      match?.goalsAway ??
      away?.score
    );


  return {

    id:
      String(
        match?.id ??
        match?.matchID ??
        match?.eventId ??
        ""
      ),

    utcDate:
      match?.utcDate ||
      match?.date ||
      match?.startTime ||
      null,

    status:
      Number.isFinite(
        homeScore
      )

      &&

      Number.isFinite(
        awayScore
      )

        ? "FINISHED"

        : "SCHEDULED",

    homeTeam: {

      id:
        home?.id ||
        home?.teamId ||
        null,

      name:
        home?.name ||
        home?.teamName ||
        null,

      shortName:
        home?.shortName ||
        null

    },

    awayTeam: {

      id:
        away?.id ||
        away?.teamId ||
        null,

      name:
        away?.name ||
        away?.teamName ||
        null,

      shortName:
        away?.shortName ||
        null

    },

    score: {

      fullTime: {

        home:
          Number.isFinite(
            homeScore
          )
            ? homeScore
            : null,

        away:
          Number.isFinite(
            awayScore
          )
            ? awayScore
            : null

      }

    },

    tournament:
      match?.tournament ||
      match?.league ||
      null

  };

}


// ==========================================================
// FETCH
// ==========================================================

async function fetchJSON(
  url,
  token
) {

  const headers = {

    Accept:
      "application/json"

  };


  if (
    token
  ) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      url,
      {
        headers
      }
    );


  const text =
    await response.text();


  if (
    !response.ok
  ) {

    throw new Error(
      `BSD HTTP ${response.status}`
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
      "BSD invalid JSON"
    );

  }

}


// ==========================================================
// REGISTER
// ==========================================================

const provider =
  new BSDProvider();


registerProvider(
  provider
);


export default provider;
