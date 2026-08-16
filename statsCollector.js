// ==========================================================
// Y.C.B STATS COLLECTOR 4.2.0
// ==========================================================
// مسؤول عن:
//
// 1. دمج بيانات جميع Providers.
// 2. إزالة المباريات المكررة.
// 3. توحيد أسماء الفرق.
// 4. استخراج مباريات كل فريق.
// 5. حساب:
//      games
//      wins
//      draws
//      losses
//      goals for
//      goals against
//      averages
//      form
// 6. بناء نموذج xG.
// 7. بناء نموذج Poisson.
// 8. إنشاء التوقعات.
//
// مهم:
// هذا الملف لا يقوم بأي HTTP requests.
// الـProviders تجمع البيانات.
// هذا الملف ينظف ويحلل البيانات فقط.
// ==========================================================


// ==========================================================
// VERSION
// ==========================================================

export const STATS_COLLECTOR_VERSION =
  "4.2.0";


// ==========================================================
// LIMITS
// ==========================================================

const MAX_RECENT_MATCHES =
  15;

const POISSON_MAX_GOALS =
  8;


// ==========================================================
// MERGE PROVIDER DATA
// ==========================================================

export function mergeProviderData(
  providerResults
){

  const results =
    Array.isArray(
      providerResults
    )
      ? providerResults
      : [];


  let fixture =
    null;


  const fixtures =
    [];


  const homeMatches =
    [];


  const awayMatches =
    [];


  const allMatches =
    [];


  const providerStats =
    [];


  for(
    const item
    of results
  ){

    if(
      !item ||
      typeof item !==
        "object"
    ){

      continue;

    }


    const data =
      item.data &&
      typeof item.data ===
        "object"

        ? item.data

        : {};


    const providerName =
      String(
        item.provider ||
        "Unknown"
      );


    const providerHome =
      Array.isArray(
        data.recentMatches?.home
      )

        ? data.recentMatches.home

        : [];


    const providerAway =
      Array.isArray(
        data.recentMatches?.away
      )

        ? data.recentMatches.away

        : [];


    /* ======================================================
       FIXTURE
    ====================================================== */

    if(
      data.fixture &&
      typeof data.fixture ===
        "object"
    ){

      fixtures.push({

        provider:
          providerName,

        fixture:
          data.fixture

      });


      if(
        !fixture
      ){

        fixture =
          data.fixture;

      }

    }


    /* ======================================================
       HISTORY
    ====================================================== */

    homeMatches.push(
      ...providerHome
    );


    awayMatches.push(
      ...providerAway
    );


    allMatches.push(
      ...providerHome,
      ...providerAway
    );


    providerStats.push({

      provider:
        providerName,

      homeMatches:
        providerHome.length,

      awayMatches:
        providerAway.length,

      totalMatches:
        providerHome.length +
        providerAway.length,

      fixture:
        Boolean(
          data.fixture
        )

    });

  }


  return {

    fixture,

    fixtures,

    homeMatches:
      dedupeMatches(
        homeMatches
      ),

    awayMatches:
      dedupeMatches(
        awayMatches
      ),

    allMatches:
      dedupeMatches(
        allMatches
      ),

    providerStats

  };

}


// ==========================================================
// DEDUPE MATCHES
// ==========================================================

export function dedupeMatches(
  matches
){

  if(
    !Array.isArray(
      matches
    )
  ){

    return [];

  }


  const seen =
    new Set();


  const output =
    [];


  for(
    const match
    of matches
  ){

    if(
      !match ||
      typeof match !==
        "object"
    ){

      continue;

    }


    const key =
      createMatchKey(
        match
      );


    if(
      seen.has(
        key
      )
    ){

      continue;

    }


    seen.add(
      key
    );


    output.push(
      match
    );

  }


  output.sort(
    compareMatchesByDate
  );


  return output.slice(
    0,
    MAX_RECENT_MATCHES
  );

}


// ==========================================================
// CREATE MATCH KEY
// ==========================================================

