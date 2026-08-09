// ==========================================================
// Y.C.B FINAL WORKER 2.2.2
// ==========================================================

import {
  getProviders,
  getAllMatchData
} from "./providers.js";

import "./espnProvider.js";
import "./footballDataProvider.js";
import "./sofaScoreProvider.js";
import "./openLigaProvider.js";
import "./theSportsDBProvider.js";
import "./bsdProvider.js";

const VERSION = "2.2.2";


// ==========================================================
// HTML
// ==========================================================

const HTML = `<!doctype html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,maximum-scale=1"
>

<title>
Y.C.B Football Prediction Engine
</title>

<style>

*{
  box-sizing:border-box
}

html,
body{
  margin:0;
  padding:0;
  overflow-x:hidden
}

body{
  font-family:Arial,sans-serif;
  background:#0f172a;
  color:#fff
}

.app{
  width:100%;
  max-width:620px;
  margin:auto;
  padding:18px 10px 50px
}

h1{
  font-size:42px;
  text-align:center;
  margin:8px 0 2px
}

.subtitle{
  text-align:center;
  color:#94a3b8;
  margin-bottom:22px
}

.card,
.panel{
  background:#1e293b;
  border-radius:18px;
  padding:16px;
  margin-bottom:16px;
  overflow:hidden
}

input{
  width:100%;
  padding:14px;
  border:0;
  border-radius:12px;
  font-size:17px;
  text-align:center;
  margin-bottom:12px
}

button{
  width:100%;
  padding:15px;
  border:0;
  border-radius:12px;
  background:#22c55e;
  color:#fff;
  font-size:18px;
  font-weight:bold
}

button:disabled{
  opacity:.55
}

#status{
  text-align:center;
  margin-top:12px;
  line-height:1.7;
  color:#94a3b8
}

.success{
  color:#4ade80!important
}

.error{
  color:#f87171!important
}

.warning{
  color:#fbbf24!important
}

.hidden{
  display:none!important
}

.section-title{
  text-align:center;
  margin:3px 0 14px
}

.prediction{
  background:#334155;
  border-radius:14px;
  padding:14px;
  margin:10px 0;
  overflow:hidden
}

.rank{
  font-size:18px;
  font-weight:bold;
  overflow-wrap:anywhere
}

.probability{
  color:#4ade80;
  font-size:20px;
  font-weight:bold;
  margin-top:6px
}

.meta{
  color:#cbd5e1;
  font-size:13px;
  line-height:1.6;
  margin-top:5px
}

.warning-box{
  background:#422006;
  color:#fbbf24;
  border-radius:12px;
  padding:12px;
  line-height:1.7;
  margin-top:12px;
  overflow-wrap:anywhere
}

.recommended-box{
  background:#064e3b;
  color:#4ade80
}

.stats,
.analysis-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:8px
}

.stat,
.analysis-item{
  background:#0f172a;
  border-radius:11px;
  padding:10px 6px;
  text-align:center;
  color:#cbd5e1;
  min-width:0;
  overflow:hidden
}

.stat strong,
.analysis-item b{
  display:block;
  color:#fff;
  font-size:17px;
  margin-top:4px;
  overflow-wrap:anywhere
}

.providers{
  color:#cbd5e1;
  font-size:13px;
  line-height:2;
  overflow-wrap:anywhere
}

.scoreline{
  text-align:center;
  color:#cbd5e1;
  line-height:1.8;
  margin-top:12px;
  overflow-wrap:anywhere
}

.note{
  font-size:12px;
  color:#94a3b8;
  line-height:1.6;
  margin-top:12px
}

.quality-warning{
  color:#fbbf24
}

@media(max-width:420px){

  h1{
    font-size:36px
  }

  .card,
  .panel{
    padding:13px
  }

  .stat strong,
  .analysis-item b{
    font-size:16px
  }

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
  class="warning-box"
>
</div>


<div
  id="scoreline"
  class="scoreline"
>
</div>

</div>


<div class="panel">

<h3 class="section-title">
ملخص التحليل
</h3>

<div class="analysis-grid">

<div class="analysis-item">
xG المضيف
<b id="homeXg">-</b>
</div>

<div class="analysis-item">
xG الضيف
<b id="awayXg">-</b>
</div>

<div class="analysis-item">
فوز المضيف
<b id="homeWin">-</b>
</div>

<div class="analysis-item">
التعادل
<b id="draw">-</b>
</div>

<div class="analysis-item">
فوز الضيف
<b id="awayWin">-</b>
</div>

<div class="analysis-item">
BTTS
<b id="btts">-</b>
</div>

</div>

</div>


<div class="panel">

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
أهداف المضيف/مباراة
<strong id="homeGF">-</strong>
</div>

<div class="stat">
أهداف الضيف/مباراة
<strong id="awayGF">-</strong>
</div>

<div class="stat">
استقبال المضيف
<strong id="homeGA">-</strong>
</div>

<div class="stat">
استقبال الضيف
<strong id="awayGA">-</strong>
</div>

</div>

<div class="note">
جودة البيانات لا تعني دقة مضمونة؛
التوقعات تعتمد فقط على البيانات التي تم التحقق منها من المصادر المتاحة.
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
    document.getElementById("match");

  const button =
    document.getElementById("analyzeButton");

  const status =
    document.getElementById("status");

  const result =
    document.getElementById("result");

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


    for(
      let i=0;
      i<3;
      i++
    ){

      const prediction =
        predictions[i] ||
        {
          label:
            "غير متاح",

          probability:
            "غير متاح",

          explanation:
            ""
        };


      const n =
        i + 1;


      document.getElementById(
        "prediction" + n
      ).textContent =

        [
          "🥇 ",
          "🥈 ",
          "🥉 "
        ][i]

        +

        (
          prediction.label ||
          "غير متاح"
        );


      document.getElementById(
        "probability" + n
      ).textContent =
        prediction.probability ||
        "-";


      document.getElementById(
        "meta" + n
      ).textContent =
        prediction.explanation ||
        "";

    }


    const recommendation =
      document.getElementById(
        "recommendation"
      );


    const recommended =
      Boolean(
        data.recommendation?.recommended
      );


    recommendation.textContent =
      data.recommendation?.message ||
      "لا توجد توصية.";


    recommendation.className =
      recommended
        ? "warning-box recommended-box"
        : "warning-box";


    const analysis =
      data.analysis ||
      {};


    setValue(
      "homeGames",
      analysis.home?.games
    );

    setValue(
      "awayGames",
      analysis.away?.games
    );

    setValue(
      "homeGF",
      fixed(
        analysis.home?.goalsForAvg
      )
    );

    setValue(
      "awayGF",
      fixed(
        analysis.away?.goalsForAvg
      )
    );

    setValue(
      "homeGA",
      fixed(
        analysis.home?.goalsAgainstAvg
      )
    );

    setValue(
      "awayGA",
      fixed(
        analysis.away?.goalsAgainstAvg
      )
    );

    setValue(
      "homeXg",
      fixed(
        analysis.model?.homeXg
      )
    );

    setValue(
      "awayXg",
      fixed(
        analysis.model?.awayXg
      )
    );

    setValue(
      "homeWin",
      percent(
        analysis.model?.homeWin
      )
    );

    setValue(
      "draw",
      percent(
        analysis.model?.draw
      )
    );

    setValue(
      "awayWin",
      percent(
        analysis.model?.awayWin
      )
    );

    setValue(
      "btts",
      percent(
        analysis.model?.bttsYes
      )
    );


    document.getElementById(
      "scoreline"
    ).textContent =

      data.predictedScore

        ? "النتيجة الأكثر ترجيحًا: " +
          data.predictedScore +
          " | جودة البيانات: " +
          (
            data.dataQuality ??
            "-"
          ) +
          "/100"

        : "جودة البيانات: " +
          (
            data.dataQuality ??
            "-"
          ) +
          "/100";


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
        item =>

          (
            item.success
              ? "✓"
              : "✗"
          )

          +

          " " +

          escapeHtml(
            item.provider
          )

          +

          " — " +

          escapeHtml(
            item.status
          )

          +

          (
            item.message
              ? " — " +
                escapeHtml(
                  item.message
                )
              : ""
          )

      ).join(
        "<br>"
      );


    result.classList.remove(
      "hidden"
    );


    status.className =
      data.analysisStatus ===
      "ready"

        ? "success"

        : "warning";


    status.textContent =
      data.message ||
      "اكتمل التحليل.";

  }catch(error){

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


function setValue(
  id,
  value
){

  document.getElementById(
    id
  ).textContent =
    value == null
      ? "-"
      : value;

}


function fixed(
  value
){

  return typeof value ===
    "number" &&
    Number.isFinite(value)

    ? value.toFixed(2)

    : "-";

}


function percent(
  value
){

  return typeof value ===
    "number" &&
    Number.isFinite(value)

    ? (
        value * 100
      ).toFixed(2) + "%"

    : "-";

}


function escapeHtml(
  value
){

  return String(
    value ||
    ""
  ).replace(
    /[&<>"']/g,
    character =>
      ({
        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#39;"

      }[character])
  );

}

</script>

</body>

</html>`;


