// Y.C.B FOOTBALL-DATA.ORG PROVIDER

import {
  DataProvider,
  registerProvider
} from "./providers.js";


const BASE =
  "https://api.football-data.org/v4";


class FootballDataProvider
  extends DataProvider {

  constructor() {

    super(
      "Football-Data.org"
    );

  }


  async getMatchData(
    home,
    away,
    env
  ) {

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN ||
        ""
      ).trim();


    if (!token) {

      return {

        status:
          "not_configured",

        message:
          "Football-Data.org غير مفعل: FOOTBALL_DATA_TOKEN غير موجود. المصدر اختياري.",

        data:
          null

      };

    }


    const now =
      new Date();


    const from =
      formatDate(
        shiftDate(
          now,
          -14
        )
      );


    const to =
      formatDate(
        shiftDate(
          now,
          21
        )
      );


    const url =
      new URL(
        `${BASE}/matches`
      );


    url.searchParams.set(
      "dateFrom",
      from
    );


    url.searchParams.set(
      "dateTo",
      to
    );


    url.searchParams.set(
      "status",
      "SCHEDULED,LIVE,IN_PLAY,PAUSED,FINISHED,POSTPONED,SUSPENDED,CANCELLED"
    );


    try {

      const response =
        await fetch(
          url,
          {

            headers: {

              "X-Auth-Token":
                token,

              Accept:
                "application/json"

            }

          }
        );


      const text =
        await response.text();


      let payload =
        null;


      try {

        payload =
          text
            ? JSON.parse(
                text
              )
            : null;

      } catch {}


      if (
        !response.ok
      ) {

        throw new Error(

          `HTTP ${response.status}: ` +

          (
            payload?.message ||
            payload?.error ||
            text ||
            "API error"
          )

        );

      }


      const matches =
        Array.isArray(
          payload?.matches
        )
          ? payload.matches
          : [];


      const requested =
        matches.find(
          match =>

            namesMatch(
              normalizeName(
                match
                  ?.homeTeam
                  ?.name
              ),

              normalizeName(
                home
              )
            )

            &&

            namesMatch(
              normalizeName(
                match
                  ?.awayTeam
                  ?.name
              ),

              normalizeName(
                away
              )
            )

        );


      if (!requested) {

        return {

          status:
            "api_ok_no_match",

          message:
            "Football-Data.org متصل لكن المباراة غير موجودة في نطاق البحث الحالي.",

          data: {

            source:
              "football-data.org",

            available:
              true,

            matchFound:
              false,

            totalMatchesReturned:
              matches.length,

            searchRange: {

              dateFrom:
                from,

              dateTo:
                to

            }

          }

        };

      }


      const fixture =
        normalizeMatch(
          requested
        );


      const homeRecent =
        matches

          .filter(
            match =>

              match?.status ===
              "FINISHED"

              &&

              (
                namesMatch(
                  normalizeName(
                    match
                      ?.homeTeam
                      ?.name
                  ),
                  normalizeName(
                    home
                  )
                )

                ||

                namesMatch(
                  normalizeName(
                    match
                      ?.awayTeam
                      ?.name
                  ),
                  normalizeName(
                    home
                  )
                )
              )

              &&

              match?.id !==
              requested?.id
          )

          .slice(
            -15
          )

          .reverse()

          .map(
            normalizeMatch
          );


      const awayRecent =
        matches

          .filter(
            match =>

              match?.status ===
              "FINISHED"

              &&

              (
                namesMatch(
                  normalizeName(
                    match
                      ?.homeTeam
                      ?.name
                  ),
                  normalizeName(
                    away
                  )
                )

                ||

                namesMatch(
                  normalizeName(
                    match
                      ?.awayTeam
                      ?.name
                  ),
                  normalizeName(
                    away
                  )
                )
              )

              &&

              match?.id !==
              requested?.id
          )

          .slice(
            -15
          )

          .reverse()

          .map(
            normalizeMatch
          );


      return {

        status:
          "success",

        message:
          "تم العثور على المباراة عبر Football-Data.org.",

        data: {

          source:
            "football-data.org",

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
          "api_error",

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }

  }

}


function normalizeMatch(
  match
) {

  return {

    id:
      String(
        match?.id ||
        ""
      ),

    utcDate:
      match?.utcDate ||
      null,

    status:
      match?.status ||
      null,

    homeTeam: {

      id:
        match
          ?.homeTeam
          ?.id ||
        null,

      name:
        match
          ?.homeTeam
          ?.name ||
        null,

      shortName:
        match
          ?.homeTeam
          ?.shortName ||
        match
          ?.homeTeam
          ?.tla ||
        null

    },

    awayTeam: {

      id:
        match
          ?.awayTeam
          ?.id ||
        null,

      name:
        match
          ?.awayTeam
          ?.name ||
        null,

      shortName:
        match
          ?.awayTeam
          ?.shortName ||
        match
          ?.awayTeam
          ?.tla ||
        null

    },

    score: {

      fullTime: {

        home:
          finiteOrNull(
            match
              ?.score
              ?.fullTime
              ?.home
          ),

        away:
          finiteOrNull(
            match
              ?.score
              ?.fullTime
              ?.away
          )

      }

    },

    tournament:
      match
        ?.competition
        ?.name ||
      null

  };

}


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


const provider =
  new FootballDataProvider();


registerProvider(
  provider
);


export default provider;
