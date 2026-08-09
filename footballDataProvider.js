import {
  DataProvider,
  registerProvider
} from "./providers.js";

const API_BASE =
  "https://api.football-data.org/v4";

class FootballDataProvider extends DataProvider {

  constructor() {
    super("Football-Data.org");
  }

  async getMatchData(home, away, env) {

    if (!env) {

      return {
        provider: this.name,
        status: "environment_missing",
        home,
        away,
        data: null,
        message: "Worker environment is missing"
      };

    }

    const token =
      String(
        env.FOOTBALL_DATA_TOKEN || ""
      ).trim();

    if (!token) {

      return {
        provider: this.name,
        status: "not_configured",
        home,
        away,
        data: null,
        message:
          "FOOTBALL_DATA_TOKEN is missing"
      };

    }

    const today =
      new Date();

    const startDate =
      new Date(today);

    startDate.setUTCDate(
      startDate.getUTCDate() - 30
    );

    const endDate =
      new Date(today);

    endDate.setUTCDate(
      endDate.getUTCDate() + 365
    );

    const dateFrom =
      formatDate(startDate);

    const dateTo =
      formatDate(endDate);

    const apiUrl =
      new URL(
        `${API_BASE}/matches`
      );

    apiUrl.searchParams.set(
      "dateFrom",
      dateFrom
    );

    apiUrl.searchParams.set(
      "dateTo",
      dateTo
    );

    apiUrl.searchParams.set(
      "limit",
      "500"
    );

    let response;

    try {

      response =
        await fetch(
          apiUrl.toString(),
          {
            method: "GET",

            headers: {
              "X-Auth-Token": token,
              "Accept": "application/json"
            }
          }
        );

    } catch (error) {

      return {
        provider: this.name,
        status: "network_error",
        home,
        away,
        data: null,
        message:
          error?.message ||
          String(error)
      };

    }

    const responseText =
      await response.text();

    let parsed = null;

    try {

      parsed =
        JSON.parse(
          responseText
        );

    } catch (_) {

      parsed = null;

    }

    if (!response.ok) {

      let apiMessage =
        parsed?.message ||
        parsed?.error ||
        responseText ||
        "Unknown API error";

      let status =
        "api_error";

      if (response.status === 400) {
        status = "bad_request";
      }

      if (response.status === 401) {
        status = "unauthorized";
      }

      if (response.status === 403) {
        status = "forbidden";
      }

      if (response.status === 404) {
        status = "not_found";
      }

      if (response.status === 429) {
        status = "rate_limited";
      }

      return {

        provider:
          this.name,

        status:
          status,

        httpStatus:
          response.status,

        home,
        away,

        data: {

          endpoint:
            apiUrl.toString(),

          dateFrom:
            dateFrom,

          dateTo:
            dateTo,

          apiResponse:
            parsed || responseText

        },

        message:
          `Football-Data.org HTTP ${response.status}: ${apiMessage}`

      };

    }

    if (!parsed) {

      return {

        provider:
          this.name,

        status:
          "invalid_json",

        httpStatus:
          response.status,

        home,
        away,

        data: null,

        message:
          "Football-Data.org returned invalid JSON"

      };

    }

    const matches =
      Array.isArray(
        parsed.matches
      )
        ? parsed.matches
        : [];

    const homeSearch =
      normalizeName(home);

    const awaySearch =
      normalizeName(away);

    const match =
      matches.find(
        item => {

          const apiHome =
            normalizeName(
              item?.homeTeam?.name ||
              item?.homeTeam?.shortName ||
              item?.homeTeam?.tla ||
              ""
            );

          const apiAway =
            normalizeName(
              item?.awayTeam?.name ||
              item?.awayTeam?.shortName ||
              item?.awayTeam?.tla ||
              ""
            );

          return (
            namesMatch(
              apiHome,
              homeSearch
            )
            &&
            namesMatch(
              apiAway,
              awaySearch
            )
          );

        }
      );

    if (!match) {

      return {

        provider:
          this.name,

        status:
          "api_ok_no_match",

        httpStatus:
          response.status,

        home,
        away,

        data: {

          matchesChecked:
            matches.length,

          dateFrom:
            dateFrom,

          dateTo:
            dateTo,

          competitions:
            [
              ...new Set(
                matches
                  .map(
                    m =>
                      m?.competition?.code
                  )
                  .filter(Boolean)
              )
            ]

        },

        message:
          "API connection works, but requested match was not found"

      };

    }

    return {

      provider:
        this.name,

      status:
        "success",

      httpStatus:
        response.status,

      home,
      away,

      data: {

        id:
          match.id || null,

        utcDate:
          match.utcDate || null,

        status:
          match.status || null,

        competition: {

          id:
            match.competition?.id ||
            null,

          name:
            match.competition?.name ||
            null,

          code:
            match.competition?.code ||
            null

        },

        homeTeam: {

          id:
            match.homeTeam?.id ||
            null,

          name:
            match.homeTeam?.name ||
            null,

          shortName:
            match.homeTeam?.shortName ||
            null,

          tla:
            match.homeTeam?.tla ||
            null

        },

        awayTeam: {

          id:
            match.awayTeam?.id ||
            null,

          name:
            match.awayTeam?.name ||
            null,

          shortName:
            match.awayTeam?.shortName ||
            null,

          tla:
            match.awayTeam?.tla ||
            null

        },

        score:
          match.score ||
          null,

        odds:
          match.odds ||
          null

      },

      message:
        "Match data received successfully"

    };

  }

}


function normalizeName(name) {

  return String(
    name || ""
  )
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

}


function namesMatch(
  apiName,
  searchName
) {

  if (
    !apiName ||
    !searchName
  ) {

    return false;

  }

  if (
    apiName === searchName
  ) {

    return true;

  }

  if (
    apiName.includes(searchName)
  ) {

    return true;

  }

  if (
    searchName.includes(apiName)
  ) {

    return true;

  }

  const apiTokens =
    apiName.split(" ");

  const searchTokens =
    searchName.split(" ");

  const common =
    searchTokens.filter(
      token =>
        token.length >= 3 &&
        apiTokens.includes(token)
    );

  return common.length > 0;

}


function formatDate(date) {

  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


const footballDataProvider =
  new FootballDataProvider();

registerProvider(
  footballDataProvider
);

export default footballDataProvider;
