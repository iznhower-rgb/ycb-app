// ==========================================
// Y.C.B FINAL WORKER
// ==========================================

import {
  getProviders,
  getAllMatchData
} from "./providers.js";

import "./footballDataProvider.js";
import "./sofaScoreProvider.js";


const VERSION =
  "2.1.0";


// ==========================================
// FRONTEND
// ==========================================

const HTML = `<!DOCTYPE html>

<html
  lang="ar"
  dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

<title>
Y.C.B Football Prediction Engine
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#0f172a;
  color:#fff;
}

.app{
  max-width:560px;
  margin:auto;
  padding:28px 18px 50px;
}

h1{
  font-size:42px;
  text-align:center;
  margin:10px 0 4px;
}

.subtitle{
  color:#94a3b8;
  text-align:center;
  margin-bottom:25px;
}

.card,
.panel{
  background:#1e293b;
  border-radius:18px;
  padding:20px;
  margin-bottom:18px;
}

input{
  width:100%;
  padding:15px;
  border:0;
  border-radius:12px;
  font-size:17px;
  text-align:center;
  margin-bottom:13px;
}

button{
  width:100%;
  padding:16px;
  border:0;
  border-radius:12px;
  background:#22c55e;
  color:#fff;
  font-size:18px;
  font-weight:bold;
}

button:disabled{
  opacity:.55;
}

#status{
  margin-top:14px;
  text-align:center;
  color:#94a3b8;
  line-height:1.6;
}

.error{
  color:#f87171!important;
}

.warning{
  color:#fbbf24!important;
}

.success{
  color:#4ade80!important;
}

.hidden{
  display:none!important;
}

.section-title{
  margin:5px 0 15px;
  text-align:center;
}

.prediction{
  background:#334155;
  border-radius:16px;
  padding:17px;
  margin:12px 0;
}

.rank{
  font-size:20px;
  font-weight:bold;
}

.probability{
  color:#4ade80;
  font-size:20px;
  font-weight:bold;
  margin-top:7px;
}

.meta{
  color:#cbd5e1;
  font-size:13px;
  margin-top:6px;
  line-height:1.6;
}

.recommendation{
  border-radius:12px;
  padding:14px;
  margin-top:15px;
  line-height:1.7;
}

.recommended{
  background:#064e3b;
  color:#6ee7b7;
}

.no-bet{
  background:#422006;
  color:#fbbf24;
}

.stats{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.stat{
  background:#0f172a;
  border-radius:12px;
  padding:12px;
  text-align:center;
}

.stat strong{
  display:block;
  font-size:19px;
  margin-top:4px;
}

.providers{
  color:#cbd5e1;
  font-size:14px;
  line-height:2;
  margin-top:15px;
}

.fixture{
  background:#0f172a;
  border-radius:12px;
  padding:14px;
  line-height:1.9;
  margin-top:15px;
  text-align:center;
}

</style>

</head>

<body>

<div class="app">

<h1>
Y.C.B
</h1>

<div class="subtitle">
Football Prediction Engine
</div>


<div class="card">

<h2>
اختر مباراة
</h2>

<input
  id="match"
  value="Arsenal vs Coventry City"
  placeholder="Arsenal vs Coventry City"
>

<button
  id="analyzeButton"
  onclick="analyzeMatch()"
>
تحليل المباراة
</button>

<div id="status"></div>

</div>


<div
  id="result"
  class="hidden"
>


<div class="panel">

<h2 class="section-title">
أفضل 3 توقعات
</h2>


<div class="prediction">

<div
  id="prediction1"
  class="rank"
>
🥇 -
</div>

<div
  id="probability1"
  class="probability"
>
-
</div>

<div
  id="meta1"
  class="meta"
>
</div>

</div>


<div class="prediction">

<div
  id="prediction2"
  class="rank"
>
🥈 -
</div>

<div
  id="probability2"
  class="probability"
>
-
</div>

<div
  id="meta2"
  class="meta"
>
</div>

</div>


<div class="prediction">

<div
  id="prediction3"
  class="rank"
>
🥉 -
</div>

<div
  id="probability3"
  class="probability"
>
-
</div>

<div
  id="meta3"
  class="meta"
>
</div>

</div>


<div
  id="recommendation"
  class="recommendation no-bet"
>
</div>

</div>


<div class="panel">

<h3 class="section-title">
بيانات المباراة
</h3>

<div
  id="fixture"
  class="fixture"
>
-
</div>

</div>


<div
  id="statsPanel"
  class="panel"
>

<h3 class="section-title">
ملخص البيانات
</h3>

<div class="stats">

<div class="stat">
مباريات المضيف
<strong id="homeGames">-</strong>
</div>

<div class="stat">
مباريات الضيف
<strong id="awayGames">-</strong>
</div>

<div class="stat">
متوسط أهداف المضيف
<strong id="homeGF">-</strong>
</div>

<div class="stat">
متوسط أهداف الضيف
<strong id="awayGF">-</strong>
</div>

<div class="stat">
متوسط استقبال المضيف
<strong id="homeGA">-</strong>
</div>

<div class="stat">
متوسط استقبال الضيف
<strong id="awayGA">-</strong>
</div>

</div>

</div>


<div class="panel">

<h3 class="section-title">
مصادر البيانات
</h3>

<div
  id="providers"
  class="providers"
>
</div>

</div>


</div>

</div>


<script>

async function analyzeMatch(){

  const input =
    document.getElementById(
      "match"
    );


  const button =
    document.getElementById(
      "analyzeButton"
    );


  const status =
    document.getElementById(
      "status"
    );


  const result =
    document.getElementById(
      "result"
    );


  const match =
    input.value.trim();


  if(!match){

    status.className =
      "error";

    status.textContent =
      "اكتب المباراة أولاً.";

    return;

  }


  button.disabled =
    true;


  result.classList.add(
    "hidden"
  );


  status.className =
    "";


  status.textContent =
    "جاري جمع البيانات وتحليل المباراة...";


  try{

    const response =
      await fetch(
        "/api/analyze",
        {

          method:
            "POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              match
            })

        }
      );


    const text =
      await response.text();


    let data;


    try{

      data =
        JSON.parse(text);

    }catch{

      throw new Error(
        "الخادم أعاد استجابة غير صالحة."
      );

    }


    if(
      !response.ok ||
      !data.success
    ){

      throw new Error(
        data.error ||
        "فشل التحليل."
      );

    }


    const predictions =
      Array.isArray(
        data.predictions
      )
        ? data.predictions
        : [];


    if(
      predictions.length !== 3
    ){

      throw new Error(
        "المحرك لم يُرجع ثلاثة توقعات."
      );

    }


    predictions.forEach(
      (
        prediction,
        index
      ) => {

        const n =
          index + 1;


        const medals =
          [
            "🥇 ",
            "🥈 ",
            "🥉 "
          ];


        document.getElementById(
          "prediction" + n
        ).textContent =
          medals[index] +
          prediction.label;


        document.getElementById(
          "probability" + n
        ).textContent =
          prediction.probability;


        document.getElementById(
          "meta" + n
        ).textContent =
          prediction.explanation ||
          "";

      }
    );


    const recommendation =
      data.recommendation || {};


    const recommendationElement =
      document.getElementById(
        "recommendation"
      );


    recommendationElement.textContent =
      recommendation.message ||
      "لا توجد توصية.";


    recommendationElement.className =
      recommendation.recommended
        ? "recommendation recommended"
        : "recommendation no-bet";


    const fixture =
      data.analysis?.fixture ||
      null;


    const fixtureElement =
      document.getElementById(
        "fixture"
      );


    if(fixture){

      fixtureElement.innerHTML =
        "<strong>" +
        (
          fixture.homeTeam?.name ||
          data.match.home
        ) +
        "</strong>" +
        " 🆚 " +
        "<strong>" +
        (
          fixture.awayTeam?.name ||
          data.match.away
        ) +
        "</strong>" +
        "<br>" +
        "🏆 " +
        (
          fixture.competition ||
          "-"
        ) +
        "<br>" +
        "📅 " +
        (
          fixture.utcDate ||
          "-"
        );

    }else{

      fixtureElement.textContent =
        "لم يتم العثور على بيانات المباراة.";

    }


    document.getElementById(
      "homeGames"
    ).textContent =
      data.analysis?.home?.games ??
      "-";


    document.getElementById(
      "awayGames"
    ).textContent =
      data.analysis?.away?.games ??
      "-";


    document.getElementById(
      "homeGF"
    ).textContent =
      data.analysis?.home?.goalsForAvg ??
      "-";


    document.getElementById(
      "awayGF"
    ).textContent =
      data.analysis?.away?.goalsForAvg ??
      "-";


    document.getElementById(
      "homeGA"
    ).textContent =
      data.analysis?.home?.goalsAgainstAvg ??
      "-";


    document.getElementById(
      "awayGA"
    ).textContent =
      data.analysis?.away?.goalsAgainstAvg ??
      "-";


    const providers =
      Array.isArray(
        data.providers
      )
        ? data.providers
        : [];


    document.getElementById(
      "providers"
    ).innerHTML =

      providers.map(
        item => {

          const icon =
            item.success
              ? "✓"
              : "✗";


          return (

            icon +
            " " +
            item.provider +
            " — " +
            (
              item.status ||
              "unknown"
            ) +
            "<br>" +
            (
              item.message ||
              ""
            )

          );

        }
      ).join("<br>");


    result.classList.remove(
      "hidden"
    );


    if(
      data.analysisStatus ===
      "ready"
    ){

      status.className =
        "success";

    }else{

      status.className =
        "warning";

    }


    status.textContent =
      data.message ||
      "اكتمل التحليل.";


  }catch(error){

    console.error(
      error
    );


    status.className =
      "error";


    status.textContent =
      error?.message ||
      "حدث خطأ غير معروف.";

  }finally{

    button.disabled =
      false;

  }

}

</script>

</body>

</html>`;