// ==========================================================
// WORKER
// ==========================================================

export default {

  async fetch(
    request,
    env
  ){

    const url =
      new URL(
        request.url
      );


    if(
      request.method ===
      "OPTIONS"
    ){

      return json({
        success:
          true
      });

    }


    // ======================================================
    // HEALTH
    // ======================================================

    if(
      url.pathname ===
      "/api/health"
    ){

      return json({

        success:
          true,

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


    // ======================================================
    // PROVIDERS
    // ======================================================

    if(
      url.pathname ===
      "/api/providers"
    ){

      return json({

        success:
          true,

        providers:
          getProviders()

      });

    }


    // ======================================================
    // ANALYZE
    // ======================================================

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
            success:
              false,

            error:
              "POST method required"
          },
          405
        );

      }


      try{

        const body =
          await request.json();


        const parsed =
          parseMatch(
            String(
              body?.match ||
              ""
            )
          );


        if(!parsed){

          return json(
            {

              success:
                false,

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


        // ==================================================
        // COLLECT FROM ALL PROVIDERS
        // ==================================================

        const providerResults =
          await getAllMatchData(
            home,
            away,
            env
          );


        // ==================================================
        // ONLY SUCCESSFUL PROVIDERS WITH DATA
        // ==================================================

        const usable =
          providerResults.filter(
            item =>
              item &&
              item.success &&
              item.data
          );


        // ==================================================
        // MERGE
        // ==================================================

        const merged =
          mergeProviderData(
            usable
          );


        // ==================================================
        // MATCH NOT VERIFIED
        // ==================================================

        if(
          !merged.fixture
        ){

          return json(

            baseResponse(

              home,
              away,
              providerResults,
              usable,
              "insufficient_data",
              "لم يتم التحقق من المباراة المطلوبة في أي مصدر متاح."

            )

          );

        }


        // ==================================================
        // TEAM ANALYSIS
        // ==================================================

        const analysis =
          buildTeamAnalysis(
            home,
            away,
            merged
          );


        // ==================================================
        // DATA QUALITY
        // ==================================================

        const dataQuality =
          calculateDataQuality(
            analysis,
            usable.length,
            true
          );


        // ==================================================
        // HISTORY CHECK
        // ==================================================

        if(
          analysis.home.games < 3 ||
          analysis.away.games < 3
        ){

          return json({

            ...baseResponse(

              home,
              away,
              providerResults,
              usable,
              "insufficient_data",
              "تم العثور على المباراة، لكن البيانات التاريخية المتاحة غير كافية لإصدار توقع موثوق."

            ),

            analysis,

            dataQuality

          });

        }


        // ==================================================
        // BUILD PREDICTIONS
        // ==================================================

        const result =
          buildPredictions(
            analysis
          );


        const top =
          result.predictions[0];


        // ==================================================
        // IMPORTANT:
        // Minimum two independent successful providers
        // ==================================================

        const multiProviderReady =
          usable.length >= 2;


        const recommended =
          Boolean(

            multiProviderReady &&

            top &&

            top.probabilityValue >=
              0.60 &&

            dataQuality >=
              60

          );


        // ==================================================
        // ANALYSIS STATUS
        // ==================================================

        const analysisStatus =
          multiProviderReady
            ? "ready"
            : "limited_data";


        const message =
          multiProviderReady

            ? "اكتمل تحليل المباراة بنجاح بعد التحقق من أكثر من مصدر."

            : "تم تحليل المباراة، لكن مصدر بيانات واحد فقط نجح حاليًا؛ لذلك تم خفض جودة البيانات ولن يصدر Y.C.B رهانًا موصى به.";


        // ==================================================
        // RECOMMENDATION MESSAGE
        // ==================================================

        let recommendationMessage;


        if(
          recommended
        ){

          recommendationMessage =
            `التوقع الأقوى حاليًا: ${top.label} بنسبة ${top.probability}.`;

        }

        else if(
          !multiProviderReady
        ){

          recommendationMessage =
            "لا يوجد رهان موصى به: يجب التحقق من البيانات عبر مصدرين ناجحين على الأقل.";

        }

        else{

          recommendationMessage =
            "لا يوجد رهان موصى به: الثقة أو جودة البيانات أقل من الحد المطلوب.";

        }


        // ==================================================
        // FINAL RESPONSE
        // ==================================================

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

          match: {

            home,

            away

          },

          analysisStatus,

          message,

          analysis,

          predictions:
            result.predictions,

          recommendation: {

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
              recommendationMessage

          },

          predictedScore:
            result.predictedScore,

          dataQuality,

          providers:
            providerResults,

          providerCount:
            providerResults.length,

          successfulProviderCount:
            usable.length,

          validation: {

            fixtureVerified:
              Boolean(
                merged.fixture
              ),

            minimumProvidersRequired:
              2,

            successfulProviders:
              usable.length,

            multiProviderVerified:
              multiProviderReady

          }

        });

      }catch(error){

        console.error(
          "Analyze error",
          error
        );


        return json(

          {

            success:
              false,

            error:
              error?.message ||
              String(error)

          },

          500

        );

      }

    }


    // ======================================================
    // MAIN HTML
    // ======================================================

    return new Response(

      HTML,

      {

        status:
          200,

        headers: {

          "Content-Type":
            "text/html;charset=UTF-8",

          "Cache-Control":
            "no-store"

        }

      }

    );

  }

};


