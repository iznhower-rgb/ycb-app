// Y.C.B FINAL WORKER 2.2.0

import {
  getProviders,
  getAllMatchData
} from "./providers.js";

import "./espnProvider.js";
import "./footballDataProvider.js";
import "./sofaScoreProvider.js";
import "./theSportsDBProvider.js";
import "./bsdProvider.js";

const VERSION =
  "2.2.0";


const HTML = `<!doctype html>

<html
  lang="ar"
  dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
Y.C.B Football Prediction Engine
</title>

<style>

*{
  box-sizing:border-box
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#0f172a;
  color:#fff
}

.app{
  max-width:620px;
  margin:auto;
  padding:22px 16px 50px
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
  padding:18px;
  margin-bottom:16px
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
  padding:15px;
  margin:10px 0
}

.rank{
  font-size:18px;
  font-weight:bold
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
  margin-top:12px
}

.stats{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:9px
}

.stat{
  background:#0f172a;
  border-radius:11px;
  padding:11px;
  text-align:center;
  color:#cbd5e1
}

.stat strong{
  display:block;
  color:#fff;
  font-size:18px;
  margin-top:4px
}

.providers{
  color:#cbd5e1;
  font-size:13px;
  line-height:2
}

.scoreline{
  text-align:center;
  color:#cbd5e1;
  line-height:1.8;
  margin-top:12px
}

.analysis-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:9px
}

.analysis-item{
  background:#0f172a;
  border-radius:11px;
  padding:11px;
  text-align:center;
  color:#cbd5e1
}

.analysis-item b{
  display:block;
  color:#fff;
  font-size:18px;
  margin-top:4px
}

.note{
  font-size:12px;
  color:#94a3b8;
  line-height:1.6;
  margin-top:12px
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
        JSON.parse(
          text
        );

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

        prediction.label;


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


    recommendation.textContent =
      data.recommendation?.message ||
      "لا توجد توصية.";


    recommendation.className =
      data.recommendation?.recommended
        ? "warning-box success"
        : "warning-box";


    const analysis =
      data.analysis ||
      {};


    set(
      "homeGames",
      analysis.home?.games
    );


    set(
      "awayGames",
      analysis.away?.games
    );


    set(
      "homeGF",
      analysis.home?.goalsForAvg
    );


    set(
      "awayGF",
      analysis.away?.goalsForAvg
    );


    set(
      "homeGA",
      analysis.home?.goalsAgainstAvg
    );


    set(
      "awayGA",
      analysis.away?.goalsAgainstAvg
    );


    set(
      "homeXg",
      analysis.model?.homeXg
    );


    set(
      "awayXg",
      analysis.model?.awayXg
    );


    set(
      "homeWin",
      pct(
        analysis.model?.homeWin
      )
    );


    set(
      "draw",
      pct(
        analysis.model?.draw
      )
    );


    set(
      "awayWin",
      pct(
        analysis.model?.awayWin
      )
    );


    set(
      "btts",
      pct(
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


function set(
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


function pct(
  value
){

  return typeof value ===
    "number"

    ? (
        Math.round(
          value *
          10000
        ) / 100
      ) + "%"

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


        const merged =
          mergeProviderData(
            usable
          );


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


        const analysis =
          buildTeamAnalysis(
            home,
            away,
            merged
          );


        const dataQuality =
          calculateDataQuality(
            analysis,
            usable.length,
            Boolean(
              merged.fixture
            )
          );


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


        const result =
          buildPredictions(
            analysis
          );


        const top =
          result.predictions[0];


        const recommended =
          Boolean(

            top &&

            top.probabilityValue >=
              0.60 &&

            dataQuality >=
              60

          );


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

          analysisStatus:
            "ready",

          message:
            "اكتمل تحليل المباراة بنجاح.",

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

              recommended

                ? `التوقع الأقوى حاليًا: ${top.label} بنسبة ${top.probability}.`

                : "لا يوجد رهان موصى به: الثقة أو جودة البيانات أقل من الحد المطلوب."

          },

          predictedScore:
            result.predictedScore,

          dataQuality,

          providers:
            providerResults,

          providerCount:
            providerResults.length,

          successfulProviderCount:
            usable.length

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

    homeXg,

    awayXg,

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


function buildPredictions(
  analysis
){

  const model =
    analysis.model;


  const home =
    analysis.home;


  const away =
    analysis.away;


  const candidates = [

    [

      "homeWin",

      `فوز ${home.team}`,

      model.homeWin,

      "قوة الهجوم والدفاع والنتائج الأخيرة."

    ],

    [

      "draw",

      "التعادل",

      model.draw,

      "احتمال التعادل وفق توزيع أهداف بواسون."

    ],

    [

      "awayWin",

      `فوز ${away.team}`,

      model.awayWin,

      "قوة الهجوم والدفاع والنتائج الأخيرة."

    ],

    [

      "over25",

      "أكثر من 2.5 هدف",

      model.over25,

      "احتمال تسجيل ثلاثة أهداف أو أكثر."

    ],

    [

      "under25",

      "أقل من 2.5 هدف",

      model.under25,

      "احتمال تسجيل صفر إلى هدفين."

    ],

    [

      "bttsYes",

      "كلا الفريقين يسجلان",

      model.bttsYes,

      "احتمال تسجيل الفريقين هدفًا واحدًا على الأقل."

    ],

    [

      "bttsNo",

      "ليس كلا الفريقين يسجلان",

      model.bttsNo,

      "احتمال عدم تسجيل أحد الفريقين على الأقل."

    ]

  ];


  candidates.sort(
    (a,b) =>
      b[2] -
      a[2]
  );


  return {

    predictions:

      candidates

        .slice(
          0,
          3
        )

        .map(
          item => ({

            outcome:
              item[0],

            label:
              item[1],

            probabilityValue:
              item[2],

            probability:
              `${round(
                item[2] *
                100
              )}%`,

            explanation:
              item[3]

          })
        ),

    predictedScore:

      `${model.bestScore.home} - ${model.bestScore.away}`

  };

}


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


  const history =
    (
      Math.min(
        games,
        10
      ) /
      10
    ) *
    80;


  const providers =
    Math.min(
      providerCount,
      2
    ) *
    10;


  const fixtureScore =
    fixture
      ? 10
      : 0;


  return Math.round(

    clamp(
      history +
      providers +
      fixtureScore,

      0,

      100
    )

  );

}


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
        "لا يوجد رهان موصى به: البيانات غير كافية أو لم يتم التحقق من المباراة."

    },

    providers,

    providerCount:
      providers.length,

    successfulProviderCount:
      usable.length,

    dataQuality:
      0

  };

}


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


function round(
  value
){

  return Math.round(
    Number(value) *
    100
  ) / 100;

}


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