// ==========================================
// WORKER
// ==========================================

export default {

  async fetch(
    request,
    env
  ){

    const url =
      new URL(
        request.url
      );


    // ======================================
    // OPTIONS
    // ======================================

    if(
      request.method ===
      "OPTIONS"
    ){

      return json({
        success:true
      });

    }


    // ======================================
    // HEALTH
    // ======================================

    if(
      url.pathname ===
      "/api/health"
    ){

      return json({

        success:true,

        status:
          "ok",

        app:
          "Y.C.B",

        engine:
          "Y.C.B Prediction Engine",

        version:
          VERSION,

        architecture:
          "Multi Provider Architecture",

        providers:
          getProviders()

      });

    }


    // ======================================
    // PROVIDERS
    // ======================================

    if(
      url.pathname ===
      "/api/providers"
    ){

      return json({

        success:true,

        providers:
          getProviders()

      });

    }


    // ======================================
    // ANALYZE
    // ======================================

    if(
      url.pathname ===
      "/api/analyze"
    ){

      if(
        request.method !==
        "POST"
      ){

        return json(

          {
            success:false,

            error:
              "POST method required"
          },

          405

        );

      }


      try{

        const body =
          await request.json();


        const match =
          String(
            body?.match ||
            ""
          ).trim();


        if(!match){

          return json(

            {
              success:false,

              error:
                "يجب إدخال المباراة."
            },

            400

          );

        }


        const parsed =
          parseMatch(
            match
          );


        if(!parsed){

          return json(

            {
              success:false,

              error:
                "اكتب المباراة بهذا الشكل: Arsenal vs Coventry City"
            },

            400

          );

        }


        const {
          home,
          away
        } =
          parsed;


        // ==================================
        // PROVIDERS
        // ==================================

        const providerResults =
          await getAllMatchData(
            home,
            away,
            env
          );


        const usable =
          providerResults.filter(
            item =>
              item.success &&
              item.data
          );


        // ==================================
        // MERGE
        // ==================================

        const merged =
          mergeProviderData(
            usable
          );


        // ==================================
        // NO FIXTURE
        // ==================================

        if(
          !merged.fixture
        ){

          return json({

            success:true,

            app:
              "Y.C.B",

            engine:
              "Y.C.B Prediction Engine",

            version:
              VERSION,

            architecture:
              "Multi Provider Architecture",

            match:{
              home,
              away
            },

            analysisStatus:
              "insufficient_data",

            message:
              "لم يتم العثور على المباراة في مصادر البيانات الحالية.",

            analysis:{

              home:
                emptyTeamAnalysis(
                  home
                ),

              away:
                emptyTeamAnalysis(
                  away
                ),

              fixture:
                null

            },

            predictions:
              fallbackPredictions(
                home,
                away
              ),

            recommendation:{

              recommended:
                false,

              market:
                null,

              probability:
                null,

              message:
                "لا يوجد رهان موصى به: المباراة غير متاحة في مصادر البيانات."

            },

            providerCount:
              providerResults.length,

            successfulProviderCount:
              usable.length,

            providers:
              providerResults

          });

        }


        // ==================================
        // TEAM ANALYSIS
        // ==================================

        const analysis =
          buildTeamAnalysis(
            home,
            away,
            merged
          );


        const enoughData =
          analysis.home.games >= 3 &&
          analysis.away.games >= 3;


        if(!enoughData){

          return json({

            success:true,

            app:
              "Y.C.B",

            engine:
              "Y.C.B Prediction Engine",

            version:
              VERSION,

            architecture:
              "Multi Provider Architecture",

            match:{
              home,
              away
            },

            analysisStatus:
              "insufficient_data",

            message:
              "تم العثور على المباراة، لكن البيانات التاريخية غير كافية لبناء توقع موثوق.",

            analysis,

            predictions:
              fallbackPredictions(
                home,
                away
              ),

            recommendation:{

              recommended:
                false,

              market:
                null,

              probability:
                null,

              message:
                "No Bet — البيانات التاريخية غير كافية."

            },

            providerCount:
              providerResults.length,

            successfulProviderCount:
              usable.length,

            providers:
              providerResults

          });

        }


        // ==================================
        // PREDICTIONS
        // ==================================

        const predictions =
          buildPredictions(
            analysis
          );


        // ==================================
        // RECOMMENDATION
        // ==================================

        const top =
          predictions[0];


        const recommended =
          Boolean(
            top &&
            top.probabilityValue >=
              0.60
          );


        const recommendation = {

          recommended,

          market:
            recommended
              ? top.label
              : null,

          probability:
            recommended
              ? top.probability
              : null,

          message:
            recommended

              ? `التوقع الأقوى حاليًا: ${top.label} بنسبة ${top.probability}.`

              : "No Bet — لا يوجد توقع تجاوز حد الثقة الحالي."

        };


        // ==================================
        // FINAL RESPONSE
        // ==================================

        return json({

          success:
            true,

          app:
            "Y.C.B",

          engine:
            "Y.C.B Prediction Engine",

          version:
            VERSION,

          architecture:
            "Multi Provider Architecture",

          match:{
            home,
            away
          },

          analysisStatus:
            "ready",

          message:
            "اكتمل تحليل المباراة بنجاح.",

          analysis,

          predictions,

          recommendation,

          providerCount:
            providerResults.length,

          successfulProviderCount:
            usable.length,

          providers:
            providerResults

        });

      }catch(error){

        console.error(
          "Analyze error:",
          error
        );


        return json(

          {
            success:
              false,

            error:
              error?.message ||
              String(error) ||
              "Unknown server error"

          },

          500

        );

      }

    }


    // ======================================
    // FRONTEND
    // ======================================

    return new Response(

      HTML,

      {

        status:
          200,

        headers:{

          "Content-Type":
            "text/html;charset=UTF-8",

          "Cache-Control":
            "no-store"

        }

      }

    );

  }

};


