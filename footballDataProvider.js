// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider
  extends DataProvider {

  constructor() {

    super(
      "Football-Data.org"
    );

    this.baseUrl =
      "https://api.football-data.org/v4";

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(
    home,
    away,
    env
  ) {

    const token =
      String(
        env?.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    if (!token) {

      return {

        status:
          "configuration_error",

        message:
          "FOOTBALL_DATA_TOKEN غير موجود في Environment Variables.",

        data:
          null

      };

    }


    // ======================================
    // NORMALIZE
    // ======================================

    const normalize =
      value =>

        String(value || "")
          .toLowerCase()
          .trim()
          .normalize("NFD")
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


    const homeNormalized =
      normalize(home);


    const awayNormalized =
      normalize(away);


    // ======================================
    // DATE RANGE
    // ======================================

    const now =
      new Date();


    const dateFrom =
      new Date(now);


    dateFrom.setUTCDate(
      dateFrom.getUTCDate() - 7
    );


    const dateTo =
      new Date(now);


    dateTo.setUTCDate(
      dateTo.getUTCDate() + 30
    );


    const formatDate =
      date =>

        date
          .toISOString()
          .slice(0, 10);


    const from =
      formatDate(dateFrom);


    const to =
      formatDate(dateTo);


    // ======================================
    // REQUEST
    // ======================================

    const url =
      new URL(
        this.baseUrl + "/matches"
      );


    url.searchParams.set(
      "dateFrom",
      from
    );


    url.searchParams.set(
      "dateTo",
      to
    );


    let response;


    try {

      response =
        await fetch(
          url.toString(),
          {

            method:
              "GET",

            headers: {

              "X-Auth-Token":
                token,

              "Accept":
                "application/json"

            }

          }
        );

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


    // ======================================
    // READ RESPONSE
    // ======================================

    const responseText =
      await response.text();


    let payload =
      null;


    try {

      payload =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;

    } catch {

      payload =
        null;

    }


    if (!response.ok) {

      const apiMessage =
        payload?.message ||
        payload?.error ||
        responseText ||
        "Football-Data.org API error";


      return {

        status:
          "api_error",

        message:
          `HTTP ${response.status}: ${apiMessage}`,

        data: {

          httpStatus:
            response.status,

          requestUrl:
            url.toString(),

          apiResponse:
            payload

        }

      };

    }


    // ======================================
    // EXTRACT MATCHES
    // ======================================

    const matches =
      Array.isArray(
        payload?.matches
      )
        ? payload.matches
        : [];


    // ======================================
    // FIND MATCH
    // ======================================

    const requestedMatch =
      matches.find(
        match => {

          const matchHome =
            normalize(
              match?.homeTeam?.name ||
              match?.homeTeam?.shortName ||
              match?.homeTeam?.tla
            );


          const matchAway =
            normalize(
              match?.awayTeam?.name ||
              match?.awayTeam?.shortName ||
              match?.awayTeam?.tla
            );


          return (

            namesMatch(
              matchHome,
              homeNormalized
            )

            &&

            namesMatch(
              matchAway,
              awayNormalized
            )

          );

        }
      );


    // ======================================
    // NOT FOUND
    // ======================================

    if (!requestedMatch) {

      return {

        status:
          "api_ok_no_match",

        message:
          "تم الاتصال بـ Football-Data.org بنجاح، لكن المباراة المطلوبة غير موجودة داخل نطاق البحث الحالي.",

        data: {

          source:
            "football-data.org",

          available:
            true,

          matchFound:
            false,

          requested: {

            home:
              home,

            away:
              away

          },

          searchRange: {

            dateFrom:
              from,

            dateTo:
              to

          },

          totalMatchesReturned:
            matches.length

        }

      };

    }


    // ======================================
    // MATCH FOUND
    // ======================================

    return {

      status:
        "success",

      message:
        "تم العثور على المباراة بنجاح.",

      data: {

        source:
          "football-data.org",

        available:
          true,

        matchFound:
          true,

        match:
          requestedMatch

      }

    };

  }

}


// ==========================================
// TEAM NAME MATCH
// ==========================================

function namesMatch(
  apiName,
  requestedName
) {

  if (
    !apiName ||
    !requestedName
  ) {

    return false;

  }


  if (
    apiName === requestedName
  ) {

    return true;

  }


  if (
    apiName.includes(
      requestedName
    )
  ) {

    return true;

  }


  if (
    requestedName.includes(
      apiName
    )
  ) {

    return true;

  }


  const apiTokens =
    apiName.split(" ");


  const requestedTokens =
    requestedName.split(" ");


  const common =
    requestedTokens.filter(
      token =>
        token.length >= 3 &&
        apiTokens.includes(
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

const footballDataProvider =
  new FootballDataProvider();


registerProvider(
  footballDataProvider
);


export default footballDataProvider;