function createMatchKey(
  match
){

  const id =
    match.id ??
    match.fixtureId ??
    match.eventId ??
    match.matchId;


  if(
    id !==
      undefined &&
    id !==
      null &&
    String(id).trim()
  ){

    return (
      "id:" +
      String(id).trim()
    );

  }


  const date =
    normalizeDateKey(
      match.utcDate ||
      match.date ||
      match.startTime ||
      match.start_time
    );


  const home =
    normalizeName(
      getTeamName(
        match.homeTeam
      )
    );


  const away =
    normalizeName(
      getTeamName(
        match.awayTeam
      )
    );


  const homeScore =
    extractScore(
      match,
      "home"
    );


  const awayScore =
    extractScore(
      match,
      "away"
    );


  return [

    "match",

    date,

    home,

    away,

    homeScore,

    awayScore

  ].join(
    "|"
  );

}


// ==========================================================
// DATE KEY
// ==========================================================

function normalizeDateKey(
  value
){

  if(
    !value
  ){

    return "";

  }


  const timestamp =
    Date.parse(
      String(value)
    );


  if(
    !Number.isFinite(
      timestamp
    )
  ){

    return String(
      value
    )
      .trim()
      .toLowerCase();

  }


  return new Date(
    timestamp
  )
    .toISOString()
    .slice(
      0,
      16
    );

}


// ==========================================================
// SORT MATCHES
// ==========================================================

function compareMatchesByDate(
  a,
  b
){

  const da =
    Date.parse(
      a?.utcDate ||
      a?.date ||
      a?.startTime ||
      ""
    );


  const db =
    Date.parse(
      b?.utcDate ||
      b?.date ||
      b?.startTime ||
      ""
    );


  const ta =
    Number.isFinite(
      da
    )
      ? da
      : 0;


  const tb =
    Number.isFinite(
      db
    )
      ? db
      : 0;


  return tb - ta;

}


// ==========================================================
// BUILD TEAM ANALYSIS
// ==========================================================

export function buildTeamAnalysis(
  homeName,
  awayName,
  merged
){

  const safeMerged =
    merged &&
    typeof merged ===
      "object"

      ? merged

      : {

          homeMatches: [],

          awayMatches: [],

          fixture: null

        };


  const homeMatches =
    Array.isArray(
      safeMerged.homeMatches
    )

      ? safeMerged.homeMatches

      : [];


  const awayMatches =
    Array.isArray(
      safeMerged.awayMatches
    )

      ? safeMerged.awayMatches

      : [];


  const home =
    calculateTeamStats(
      homeName,
      homeMatches
    );


  const away =
    calculateTeamStats(
      awayName,
      awayMatches
    );


  /* ========================================================
     xG
  ======================================================== */

  const homeXg =
    clamp(

      (

        home.goalsForAvg *
        0.55

        +

        away.goalsAgainstAvg *
        0.45

      )

      *

      1.08,

      0.15,

      4.00

    );


  const awayXg =
    clamp(

      (

        away.goalsForAvg *
        0.55

        +

        home.goalsAgainstAvg *
        0.45

      )

      *

      0.92,

      0.10,

      3.50

    );


  const model =
    buildModel(
      homeXg,
      awayXg
    );


  return {

    home,

    away,

    model

  };

}


// ==========================================================
// CALCULATE TEAM STATS
// ==========================================================