// ==========================================
// PARSE MATCH
// ==========================================

function parseMatch(
  value
){

  const parts =
    value.split(
      /\s+vs\s+/i
    );


  if(
    parts.length !== 2
  ){

    return null;

  }


  const home =
    parts[0].trim();


  const away =
    parts[1].trim();


  if(
    !home ||
    !away
  ){

    return null;

  }


  return {
    home,
    away
  };

}


// ==========================================
// MERGE PROVIDERS
// ==========================================

function mergeProviderData(
  successfulProviders
){

  let fixture =
    null;


  const homeMatches =
    [];


  const awayMatches =
    [];


  for(
    const provider
    of successfulProviders
  ){

    const data =
      provider.data ||
      {};


    if(
      !fixture &&
      data.fixture
    ){

      fixture =
        data.fixture;

    }


    const recent =
      data.recentMatches ||
      {};


    if(
      Array.isArray(
        recent.home
      )
    ){

      homeMatches.push(
        ...recent.home
      );

    }


    if(
      Array.isArray(
        recent.away
      )
    ){

      awayMatches.push(
        ...recent.away
      );

    }

  }


  return {

    fixture,

    homeMatches:
      dedupeMatches(
        homeMatches
      ),

    awayMatches:
      dedupeMatches(
        awayMatches
      )

  };

}


