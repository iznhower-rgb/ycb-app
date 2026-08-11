// ==========================================================
// Y.C.B DATABASE CORE 3.1.0
// ==========================================================
//
// File:
//   db.js
//
// Purpose:
//   Central in-memory database layer for Y.C.B.
//
// Compatible with:
//   - providers.js 3.1.0
//   - providerRunner.js
//   - worker.js
//   - prediction engine
//
// IMPORTANT:
//   This module does NOT depend on BSD, TheSportsDB,
//   SofaScore, or any external API.
//
// ==========================================================


const database = {

  matches: new Map(),

  providerData: new Map(),

  predictions: new Map(),

  history: [],

  metadata: {

    version:
      "3.1.0",

    createdAt:
      new Date().toISOString()

  }

};


// ==========================================================
// INTERNAL HELPERS
// ==========================================================

function cleanId(
  value
) {

  return String(
    value ?? ""
  ).trim();

}


function now() {

  return new Date()
    .toISOString();

}


function clone(
  value
) {

  if (
    value === undefined
  ) {

    return undefined;

  }


  return JSON.parse(
    JSON.stringify(
      value
    )
  );

}


function createMatchKey(
  home,
  away,
  date = ""
) {

  return [

    cleanId(home),

    cleanId(away),

    cleanId(date)

  ]

    .join("::")

    .toLowerCase();

}


// ==========================================================
// MATCHES
// ==========================================================

export function saveMatch(
  match
) {

  if (
    !match ||
    typeof match !== "object"
  ) {

    throw new Error(
      "saveMatch(): match must be an object"
    );

  }


  const home =
    match?.homeTeam?.name ||
    match?.home ||
    match?.homeTeam ||
    "";


  const away =
    match?.awayTeam?.name ||
    match?.away ||
    match?.awayTeam ||
    "";


  const date =
    match?.utcDate ||
    match?.date ||
    "";


  const id =
    cleanId(
      match?.id
    ) ||
    createMatchKey(
      home,
      away,
      date
    );


  const record = {

    ...clone(match),

    id,

    updatedAt:
      now()

  };


  database.matches.set(
    id,
    record
  );


  return clone(
    record
  );

}


// ==========================================================
// GET MATCH
// ==========================================================

export function getMatch(
  id
) {

  const key =
    cleanId(
      id
    );


  if (
    !key
  ) {

    return null;

  }


  return clone(
    database.matches.get(
      key
    ) ||
    null
  );

}


// ==========================================================
// FIND MATCH
// ==========================================================

export function findMatch(
  home,
  away,
  date = ""
) {

  const key =
    createMatchKey(
      home,
      away,
      date
    );


  const direct =
    database.matches.get(
      key
    );


  if (
    direct
  ) {

    return clone(
      direct
    );

  }


  for (
    const match
    of database.matches.values()
  ) {

    const matchHome =
      String(
        match?.homeTeam?.name ||
        match?.home ||
        ""
      )
        .trim()
        .toLowerCase();


    const matchAway =
      String(
        match?.awayTeam?.name ||
        match?.away ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      matchHome ===
        String(home)
          .trim()
          .toLowerCase()

      &&

      matchAway ===
        String(away)
          .trim()
          .toLowerCase()
    ) {

      return clone(
        match
      );

    }

  }


  return null;

}


// ==========================================================
// DELETE MATCH
// ==========================================================

export function deleteMatch(
  id
) {

  return database.matches.delete(
    cleanId(
      id
    )
  );

}


// ==========================================================
// LIST MATCHES
// ==========================================================

export function getMatches() {

  return Array.from(
    database.matches.values()
  ).map(
    clone
  );

}


// ==========================================================
// PROVIDER DATA
// ==========================================================

export function saveProviderData(
  matchId,
  provider,
  data
) {

  const id =
    cleanId(
      matchId
    );


  const providerName =
    cleanId(
      provider
    );


  if (
    !id ||
    !providerName
  ) {

    throw new Error(
      "saveProviderData(): matchId and provider are required"
    );

  }


  if (
    !database.providerData.has(
      id
    )
  ) {

    database.providerData.set(
      id,
      new Map()
    );

  }


  const providers =
    database.providerData.get(
      id
    );


  providers.set(
    providerName,
    {

      provider:
        providerName,

      data:
        clone(data),

      updatedAt:
        now()

    }
  );


  return getProviderData(
    id,
    providerName
  );

}