export function calculateTeamStats(
  teamName,
  matches
){

  const normalizedTeam =
    normalizeName(
      teamName
    );


  const source =
    Array.isArray(
      matches
    )
      ? matches
      : [];


  const usable =
    [];


  for(
    const match
    of source
  ){

    const parsed =
      parseTeamMatch(
        normalizedTeam,
        match
      );


    if(
      parsed
    ){

      usable.push(
        parsed
      );

    }

  }


  /* ========================================================
     آخر 5
  ======================================================== */

  const last5 =
    usable.slice(
      0,
      5
    );


  /* ========================================================
     آخر 10
  ======================================================== */

  const last10 =
    usable.slice(
      0,
      10
    );


  const goalsFor5 =
    average(
      last5,
      "gf"
    );


  const goalsFor10 =
    average(
      last10,
      "gf"
    );


  const goalsAgainst5 =
    average(
      last5,
      "ga"
    );


  const goalsAgainst10 =
    average(
      last10,
      "ga"
    );


  /* ========================================================
     RESULTS
  ======================================================== */

  const wins =
    usable.filter(
      item =>
        item.result ===
        "W"
    ).length;


  const draws =
    usable.filter(
      item =>
        item.result ===
        "D"
    ).length;


  const losses =
    usable.filter(
      item =>
        item.result ===
        "L"
    ).length;


  const formPoints =
    wins * 3 +
    draws;


  const maxPoints =
    usable.length *
    3;


  const formRate =
    maxPoints > 0

      ? formPoints /
        maxPoints

      : 0;


  /* ========================================================
     CLEAN WEIGHTED AVERAGES
  ======================================================== */

  const goalsForAvg =
    last5.length > 0

      ? (
          goalsFor5 *
          0.60

          +

          goalsFor10 *
          0.40
        )

      : goalsFor10;


  const goalsAgainstAvg =
    last5.length > 0

      ? (
          goalsAgainst5 *
          0.60

          +

          goalsAgainst10 *
          0.40
        )

      : goalsAgainst10;


  /* ========================================================
     CLEAN SHEETS
  ======================================================== */

  const cleanSheets =
    usable.filter(
      item =>
        item.ga ===
        0
    ).length;


  const failedToScore =
    usable.filter(
      item =>
        item.gf ===
        0
    ).length;


  /* ========================================================
     BTTS
  ======================================================== */

  const btts =
    usable.filter(
      item =>
        item.gf > 0 &&
        item.ga > 0
    ).length;


  /* ========================================================
     GOALS
  ======================================================== */

  const totalGoals =
    usable.reduce(

      (
        sum,
        item
      ) =>

        sum +
        item.gf +
        item.ga,

      0

    );


  const totalGoalsAvg =
    usable.length > 0

      ? totalGoals /
        usable.length

      : 0;


  return {

    team:
      teamName,

    normalizedTeam,

    games:
      usable.length,

    wins,

    draws,

    losses,

    formPoints,

    formRate:
      round(
        formRate
      ),

    goalsFor:
      usable.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.gf,

        0
      ),

    goalsAgainst:
      usable.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.ga,

        0
      ),

    goalsForAvg:
      round(
        goalsForAvg
      ),

    goalsAgainstAvg:
      round(
        goalsAgainstAvg
      ),

    cleanSheets,

    failedToScore,

    btts,

    bttsRate:
      round(
        usable.length > 0
          ? btts /
            usable.length
          : 0
      ),

    cleanSheetRate:
      round(
        usable.length > 0
          ? cleanSheets /
            usable.length
          : 0
      ),

    failedToScoreRate:
      round(
        usable.length > 0
          ? failedToScore /
            usable.length
          : 0
      ),

    totalGoalsAvg:
      round(
        totalGoalsAvg
      ),

    recentMatches:
      usable

  };

}


// ==========================================================
// PARSE TEAM MATCH
// ==========================================================

function parseTeamMatch(
  normalizedTeam,
  match
){

  if(
    !match ||
    typeof match !==
      "object"
  ){

    return null;

  }


  const homeName =
    normalizeName(
      getTeamName(
        match.homeTeam
      )
    );


  const awayName =
    normalizeName(
      getTeamName(
        match.awayTeam
      )
    );


  const isHome =
    namesMatch(
      homeName,
      normalizedTeam
    );


  const isAway =
    namesMatch(
      awayName,
      normalizedTeam
    );


  if(
    !isHome &&
    !isAway
  ){

    return null;

  }


  /*
   * إذا تطابقت تسمية الفريقين بطريقة غريبة
   * نرفض المباراة بدل حسابها مرتين.
   */

  if(
    isHome &&
    isAway
  ){

    return null;

  }


  const homeGoals =
    extractScore(
      match,
      "home"
    );


  const awayGoals =
    extractScore(
      match,
      "away"
    );


  if(
    !Number.isFinite(
      homeGoals
    )

    ||

    !Number.isFinite(
      awayGoals
    )
  ){

    return null;

  }


  const gf =
    isHome
      ? homeGoals
      : awayGoals;


  const ga =
    isHome
      ? awayGoals
      : homeGoals;


  let result;


  if(
    gf >
    ga
  ){

    result =
      "W";

  }

  else if(
    gf <
    ga
  ){

    result =
      "L";

  }

  else{

    result =
      "D";

  }


  return {

    id:
      match.id ??
      match.fixtureId ??
      match.eventId ??
      null,

    utcDate:
      match.utcDate ||
      match.date ||
      match.startTime ||
      null,

    opponent:
      isHome
        ? getTeamName(
            match.awayTeam
          )
        : getTeamName(
            match.homeTeam
          ),

    venue:
      isHome
        ? "home"
        : "away",

    gf,

    ga,

    result,

    totalGoals:
      gf + ga

  };

}