// ==========================================
// DEDUPE
// ==========================================

function dedupeMatches(
  matches
){

  const seen =
    new Set();


  return matches

    .filter(
      match => {

        const key =
          String(
            match.id ||
            [
              match.utcDate,
              match.homeTeam?.name,
              match.awayTeam?.name
            ].join("|")
          );


        if(
          seen.has(key)
        ){

          return false;

        }


        seen.add(
          key
        );


        return true;

      }
    )

    .sort(
      (
        a,
        b
      ) =>

        new Date(
          b.utcDate ||
          0
        ) -

        new Date(
          a.utcDate ||
          0
        )

    )

    .slice(
      0,
      15
    );

}


// ==========================================
// TEAM ANALYSIS
// ==========================================

function buildTeamAnalysis(
  homeName,
  awayName,
  merged
){

  return {

    home:
      calculateTeamStats(
        homeName,
        merged.homeMatches
      ),

    away:
      calculateTeamStats(
        awayName,
        merged.awayMatches
      ),

    fixture:
      merged.fixture

  };

}


// ==========================================
// EMPTY ANALYSIS
// ==========================================

function emptyTeamAnalysis(
  team
){

  return {

    team,

    games:
      0,

    wins:
      0,

    draws:
      0,

    losses:
      0,

    formPoints:
      0,

    formMax:
      0,

    formRate:
      0,

    goalsForAvg:
      0,

    goalsAgainstAvg:
      0

  };

}


