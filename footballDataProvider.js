// ==========================================
// Y.C.B FOOTBALL-DATA.ORG PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE =
  "https://api.football-data.org/v4";


// ==========================================
// FOOTBALL-DATA.ORG PROVIDER
// ==========================================

class FootballDataProvider extends DataProvider {

  constructor() {

    super("Football-Data.org");

  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(
    home,
    away,
    env
  ) {

    // --------------------------------------
    // CHECK ENVIRONMENT
    // --------------------------------------

    if (!env) {

      return {

        provider:
          this.name,

        status:
          "environment_missing",

        home,
        away,

        data:
          null,

        message:
          "Worker environment is missing"

      };

    }


    // --------------------------------------
    // CHECK TOKEN
    // --------------------------------------

    const token =
      String(
        env.FOOTBALL_DATA_TOKEN || ""
      ).trim();


    if (!token) {

      return {

        provider:
          this.name,

        status:
          "not_configured",

        home,
        away,

        data:
          null,

        message:
          "FOOTBALL_DATA_TOKEN is missing"

      };

    }


    // ======================================
    // REQUEST HELPER
    // ======================================

    const requestAPI =
      async (
        path
      ) => {

        const response =
          await fetch(
            `${API_BASE}${path}`,
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


        const text =
          await response.text();


        let json =
          null;


        try {

          json =
            JSON.parse(
              text
            );

        } catch (_) {

          json =
            null;

        }


        return {

          response,
          text,
          json

        };

      };


    // ======================================
    // STEP 1
    // GET TEAMS
    // ======================================

    let teamsResponse;


    try {

      teamsResponse =
        await requestAPI(
          "/teams?limit=500"
        );

    } catch (error) {

      return {

        provider:
          this.name,

        status:
          "network_error",

        home,
        away,

        data:
          null,

        message:
          error?.message ||
          String(error)

      };

    }


    // ======================================
    // CHECK TEAMS RESPONSE
    // ======================================

    if (
      !teamsResponse.response.ok
    ) {

      return {

        provider:
          this.name,

        status:
          getHTTPStatus(
            teamsResponse.response.status
          ),

        httpStatus:
          teamsResponse.response.status,

        home,
        away,

        data: {

          endpoint:
            `${API_BASE}/teams?limit=500`,

          apiResponse:
            teamsResponse.json ||
            teamsResponse.text

        },

        message:
          buildAPIErrorMessage(
            teamsResponse.response.status,
            teamsResponse.json,
            teamsResponse.text
          )

      };

    }


    // ======================================
    // EXTRACT TEAMS
    // ======================================

    const teams =
      Array.isArray(
        teamsResponse.json?.teams
      )
        ? teamsResponse.json.teams
        : [];


    // ======================================
    // FIND HOME TEAM
    // ======================================

    const homeTeam =
      findTeam(
        teams,
        home
      );


    // ======================================
    // FIND AWAY TEAM
    // ======================================

    const awayTeam =
      findTeam(
        teams,
        away
      );


    // ======================================
    // HOME TEAM NOT FOUND
    // ======================================

    if (!homeTeam) {

      return {

        provider:
          this.name,

        status:
          "home_team_not_found",

        home,
        away,

        data: {

          teamsChecked:
            teams.length,

          requestedHome:
            home

        },

        message:
          `Home team not found: ${home}`

      };

    }


    // ======================================
    // AWAY TEAM NOT FOUND
    // ======================================

    if (!awayTeam) {

      return {

        provider:
          this.name,

        status:
          "away_team_not_found",

        home,
        away,

        data: {

          teamsChecked:
            teams.length,

          requestedAway:
            away

        },

        message:
          `Away team not found: ${away}`

      };

    }


    // ======================================
    // STEP 2
    // GET HOME TEAM MATCHES
    // ======================================

    let matchesResponse;


    try {

      matchesResponse =
        await requestAPI(
          `/teams/${homeTeam.id}/matches?limit=500`
        );

    } catch (error) {

      return {

        provider:
          this.name,

        status:
          "network_error",

        home,
        away,

        data:
          null,

        message:
          error?.message ||
          String(error)

      };

    }


    // ======================================
    // CHECK MATCH RESPONSE
    // ======================================

    if (
      !matchesResponse.response.ok
    ) {

      return {

        provider:
          this.name,

        status:
          getHTTPStatus(
            matchesResponse.response.status
          ),

        httpStatus:
          matchesResponse.response.status,

        home,
        away,

        data: {

          endpoint:
            `${API_BASE}/teams/${homeTeam.id}/matches?limit=500`,

          homeTeamId:
            homeTeam.id,

          apiResponse:
            matchesResponse.json ||
            matchesResponse.text

        },

        message:
          buildAPIErrorMessage(
            matchesResponse.response.status,
            matchesResponse.json,
            matchesResponse.text
          )

      };

    }


    // ======================================
    // EXTRACT MATCHES
    // ======================================

    const matches =
      Array.isArray(
        matchesResponse.json?.matches
      )
        ? matchesResponse.json.matches
        : [];


    // ======================================
    // FIND REQUESTED MATCH
    // ======================================

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


          const requestedHome =
            normalizeName(
              home
            );


          const requestedAway =
            normalizeName(
              away
            );


          return (

            namesMatch(
              apiHome,
              requestedHome
            )

            &&

            namesMatch(
              apiAway,
              requestedAway
            )

          );

        }
      );


    // ======================================
    // MATCH NOT FOUND
    // ======================================

    if (!match) {

      return {

        provider:
          this.name,

        status:
          "api_ok_no_match",

        httpStatus:
          matchesResponse.response.status,

        home,
        away,

        data: {

          homeTeam: {

            id:
              homeTeam.id,

            name:
              homeTeam.name,

            shortName:
              homeTeam.shortName,

            tla:
              homeTeam.tla

          },

          awayTeam: {

            id:
              awayTeam.id,

            name:
              awayTeam.name,

            shortName:
              awayTeam.shortName,

            tla:
              awayTeam.tla

          },

          matchesChecked:
            matches.length,

          filters:
            matchesResponse.json?.filters ||
            null

        },

        message:
          "Football-Data.org connection works, but the requested match was not found in the available team matches."

      };

    }


    // ======================================
    // MATCH FOUND
    // ======================================

    return {

      provider:
        this.name,

      status:
        "success",

      httpStatus:
        matchesResponse.response.status,

      home,
      away,

      data: {

        id:
          match.id ||
          null,

        utcDate:
          match.utcDate ||
          null,

        status:
          match.status ||
          null,

        minute:
          match.minute ||
          null,

        injuryTime:
          match.injuryTime ||
          null,

        venue:
          match.venue ||
          null,

        stage:
          match.stage ||
          null,

        group:
          match.group ||
          null,

        matchday:
          match.matchday ||
          null,


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


        season: {

          id:
            match.season?.id ||
            null,

          startDate:
            match.season?.startDate ||
            null,

          endDate:
            match.season?.endDate ||
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


// ==========================================
// FIND TEAM
// ==========================================

function findTeam(
  teams,
  requestedName
) {

  const searchName =
    normalizeName(
      requestedName
    );


  if (!searchName) {

    return null;

  }


  // ----------------------------------------
  // EXACT MATCH
  // ----------------------------------------

  const exact =
    teams.find(
      team => {

        const names = [

          team?.name,

          team?.shortName,

          team?.tla

        ];


        return names.some(
          name =>
            normalizeName(
              name
            ) === searchName
        );

      }
    );


  if (exact) {

    return exact;

  }


  // ----------------------------------------
  // PARTIAL MATCH
  // ----------------------------------------

  const partial =
    teams.find(
      team => {

        const names = [

          team?.name,

          team?.shortName

        ];


        return names.some(
          name => {

            const normalized =
              normalizeName(
                name
              );


            return (

              normalized.includes(
                searchName
              )

              ||

              searchName.includes(
                normalized
              )

            );

          }
        );

      }
    );


  return partial || null;

}


// ==========================================
// NORMALIZE TEAM NAME
// ==========================================

function normalizeName(
  name
) {

  return String(
    name || ""
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


// ==========================================
// COMPARE TEAM NAMES
// ==========================================

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
    apiName.includes(
      searchName
    )
  ) {

    return true;

  }


  if (
    searchName.includes(
      apiName
    )
  ) {

    return true;

  }


  const apiTokens =
    apiName.split(
      " "
    );


  const searchTokens =
    searchName.split(
      " "
    );


  const common =
    searchTokens.filter(
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
// HTTP STATUS
// ==========================================

function getHTTPStatus(
  status
) {

  if (
    status === 400
  ) {

    return "bad_request";

  }


  if (
    status === 401
  ) {

    return "unauthorized";

  }


  if (
    status === 403
  ) {

    return "forbidden";

  }


  if (
    status === 