// ==========================================================
// EXTRACT SCORE
// ==========================================================

function extractScore(
  match,
  side
){

  const score =
    match?.score ||
    {};


  const fullTime =
    score.fullTime ||
    score.full_time ||
    {};


  const regular =
    score.regular ||
    {};


  const scores =
    match?.scores ||
    {};


  const sideObject =
    match?.[side] ||
    match?.teams?.[side] ||
    {};


  const candidates =

    side === "home"

      ? [

          fullTime.home,

          regular.home,

          score.home,

          scores.home,

          sideObject.score,

          sideObject.goals,

          match.homeScore,

          match.home_goals,

          match.homeGoals

        ]

      : [

          fullTime.away,

          regular.away,

          score.away,

          scores.away,

          sideObject.score,

          sideObject.goals,

          match.awayScore,

          match.away_goals,

          match.awayGoals

        ];


  for(
    const value
    of candidates
  ){

    const number =
      toScoreNumber(
        value
      );


    if(
      Number.isFinite(
        number
      )
    ){

      return number;

    }

  }


  return NaN;

}


// ==========================================================
// SCORE NUMBER
// ==========================================================

function toScoreNumber(
  value
){

  if(
    typeof value ===
    "number"
  ){

    return Number.isFinite(
      value
    )

      ? value

      : NaN;

  }


  if(
    typeof value ===
    "string"
  ){

    const cleaned =
      value.trim();


    if(
      !cleaned
    ){

      return NaN;

    }


    const number =
      Number(
        cleaned
      );


    if(
      Number.isFinite(
        number
      )
    ){

      return number;

    }


    const match =
      cleaned.match(
        /^\d+/
      );


    if(
      match
    ){

      return Number(
        match[0]
      );

    }

  }


  return NaN;

}


// ==========================================================
// GET TEAM NAME
// ==========================================================

function getTeamName(
  team
){

  if(
    typeof team ===
    "string"
  ){

    return team;

  }


  if(
    !team ||
    typeof team !==
      "object"
  ){

    return "";

  }


  return (

    team.name ||

    team.shortName ||

    team.displayName ||

    team.fullName ||

    team.teamName ||

    team.title ||

    ""

  );

}


// ==========================================================
// NORMALIZE TEAM NAME
// ==========================================================