// ==========================================================
// MATCH PARSER
// ==========================================================

function parseMatch(
  value
){

  const parts =
    value
      .trim()
      .split(
        /\s+vs\s+/i
      );


  if(
    parts.length !==
    2
  ){

    return null;

  }


  const home =
    parts[0].trim();


  const away =
    parts[1].trim();


  return (

    home &&
    away

  )

    ? {

        home,

        away

      }

    : null;

}


// ==========================================================
// MERGE PROVIDER DATA
// ==========================================================

function mergeProviderData(
  results
){

  let fixture =
    null;


  const homeMatches =
    [];


  const awayMatches =
    [];


  for(
    const item
    of results
  ){

    const data =
      item.data ||
      {};


    if(
      !fixture &&
      data.fixture
    ){

      fixture =
        data.fixture;

    }


    if(
      Array.isArray(
        data.recentMatches?.home
      )
    ){

      homeMatches.push(
        ...data.recentMatches.home
      );

    }


    if(
      Array.isArray(
        data.recentMatches?.away
      )
    ){

      awayMatches.push(
        ...data.recentMatches.away
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


// ==========================================================
// DEDUPE MATCHES
// ==========================================================

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
          seen.has(
            key
          )
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
      (a,b) =>
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


// ==========================================================
// TEAM ANALYSIS
// ==========================================================

function buildTeamAnalysis(
  homeName,
  awayName,
  merged
){

  const home =
    calculateTeamStats(
      homeName,
      merged.homeMatches
    );


  const away =
    calculateTeamStats(
      awayName,
      merged.awayMatches
    );


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

      4

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
// TEAM STATS
// ==========================================================

function calculateTeamStats(
  teamName,
  matches
){

  const team =
    normalizeName(
      teamName
    );


  const usable =
    matches

      .map(
        match => {

          const home =
            normalizeName(
              match
                .homeTeam
                ?.name
            );


          const away =
            normalizeName(
              match
                .awayTeam
                ?.name
            );


          const homeGoals =
            Number(
              match
                .score
                ?.fullTime
                ?.home
            );


          const awayGoals =
            Number(
              match
                .score
                ?.fullTime
                ?.away
            );


          if(

            !Number.isFinite(
              homeGoals
            )

            ||

            !Number.isFinite(
              awayGoals
            )

            ||

            (

              !namesMatch(
                home,
                team
              )

              &&

              !namesMatch(
                away,
                team
              )

            )

          ){

            return null;

          }


          const isHome =
            namesMatch(
              home,
              team
            );


          const gf =
            isHome
              ? homeGoals
              : awayGoals;


          const ga =
            isHome
              ? awayGoals
              : homeGoals;


          return {

            gf,

            ga,

            result:

              gf > ga
                ? "W"

                : gf < ga
                  ? "L"
                  : "D"

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
          )

          /

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


  const formPoints =
    wins * 3 +
    draws;


  return {

    team:
      teamName,

    games:
      usable.length,

    wins,

    draws,

    losses:
      usable.length -
      wins -
      draws,

    formPoints,

    formRate:
      round(

        usable.length
          ? formPoints /
            (
              usable.length *
              3
            )
          : 0

      ),

    goalsForAvg:
      round(

        last5.length

          ? gf5 * 0.60 +
            gf10 * 0.40

          : gf10

      ),

    goalsAgainstAvg:
      round(

        last5.length

          ? ga5 * 0.60 +
            ga10 * 0.40

          : ga10

      )

  };

}


// ==========================================================
// POISSON MODEL
// ==========================================================

function buildModel(
  homeXg,
  awayXg
){

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


  let best = {

    probability:
      -1,

    home:
      0,

    away:
      0

  };


  for(
    let h=0;
    h<matrix.length;
    h++
  ){

    for(
      let a=0;
      a<matrix[h].length;
      a++
    ){

      const p =
        matrix[h][a];


      if(
        p >
        best.probability
      ){

        best = {

          probability:
            p,

          home:
            h,

          away:
            a

        };

      }


      if(
        h > a
      ){

        homeWin +=
          p;

      }

      else if(
        h === a
      ){

        draw +=
          p;

      }

      else{

        awayWin +=
          p;

      }


      if(
        h + a >= 3
      ){

        over25 +=
          p;

      }

      else{

        under25 +=
          p;

      }


      if(
        h >= 1 &&
        a >= 1
      ){

        bttsYes +=
          p;

      }

      else{

        bttsNo +=
          p;

      }

    }

  }


  return {

    homeXg:
      round(
        homeXg
      ),

    awayXg:
      round(
        awayXg
      ),

    homeWin,

    draw,

    awayWin,

    over25,

    under25,

    bttsYes,

    bttsNo,

    bestScore:
      best

  };

}


// ==========================================================
// Y.C.B BET SELECTION ENGINE
// ==========================================================

function buildPredictions(
  analysis
){

  const model =
    analysis.model;


  const home =
    analysis.home;


  const away =
    analysis.away;


  // --------------------------------------------------------
  // 1X2
  // --------------------------------------------------------

  const oneXtwo = [

    {

      outcome:
        "homeWin",

      label:
        `فوز ${home.team}`,

      probabilityValue:
        model.homeWin,

      explanation:
        "أقوى خيار في سوق 1X2 وفق نموذج بواسون."

    },

    {

      outcome:
        "draw",

      label:
        "التعادل",

      probabilityValue:
        model.draw,

      explanation:
        "أقوى خيار في سوق 1X2 وفق نموذج بواسون."

    },

    {

      outcome:
        "awayWin",

      label:
        `فوز ${away.team}`,

      probabilityValue:
        model.awayWin,

      explanation:
        "أقوى خيار في سوق 1X2 وفق نموذج بواسون."

    }

  ];


  // --------------------------------------------------------
  // GOALS
  // --------------------------------------------------------

  const goalsMarket = [

    {

      outcome:
        "over25",

      label:
        "أكثر من 2.5 هدف",

      probabilityValue:
        model.over25,

      explanation:
        "أقوى خيار في سوق إجمالي الأهداف وفق توزيع بواسون."

    },

    {

      outcome:
        "under25",

      label:
        "أقل من 2.5 هدف",

      probabilityValue:
        model.under25,

      explanation:
        "أقوى خيار في سوق إجمالي الأهداف وفق توزيع بواسون."

    }

  ];


  // --------------------------------------------------------
  // BTTS
  // --------------------------------------------------------

  const bttsMarket = [

    {

      outcome:
        "bttsYes",

      label:
        "كلا الفريقين يسجلان",

      probabilityValue:
        model.bttsYes,

      explanation:
        "أقوى خيار في سوق تسجيل الفريقين وفق نموذج بواسون."

    },

    {

      outcome:
        "bttsNo",

      label:
        "ليس كلا الفريقين يسجلان",

      probabilityValue:
        model.bttsNo,

      explanation:
        "أقوى خيار في سوق تسجيل الفريقين وفق نموذج بواسون."

    }

  ];


  // --------------------------------------------------------
  // BEST OPTION PER MARKET
  // --------------------------------------------------------

  const bestOneXtwo =
    getBestMarketOption(
      oneXtwo
    );


  const bestGoals =
    getBestMarketOption(
      goalsMarket
    );


  const bestBtts =
    getBestMarketOption(
      bttsMarket
    );


  // --------------------------------------------------------
  // THREE DIFFERENT MARKETS
  // --------------------------------------------------------

  const selected = [

    bestOneXtwo,

    bestGoals,

    bestBtts

  ].filter(
    Boolean
  );


  // --------------------------------------------------------
  // SORT
  // --------------------------------------------------------

  selected.sort(
    (a,b) =>
      b.probabilityValue -
      a.probabilityValue
  );


  // --------------------------------------------------------
  // OUTPUT
  // --------------------------------------------------------

  const predictions =
    selected

      .slice(
        0,
        3
      )

      .map(
        item => ({

          outcome:
            item.outcome,

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


  return {

    predictions,

    predictedScore:

      `${model.bestScore.home} - ${model.bestScore.away}`

  };

}


// ==========================================================
// BEST MARKET OPTION
// ==========================================================

function getBestMarketOption(
  candidates
){

  if(
    !Array.isArray(
      candidates
    ) ||
    !candidates.length
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
// POISSON MATRIX
// ==========================================================

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
    let h=0;
    h<=maxGoals;
    h++
  ){

    matrix[h] =
      [];


    for(
      let a=0;
      a<=maxGoals;
      a++
    ){

      matrix[h][a] =
        homeP[h] *
        awayP[a];

    }

  }


  const total =
    matrix
      .flat()
      .reduce(
        (
          sum,
          value
        ) =>
          sum +
          value,

        0
      );


  return matrix.map(
    row =>
      row.map(
        value =>
          value /
          total
      )
  );

}


// ==========================================================
// POISSON SERIES
// ==========================================================

function poissonSeries(
  lambda,
  max
){

  const result =
    [];


  for(
    let k=0;
    k<=max;
    k++
  ){

    result.push(

      Math.exp(
        -lambda
      )

      *

      Math.pow(
        lambda,
        k
      )

      /

      factorial(
        k
      )

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
    let i=2;
    i<=n;
    i++
  ){

    result *=
      i;

  }


  return result;

}


// ==========================================================
// DATA QUALITY 2.2.2
// ==========================================================
//
// الجديد:
//
// التاريخ = 60 نقطة
// تعدد المصادر = 30 نقطة
// التحقق من المباراة = 10 نقاط
//
// ثم يوجد سقف حسب عدد المصادر:
//
// مصدر واحد  => حد أقصى 55
// مصدران     => حد أقصى 75
// 3 مصادر    => حد أقصى 90
// 4+ مصادر   => 100
//
// لذلك لا يمكن لمصدر واحد أن يعطي 100/100.
// ==========================================================

function calculateDataQuality(
  analysis,
  providerCount,
  fixture
){

  const games =
    Math.min(
      analysis.home.games,
      analysis.away.games
    );


  // --------------------------------------------------------
  // التاريخ: 60 نقطة كحد أقصى
  // --------------------------------------------------------

  const history =
    (
      Math.min(
        games,
        10
      ) /
      10
    ) * 60;


  // --------------------------------------------------------
  // تعدد المصادر: 30 نقطة كحد أقصى
  // --------------------------------------------------------

  const providerScore =
    Math.min(
      providerCount,
      4
    ) * 7.5;


  // --------------------------------------------------------
  // التحقق من المباراة: 10 نقاط
  // --------------------------------------------------------

  const fixtureScore =
    fixture
      ? 10
      : 0;


  const raw =
    history +
    providerScore +
    fixtureScore;


  // --------------------------------------------------------
  // HARD CAPS BY PROVIDER COUNT
  // --------------------------------------------------------

  let providerCap;


  if(
    providerCount <= 0
  ){

    providerCap =
      0;

  }

  else if(
    providerCount === 1
  ){

    providerCap =
      55;

  }

  else if(
    providerCount === 2
  ){

    providerCap =
      75;

  }

  else if(
    providerCount === 3
  ){

    providerCap =
      90;

  }

  else{

    providerCap =
      100;

  }


  return Math.round(

    clamp(
      Math.min(
        raw,
        providerCap
      ),

      0,

      100
    )

  );

}


// ==========================================================
// BASE RESPONSE
// ==========================================================

function baseResponse(
  home,
  away,
  providers,
  usable,
  status,
  message
){

  return {

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

    match: {

      home,

      away

    },

    analysisStatus:
      status,

    message,

    predictions:
      fallbackPredictions(
        home,
        away
      ),

    recommendation: {

      recommended:
        false,

      message:
        "لا يوجد رهان موصى به: البيانات غير كافية أو لم يتم التحقق من المباراة عبر مصادر متعددة."

    },

    providers,

    providerCount:
      providers.length,

    successfulProviderCount:
      usable.length,

    dataQuality:
      0,

    validation: {

      minimumProvidersRequired:
        2,

      successfulProviders:
        usable.length,

      multiProviderVerified:
        usable.length >= 2

    }

  };

}


// ==========================================================
// FALLBACK
// ==========================================================

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
        "لا توجد بيانات كافية."

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
        "لا توجد بيانات كافية."

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
        "لا توجد بيانات كافية."

    }

  ];

}


// ==========================================================
// NORMALIZE TEAM NAME
// ==========================================================

function normalizeName(
  value
){

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
// TEAM NAME MATCH
// ==========================================================

function namesMatch(
  first,
  second
){

  if(
    !first ||
    !second
  ){

    return false;

  }


  if(
    first === second ||
    first.includes(second) ||
    second.includes(first)
  ){

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


// ==========================================================
// CLAMP
// ==========================================================

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


// ==========================================================
// ROUND
// ==========================================================

function round(
  value
){

  return Math.round(
    Number(value) *
    100
  ) / 100;

}


// ==========================================================
// JSON RESPONSE
// ==========================================================

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

      headers: {

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
