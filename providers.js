import {
  DataProvider,
  registerProvider
} from "./providers.js";


// =====================================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// =====================================================

class FootballDataProvider extends DataProvider {

  constructor() {

    super("Football-Data.org");

    this.baseUrl =
      "https://api.football-data.org/v4";

  }


  // ===================================================
  // GET MATCH DATA
  // ===================================================

  async getMatchData(
    home,
    away,
    env
  ) {

    // -------------------------------------------------
    // CHECK TOKEN
    // -------------------------------------------------

    const token =
      env?.FOOTBALL_DATA_TOKEN;

    if (!token) {

      return {

        provider:
          this.name,

        status:
          "configuration_error",

        message:
          "FOOTBALL_DATA_TOKEN غير موجود في Environment Variables.",

        data:
          null

      };

    }


    // -------------------------------------------------
    // NORMALIZE TEAM NAMES
    // -------------------------------------------------

    const normalize =
      value =>

        String(value || "")
          .toLowerCase()
          .replace(
            /[^a-z0-9\u0600-\u06ff]+/gi,
            " "
          )
          .trim();


    const homeNormalized =
      normalize(home);


    const awayNormalized =
      normalize(away);


    // -------------------------------------------------
    // DATE RANGE
    // -------------------------------------------------
    //
    // نستخدم نطاقًا صغيرًا بدل النطاق الضخم السابق.
    //
    // Football-Data.org يدعم dateFrom + dateTo
    // على /v4/matches.
    //
    // -------------------------------------------------

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


    // -------------------------------------------------
    // BUILD URL
    // -------------------------------------------------

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


    // -------------------------------------------------
    // REQUEST
    // -------------------------------------------------

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

        provider:
          this.name,

        status:
          "network_error",

        message:
          error?.message ||
          String(error),

        data:
          null

      };

    }


    // -------------------------------------------------
    // READ RESPONSE
    // -------------------------------------------------

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


    // -------------------------------------------------
    // API ERROR
    // -------------------------------------------------

    if (!response.ok) {

      const apiMessage =
        payload?.message ||
        payload?.error ||
        responseText ||
        "Football-Data.org API error";


      return {

        provider:
          this.name,

        status:
          "api_error",

        message:
          `HTTP ${response.status}: ${apiMessage}`,

        data:
          {

            httpStatus:
              response.status,

            requestUrl:
              url.toString(),

            apiResponse:
              payload

          }

      };

    }


    // -------------------------------------------------
    // EXTRACT MATCHES
    // -------------------------------------------------

    const matches =
      Array.isArray(
        payload?.matches
      )
        ? payload.matches
        : [];


    // -------------------------------------------------
    // FIND REQUESTED MATCH
    // -------------------------------------------------

    const requestedMatch =
      matches.find(
        match => {

          const matchHome =
            normalize(
              match?.homeTeam?.name
            );


          const matchAway =
            normalize(
              match?.awayTeam?.name
            );


          const homeMatches =
            matchHome ===
              homeNormalized ||
            matchHome.includes(
              homeNormalized
            ) ||
            homeNormalized.includes(
              matchHome
            );


          const awayMatches =
            matchAway ===
              awayNormalized ||
            matchAway.includes(
              awayNormalized
            ) ||
            awayNormalized.includes(
              matchAway
            );


          return (
            homeMatches &&
            awayMatches
          );

        }
      );


    // -------------------------------------------------
    // MATCH NOT FOUND
    // -------------------------------------------------

    if (!requestedMatch) {

      return {

        provider:
          this.name,

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


    // -------------------------------------------------
    // MATCH FOUND
    // -------------------------------------------------

    return {

      provider:
        this.name,

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


// =====================================================
// CREATE PROVIDER
// =====================================================

const footballDataProvider =
  new FootballDataProvider();


// =====================================================
// REGISTER PROVIDER
// =====================================================

registerProvider(
  footballDataProvider
);


// =====================================================
// EXPORT
// =====================================================

export default footballDataProvider;