export function normalizeName(
  value
){

  let name =
    String(
      value ||
      ""
    );


  /*
   * Unicode normalization.
   */

  try{

    name =
      name.normalize(
        "NFD"
      );

  }catch{

    // Ignore unsupported normalization.

  }


  name =
    name
      .toLowerCase()
      .trim();


  /*
   * Arabic diacritics.
   */

  name =
    name.replace(
      /[\u064B-\u065F\u0670]/g,
      ""
    );


  /*
   * Common punctuation.
   */

  name =
    name.replace(
      /[’'`´]/g,
      ""
    );


  name =
    name.replace(
      /&/g,
      " and "
    );


  /*
   * Common club suffixes.
   */

  name =
    name.replace(

      /\b(

        fc|

        cf|

        afc|

        sc|

        ac|

        fk|

        sk|

        as|

        cd|

        ud|

        ca|

        club

      )\b/gi,

      " "

    );


  /*
   * Remove accents.
   */

  name =
    name.replace(
      /[\u0300-\u036f]/g,
      ""
    );


  /*
   * Keep Latin, numbers,
   * Arabic and spaces.
   */

  name =
    name.replace(
      /[^a-z0-9\u0600-\u06ff\s]/gi,
      " "
    );


  /*
   * Normalize whitespace.
   */

  name =
    name.replace(
      /\s+/g,
      " "
    );


  return name.trim();

}


// ==========================================================
// TEAM ALIASES
// ==========================================================

const TEAM_ALIASES = {

  "man united":
    "manchester united",

  "man utd":
    "manchester united",

  "man utd fc":
    "manchester united",

  "man city":
    "manchester city",

  "inter milan":
    "internazionale",

  "inter":
    "internazionale",

  "psv":
    "psv eindhoven",

  "sporting lisbon":
    "sporting cp",

  "sporting":
    "sporting cp",

  "athletic bilbao":
    "athletic club",

  "atletico madrid":
    "atletico de madrid",

  "paris saint germain":
    "paris saint germain",

  "psg":
    "paris saint germain"

};


// ==========================================================
// CANONICAL NAME
// ==========================================================

function canonicalName(
  value
){

  const normalized =
    normalizeName(
      value
    );


  return (

    TEAM_ALIASES[
      normalized
    ]

    ||

    normalized

  );

}


// ==========================================================
// NAME MATCH
// ==========================================================

export function namesMatch(
  first,
  second
){

  const a =
    canonicalName(
      first
    );


  const b =
    canonicalName(
      second
    );


  if(
    !a ||
    !b
  ){

    return false;

  }


  if(
    a === b
  ){

    return true;

  }


  /*
   * Exact token comparison.
   */

  const aTokens =
    tokenSet(
      a
    );


  const bTokens =
    tokenSet(
      b
    );


  if(
    !aTokens.size ||
    !bTokens.size
  ){

    return false;

  }


  /*
   * إذا كان أحد الاسمين اختصارًا واضحًا.
   */

  if(
    aTokens.size === 1 ||
    bTokens.size === 1
  ){

    const short =
      aTokens.size === 1
        ? [...aTokens][0]
        : [...bTokens][0];


    const long =
      aTokens.size === 1
        ? b
        : a;


    if(
      short.length >= 4 &&
      long.includes(
        short
      )
    ){

      return true;

    }

  }


  /*
   * نسبة التداخل.
   */

  let common =
    0;


  for(
    const token
    of aTokens
  ){

    if(
      bTokens.has(
        token
      )
    ){

      common++;

    }

  }


  const minimum =
    Math.min(
      aTokens.size,
      bTokens.size
    );


  if(
    minimum > 0 &&

    common /
      minimum >=
      0.70
  ){

    return true;

  }


  /*
   * أحد الاسمين يحتوي الآخر.
   * نستخدم هذا فقط عندما يكون الاسم
   * طويلًا بما يكفي لمنع التطابقات الخاطئة.
   */

  if(
    a.length >= 6 &&
    b.length >= 6
  ){

    if(
      a.includes(b) ||
      b.includes(a)
    ){

      return true;

    }

  }


  return false;

}


// ==========================================================
// TOKEN SET
// ==========================================================

function tokenSet(
  value
){

  return new Set(

    String(
      value ||
      ""
    )

      .split(
        " "
      )

      .filter(
        token =>
          token.length >= 2
      )

  );

}


// ==========================================================
// AVERAGE
// ==========================================================

function average(
  items,
  key
){

  if(
    !Array.isArray(
      items
    )

    ||

    items.length ===
      0
  ){

    return 0;

  }


  const total =
    items.reduce(

      (
        sum,
        item
      ) =>

        sum +
        (
          Number(
            item?.[key]
          ) || 0
        ),

      0

    );


  return total /
    items.length;

}


// ==========================================================
// BUILD MODEL
// ==========================================================

export function buildModel(
  homeXg,
  awayXg
){

  const safeHomeXg =
    clamp(
      homeXg,
      0.05,
      6
    );


  const safeAwayXg =
    clamp(
      awayXg,
      0.05,
      6
    );


  const matrix =
    poissonMatrix(
      safeHomeXg,
      safeAwayXg,
      POISSON_MAX_GOALS
    );


  let homeWin =
    0;

  let draw =
    0;

  let awayWin =
    0;


  let over25 =
    0;

  let under25 =
    0;


  let over15 =
    0;

  let under15 =
    0;


  let bttsYes =
    0;

  let bttsNo =
    0;


  let best =
    {

      probability:
        -1,

      home:
        0,

      away:
        0

    };


  for(
    let home = 0;
    home < matrix.length;
    home++
  ){

    for(
      let away = 0;
      away < matrix[home].length;
      away++
    ){

      const probability =
        matrix[home][away];


      if(
        probability >
        best.probability
      ){

        best = {

          probability,

          home,

          away

        };

      }


      if(
        home >
        away
      ){

        homeWin +=
          probability;

      }

      else if(
        home ===
        away
      ){

        draw +=
          probability;

      }

      else{

        awayWin +=
          probability;

      }


      const totalGoals =
        home +
        away;


      if(
        totalGoals >=
        3
      ){

        over25 +=
          probability;

      }

      else{

        under25 +=
          probability;

      }


      if(
        totalGoals >=
        2
      ){

        over15 +=
          probability;

      }

      else{

        under15 +=
          probability;

      }


      if(
        home > 0 &&
        away > 0
      ){

        bttsYes +=
          probability;

      }

      else{

        bttsNo +=
          probability;

      }

    }

  }


  return {

    homeXg:
      round(
        safeHomeXg
      ),

    awayXg:
      round(
        safeAwayXg
      ),

    homeWin:
      normalizeProbability(
        homeWin
      ),

    draw:
      normalizeProbability(
        draw
      ),

    awayWin:
      normalizeProbability(
        awayWin
      ),

    over25:
      normalizeProbability(
        over25
      ),

    under25:
      normalizeProbability(
        under25
      ),

    over15:
      normalizeProbability(
        over15
      ),

    under15:
      normalizeProbability(
        under15
      ),

    bttsYes:
      normalizeProbability(
        bttsYes
      ),

    bttsNo:
      normalizeProbability(
        bttsNo
      ),

    bestScore: {

      home:
        best.home,

      away:
        best.away,

      probability:
        normalizeProbability(
          best.probability
        )

    }

  };

}


// ==========================================================
// POISSON MATRIX
// ==========================================================

function poissonMatrix(
  homeLambda,
  awayLambda,
  maxGoals
){

  const homeSeries =
    poissonSeries(
      homeLambda,
      maxGoals
    );


  const awaySeries =
    poissonSeries(
      awayLambda,
      maxGoals
    );


  const matrix =
    [];


  let total =
    0;


  for(
    let h = 0;
    h <= maxGoals;
    h++
  ){

    matrix[h] =
      [];


    for(
      let a = 0;
      a <= maxGoals;
      a++
    ){

      const probability =
        homeSeries[h] *
        awaySeries[a];


      matrix[h][a] =
        probability;


      total +=
        probability;

    }

  }


  /*
   * Normalize because we truncate
   * the Poisson distribution at maxGoals.
   */

  if(
    total <= 0
  ){

    return matrix;

  }


  for(
    let h = 0;
    h < matrix.length;
    h++
  ){

    for(
      let a = 0;
      a < matrix[h].length;
      a++
    ){

      matrix[h][a] /=
        total;

    }

  }


  return matrix;

}


// ==========================================================
// POISSON SERIES
// ==========================================================

function poissonSeries(
  lambda,
  maxGoals
){

  const result =
    [];


  for(
    let goals = 0;
    goals <= maxGoals;
    goals++
  ){

    const value =

      Math.exp(
        -lambda
      )

      *

      Math.pow(
        lambda,
        goals
      )

      /

      factorial(
        goals
      );


    result.push(
      value
    );

  }


  return result;

}


// ==========================================================
// FACTORIAL
// ==========================================================

function factorial(
  n
){

  let result =
    1;


  for(
    let i = 2;
    i <= n;
    i++
  ){

    result *=
      i;

  }


  return result;

}


// ==========================================================
// BUILD PREDICTIONS
// ==========================================================

export function buildPredictions(
  analysis
){

  if(
    !analysis ||
    !analysis.model
  ){

    return {

      predictions: [],

      predictedScore:
        null

    };

  }


  const model =
    analysis.model;


  const home =
    analysis.home?.team ||
    "Home";


  const away =
    analysis.away?.team ||
    "Away";


  const candidates = [

    {

      market:
        "1X2",

      outcome:
        "homeWin",

      label:
        `فوز ${home}`,

      probabilityValue:
        model.homeWin,

      explanation:
        "احتمال فوز صاحب الأرض وفق النموذج."

    },


    {

      market:
        "1X2",

      outcome:
        "draw",

      label:
        "التعادل",

      probabilityValue:
        model.draw,

      explanation:
        "احتمال التعادل وفق النموذج."

    },


    {

      market:
        "1X2",

      outcome:
        "awayWin",

      label:
        `فوز ${away}`,

      probabilityValue:
        model.awayWin,

      explanation:
        "احتمال فوز الفريق الضيف وفق النموذج."

    },


    {

      market:
        "Goals",

      outcome:
        "over25",

      label:
        "أكثر من 2.5 هدف",

      probabilityValue:
        model.over25,

      explanation:
        "احتمال تسجيل 3 أهداف أو أكثر."

    },


    {

      market:
        "Goals",

      outcome:
        "under25",

      label:
        "أقل من 2.5 هدف",

      probabilityValue:
        model.under25,

      explanation:
        "احتمال تسجيل هدفين أو أقل."

    },


    {

      market:
        "BTTS",

      outcome:
        "bttsYes",

      label:
        "كلا الفريقين يسجلان",

      probabilityValue:
        model.bttsYes,

      explanation:
        "احتمال تسجيل كلا الفريقين."

    },


    {

      market:
        "BTTS",

      outcome:
        "bttsNo",

      label:
        "ليس كلا الفريقين يسجلان",

      probabilityValue:
        model.bttsNo,

      explanation:
        "احتمال عدم تسجيل أحد الفريقين."

    }

  ];


  /*
   * لا نريد إظهار ثلاثة خيارات من
   * نفس السوق إذا كان هناك بدائل.
   *
   * نأخذ أفضل خيار من كل سوق أولًا.
   */

  const bestByMarket =
    [];


  const markets =
    [

      "1X2",

      "Goals",

      "BTTS"

    ];


  for(
    const market
    of markets
  ){

    const options =
      candidates.filter(
        item =>
          item.market ===
          market
      );


    const best =
      getBestCandidate(
        options
      );


    if(
      best
    ){

      bestByMarket.push(
        best
      );

    }

  }


  /*
   * ترتيب نهائي حسب الاحتمال.
   */

  bestByMarket.sort(

    (
      a,
      b
    ) =>

      b.probabilityValue -
      a.probabilityValue

  );


  const predictions =
    bestByMarket
      .slice(
        0,
        3
      )
      .map(
        item => ({

          market:
            item.market,

          outcome:
            item.outcome,

          label:
            item.label,

          probabilityValue:
            normalizeProbability(
              item.probabilityValue
            ),

          probability:
            formatProbability(
              item.probabilityValue
            ),

          explanation:
            item.explanation

        })
      );


  return {

    predictions,

    predictedScore:

      model.bestScore

        ? `${model.bestScore.home} - ${model.bestScore.away}`

        : null

  };

}


// ==========================================================
// BEST CANDIDATE
// ==========================================================

function getBestCandidate(
  candidates
){

  if(
    !Array.isArray(
      candidates
    )

    ||

    candidates.length ===
      0
  ){

    return null;

  }


  return candidates.reduce(

    (
      best,
      current
    ) =>

      !best ||

      current.probabilityValue >
      best.probabilityValue

        ? current

        : best,

    null

  );

}


// ==========================================================
// NORMALIZE PROBABILITY
// ==========================================================

function normalizeProbability(
  value
){

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ){

    return 0;

  }


  return clamp(
    number,
    0,
    1
  );

}