// ==========================================
// TEAM STATS
// ==========================================

function calculateTeamStats(
  teamName,
  matches
){

  const normalizedTeam =
    normalizeName(
      teamName
    );


  const usable =
    matches

      .map(
        match => {

          const home =
            normalizeName(
              match.homeTeam?.name
            );


          const away =
            normalizeName(
              match.awayTeam?.name
            );


          const hg =
            Number(
              match.score?.fullTime?.home
            );


          const ag =
            Number(
              match.score?.fullTime?.away
            );


          if(
            !Number.isFinite(
              hg
            ) ||
            !Number.isFinite(
              ag
            )
          ){

            return null;

          }


          if(
            home !==
              normalizedTeam &&
            away !==
              normalizedTeam
          ){

            return null;

          }


          const isHome =
            home ===
            normalizedTeam;


          const gf =
            isHome
              ? hg
              : ag;


          const ga =
            isHome
              ? ag
              : hg;


          let result =
            "D";


          if(
            gf > ga
          ){

            result =
              "W";

          }


          if(
            gf < ga
          ){

            result =
              "L";

          }


          return {

            gf,
            ga,
            result

          };

        }
      )

      .filter(
        Boolean
      );


  const last5 =
    usable.slice(
      0,
      5
    );


  const last10 =
    usable.slice(
      0,
      10
    );


  const average =
    (
      items,
      key
    ) =>

      items.length

        ? items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              item[key],

            0
          ) /
          items.length

        : 0;


  const gf5 =
    average(
      last5,
      "gf"
    );


  const gf10 =
    average(
      last10,
      "gf"
    );


  const ga5 =
    average(
      last5,
      "ga"
    );


  const ga10 =
    average(
      last10,
      "ga"
    );


  const goalsForAvg =
    last5.length

      ? (
          gf5 * 0.60
        ) +
        (
          gf10 * 0.40
        )

      : gf10;


  const goalsAgainstAvg =
    last5.length

      ? (
          ga5 * 0.60
        ) +
        (
          ga10 * 0.40
        )

      : ga10;


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


  const formMax =
    usable.length * 3;


  return {

    team:
      teamName,

    games:
      usable.length,

    wins,

    draws,

    losses,

    formPoints,

    formMax,

    formRate:
      formMax
        ? formPoints /
          formMax
        : 0,

    goalsForAvg:
      round(
        goalsForAvg
      ),

    goalsAgainstAvg:
      round(
        goalsAgainstAvg
      )

  };

}


// ==========================================
// PREDICTION ENGINE
// ==========================================