// ==========================================================
// GET PROVIDER DATA
// ==========================================================

export function getProviderData(
  matchId,
  provider
) {

  const id =
    cleanId(
      matchId
    );


  const providerName =
    cleanId(
      provider
    );


  const providers =
    database.providerData.get(
      id
    );


  if (
    !providers
  ) {

    return null;

  }


  return clone(
    providers.get(
      providerName
    ) ||
    null
  );

}


// ==========================================================
// GET ALL PROVIDER DATA
// ==========================================================

export function getAllProviderData(
  matchId
) {

  const id =
    cleanId(
      matchId
    );


  const providers =
    database.providerData.get(
      id
    );


  if (
    !providers
  ) {

    return {};

  }


  const result = {};


  for (
    const [
      name,
      value
    ]
    of providers.entries()
  ) {

    result[name] =
      clone(
        value
      );

  }


  return result;

}


// ==========================================================
// HISTORY
// ==========================================================

export function saveHistory(
  entry
) {

  if (
    !entry ||
    typeof entry !==
      "object"
  ) {

    return null;

  }


  const record = {

    ...clone(entry),

    timestamp:
      entry.timestamp ||
      now()

  };


  database.history.push(
    record
  );


  return clone(
    record
  );

}


// ==========================================================
// GET HISTORY
// ==========================================================

export function getHistory(
  limit = 100
) {

  const count =
    Number(
      limit
    );


  const safeLimit =
    Number.isFinite(
      count
    ) && count > 0

      ? Math.floor(
          count
        )

      : 100;


  return database.history
    .slice(
      -safeLimit
    )
    .map(
      clone
    );

}


// ==========================================================
// PREDICTIONS
// ==========================================================

export function savePrediction(
  matchId,
  prediction
) {

  const id =
    cleanId(
      matchId
    );


  if (
    !id
  ) {

    throw new Error(
      "savePrediction(): matchId is required"
    );

  }


  const record = {

    matchId:
      id,

    prediction:
      clone(
        prediction
      ),

    updatedAt:
      now()

  };


  database.predictions.set(
    id,
    record
  );


  return clone(
    record
  );

}


// ==========================================================
// GET PREDICTION
// ==========================================================

export function getPrediction(
  matchId
) {

  return clone(
    database.predictions.get(
      cleanId(
        matchId
      )
    ) ||
    null
  );

}


// ==========================================================
// GET ALL PREDICTIONS
// ==========================================================

export function getPredictions() {

  return Array.from(
    database.predictions.values()
  ).map(
    clone
  );

}


// ==========================================================
// DATABASE STATS
// ==========================================================

export function getDatabaseStats() {

  return {

    version:
      database.metadata.version,

    matches:
      database.matches.size,

    providerMatches:
      database.providerData.size,

    predictions:
      database.predictions.size,

    history:
      database.history.length,

    createdAt:
      database.metadata.createdAt

  };

}


// ==========================================================
// CLEAR
// ==========================================================

export function clearDatabase() {

  database.matches.clear();

  database.providerData.clear();

  database.predictions.clear();

  database.history.length =
    0;

}


// ==========================================================
// RESET
// ==========================================================

export function resetDatabase() {

  clearDatabase();

  database.metadata.createdAt =
    now();

}


// ==========================================================
// DEFAULT EXPORT
// ==========================================================

export default {

  saveMatch,

  getMatch,

  findMatch,

  deleteMatch,

  getMatches,

  saveProviderData,

  getProviderData,

  getAllProviderData,

  saveHistory,

  getHistory,

  savePrediction,

  getPrediction,

  getPredictions,

  getDatabaseStats,

  clearDatabase,

  resetDatabase

};


// ==========================================================
// END db.js
// ==========================================================