// ==========================================================
// FORMAT PROBABILITY
// ==========================================================

function formatProbability(
  value
){

  return (

    normalizeProbability(
      value
    ) *

    100

  ).toFixed(
    2
  )

  +

  "%";

}


// ==========================================================
// DATA QUALITY
// ==========================================================

export function calculateDataQuality(
  analysis,
  providerCount,
  fixtureVerified,
  historyProviders
){

  if(
    !analysis
  ){

    return 0;

  }


  const providers =
    Math.max(
      0,
      Number(
        providerCount
      ) || 0
    );


  const historyCount =
    Math.min(

      Math.min(

        Number(
          analysis.home?.games
        ) || 0,

        Number(
          analysis.away?.games
        ) || 0

      ),

      10

    );


  /*
   * History = 60 points.
   */

  const historyScore =
    (
      historyCount /
      10
    )

    *

    60;


  /*
   * Providers = 20 points.
   */

  const providerScore =
    Math.min(
      providers,
      4
    )

    *

    5;


  /*
   * Fixture = 15.
   */

  const fixtureScore =
    fixtureVerified
      ? 15
      : 0;


  /*
   * Multiple history providers = 5.
   */

  const historyProviderScore =
    Number(
      historyProviders
    ) >= 2

      ? 5

      : 0;


  let score =

    historyScore +

    providerScore +

    fixtureScore +

    historyProviderScore;


  /*
   * Protection:
   *
   * One provider cannot claim
   * 100/100.
   */

  if(
    providers <= 1
  ){

    score =
      Math.min(
        score,
        55
      );

  }

  else if(
    providers === 2
  ){

    score =
      Math.min(
        score,
        80
      );

  }

  else if(
    providers === 3
  ){

    score =
      Math.min(
        score,
        90
      );

  }

  else{

    score =
      Math.min(
        score,
        100
      );

  }


  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );

}