function buildPredictions(
  analysis
){

  const home =
    analysis.home;


  const away =
    analysis.away;


  const homeXg =
    clamp(

      (
        home.goalsForAvg *
        0.55

        +

        away.goalsAgainstAvg *
        0.45

      ) *

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

      ) *

      0.92,

      0.10,

      3.50

    );


  const matrix =
    poissonMatrix(
      homeXg,
      awayXg,
      8
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


  let bttsYes =
    0;


  let bttsNo =
    0;


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

      const p =
        matrix[h][a];


      if(
        h > a
      ){

        homeWin +=
          p;

      }else if(
        h === a
      ){

        draw +=
          p;

      }else{

        awayWin +=
          p;

      }


      if(
        h + a >= 3
      ){

        over25 +=
          p;

      }else{

        under25 +=
          p;

      }


      if(
        h >= 1 &&
        a >= 1
      ){

        bttsYes +=
          p;

      }else{

        bttsNo +=
          p;

      }

    }

  }


  const candidates = [

    {

      key:
        "homeWin",

      label:
        `فوز ${home.team}`,

      probabilityValue:
        homeWin,

      explanation:
        `Poisson | xG تقديري: ${round(homeXg)} - ${round(awayXg)}`

    },


    {

      key:
        "draw",

      label:
        "التعادل",

      probabilityValue:
        draw,

      explanation:
        `Poisson | xG تقديري: ${round(homeXg)} - ${round(awayXg)}`

    },


    {

      key:
        "awayWin",

      label:
        `فوز ${away.team}`,

      probabilityValue:
        awayWin,

      explanation:
        `Poisson | xG تقديري: ${round(homeXg)} - ${round(awayXg)}`

    },


    {

      key:
        "over25",

      label:
        "أكثر من 2.5 هدف",

      probabilityValue:
        over25,

      explanation:
        "Poisson | ثلاثة أهداف أو أكثر"

    },


    {

      key:
        "under25",

      label:
        "أقل من 2.5 هدف",

      probabilityValue:
        under25,

      explanation:
        "Poisson | صفر إلى هدفين"

    },


    {

      key:
        "bttsYes",

      label:
        "كلا الفريقين يسجلان",

      probabilityValue:
        bttsYes,

      explanation:
        "Poisson | تسجيل الفريقين هدفًا على الأقل"

    },


    {

      key:
        "bttsNo",

      label:
        "ليس كلا الفريقين يسجلان",

      probabilityValue:
        bttsNo,

      explanation:
        "Poisson | أحد الفريقين على الأقل لا يسجل"

    }

  ];


  candidates.sort(
    (
      a,
      b
    ) =>
      b.probabilityValue -
      a.probabilityValue
  );


  return candidates

    .slice(
      0,
      3
    )

    .map(
      item => ({

        outcome:
          item.key,

        label:
          item.label,

        probabilityValue:
          item.probabilityValue,

        probability:
          `${round(
            item.probabilityValue *
            100
          )}%`,

        explanation:
          item.explanation

      })
    );

}


// ==========================================
// FALLBACK
// ==========================================

function fallbackPredictions(
  home,
  away
){

  return [

    {

      outcome:
        "unavailable",

      label:
        `فوز ${home}`,

      probability:
        "غير متاح",

      probabilityValue:
        0,

      explanation:
        "لا توجد بيانات تاريخية كافية."

    },


    {

      outcome:
        "unavailable",

      label:
        "التعادل",

      probability:
        "غير متاح",

      probabilityValue:
        0,

      explanation:
        "لا توجد بيانات تاريخية كافية."

    },


    {

      outcome:
        "unavailable",

      label:
        `فوز ${away}`,

      probability:
        "غير متاح",

      probabilityValue:
        0,

      explanation:
        "لا توجد بيانات تاريخية كافية."

    }

  ];

}


// ==========================================
// POISSON MATRIX
// ==========================================

function poissonMatrix(
  lambdaHome,
  lambdaAway,
  maxGoals
){

  const homeP =
    poissonSeries(
      lambdaHome,
      maxGoals
    );


  const awayP =
    poissonSeries(
      lambdaAway,
      maxGoals
    );


  const matrix =
    [];


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

      matrix[h][a] =
        homeP[h] *
        awayP[a];

    }

  }


  return matrix;

}


// ==========================================
// POISSON SERIES
// ==========================================

function poissonSeries(
  lambda,
  max
){

  const values =
    [];


  for(
    let k = 0;
    k <= max;
    k++
  ){

    values.push(

      Math.exp(
        -lambda
      ) *

      Math.pow(
        lambda,
        k
      ) /

      factorial(
        k
      )

    );

  }


  return values;

}


// ==========================================
// FACTORIAL
// ==========================================

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


// ==========================================
// NORMALIZE NAME
// ==========================================

function normalizeName(
  value
){

  return String(
    value || ""
  )

    .toLowerCase()

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


// ==========================================
// CLAMP
// ==========================================

function clamp(
  value,
  min,
  max
){

  return Math.min(

    Math.max(
      value,
      min
    ),

    max

  );

}


// ==========================================
// ROUND
// ==========================================

function round(
  value
){

  return Math.round(
    Number(value) *
    100
  ) / 100;

}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(
  data,
  status = 200
){

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status,

      headers:{

        "Content-Type":
          "application/json;charset=UTF-8",

        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Methods":
          "GET,POST,OPTIONS",

        "Access-Control-Allow-Headers":
          "Content-Type"

      }

    }

  );

}