// ==========================================================
// TEAM FORM
// ==========================================================

export function getTeamForm(
  teamName,
  matches,
  limit = 5
){

  const stats =
    calculateTeamStats(
      teamName,
      matches
    );


  return stats.recentMatches
    .slice(
      0,
      Math.max(
        1,
        Number(
          limit
        ) || 5
      )
    )
    .map(
      item => item.result
    );

}


// ==========================================================
// HEAD TO HEAD
// ==========================================================

export function getHeadToHead(
  homeName,
  awayName,
  matches
){

  const home =
    normalizeName(
      homeName
    );


  const away =
    normalizeName(
      awayName
    );


  const source =
    Array.isArray(
      matches
    )
      ? matches
      : [];


  return source
    .filter(
      match => {

        const matchHome =
          normalizeName(
            getTeamName(
              match.homeTeam
            )
          );


        const matchAway =
          normalizeName(
            getTeamName(
              match.awayTeam
            )
          );


        return (

          namesMatch(
            matchHome,
            home
          )

          &&

          namesMatch(
            matchAway,
            away
          )

        )

        ||

        (

          namesMatch(
            matchHome,
            away
          )

          &&

          namesMatch(
            matchAway,
            home
          )

        );

      }
    )
    .sort(
      compareMatchesByDate
    );

}


// ==========================================================
// DATA VALIDATION
// ==========================================================

export function validateMergedData(
  merged
){

  const errors =
    [];


  const warnings =
    [];


  if(
    !merged ||
    typeof merged !==
      "object"
  ){

    return {

      valid:
        false,

      errors: [
        "Merged data is not an object."
      ],

      warnings: []

    };

  }


  if(
    !merged.fixture
  ){

    warnings.push(
      "No verified fixture was found."
    );

  }


  if(
    !Array.isArray(
      merged.homeMatches
    )
  ){

    errors.push(
      "homeMatches is not an array."
    );

  }


  if(
    !Array.isArray(
      merged.awayMatches
    )
  ){

    errors.push(
      "awayMatches is not an array."
    );

  }


  const homeCount =
    Array.isArray(
      merged.homeMatches
    )

      ? merged.homeMatches.length

      : 0;


  const awayCount =
    Array.isArray(
      merged.awayMatches
    )

      ? merged.awayMatches.length

      : 0;


  if(
    homeCount <
    3
  ){

    warnings.push(
      "Home team has fewer than 3 usable matches."
    );

  }


  if(
    awayCount <
    3
  ){

    warnings.push(
      "Away team has fewer than 3 usable matches."
    );

  }


  return {

    valid:
      errors.length === 0,

    errors,

    warnings,

    homeMatches:
      homeCount,

    awayMatches:
      awayCount

  };

}


// ==========================================================
// HELPERS
// ==========================================================

function clamp(
  value,
  min,
  max
){

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ){

    return min;

  }


  return Math.min(

    Math.max(
      number,
      min
    ),

    max

  );

}


function round(
  value
){

  const number =
    Number(
      value
    );


  if(
    !Number.isFinite(
      number
    )
  ){

    return 0;

  }


  return Math.round(
    number *
    100
  )
  /
  100;

}


// ==========================================================
// DEFAULT EXPORT
// ==========================================================

export default {

  STATS_COLLECTOR_VERSION,

  mergeProviderData,

  dedupeMatches,

  buildTeamAnalysis,

  calculateTeamStats,

  normalizeName,

  namesMatch,

  buildModel,

  buildPredictions,

  calculateDataQuality,

  getTeamForm,

  getHeadToHead,

  validateMergedData

};
