// ==========================================
// Y.C.B WORKER
// ==========================================

import {
  getProviders,
  getAllMatchData
} from "./providers.js";

import "./mockProvider.js";
import "./footballDataProvider.js";


// ==========================================
// HTML
// ==========================================

const HTML = `<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

<title>Y.C.B</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#0f172a;
  color:white;
  text-align:center;
}

.app{
  max-width:500px;
  margin:auto;
  padding:30px 20px;
}

h1{
  font-size:42px;
  margin:10px 0 5px;
}

.subtitle{
  color:#94a3b8;
  margin-bottom:35px;
}

.card{
  background:#1e293b;
  border-radius:18px;
  padding:25px;
}

input{
  width:100%;
  padding:16px;
  border:0;
  border-radius:12px;
  font-size:17px;
  text-align:center;
  margin-bottom:16px;
}

button{
  width:100%;
  padding:17px;
  border:0;
  border-radius:12px;
  background:#22c55e;
  color:white;
  font-size:19px;
  font-weight:bold;
}

button:disabled{
  opacity:.6;
}

#status{
  margin-top:18px;
  color:#94a3b8;
  font-size:16px;
  line-height:1.6;
}

.error{
  color:#f87171 !important;
}

.warning{
  color:#fbbf24 !important;
}

#result{
  display:none;
  margin-top:35px;
}

.prediction{
  background:#334155;
  border-radius:18px;
  padding:25px;
  margin:18px 0;
  text-align:center;
}

.rank{
  font-size:22px;
  font-weight:bold;
}

.probability{
  margin-top:12px;
  color:#4ade80;
  font-size:22px;
  font-weight:bold;
}

.provider-info{
  margin-top:25px;
  color:#94a3b8;
  font-size:14px;
  line-height:2;
  text-align:right;
}

.data-warning{
  margin-top:20px;
  padding:15px;
  border-radius:12px;
  background:#422006;
  color:#fbbf24;
  line-height:1.7;
}

.match-data{
  margin-top:20px;
  padding:15px;
  background:#1e293b;
  border-radius:12px;
  text-align:right;
  line-height:1.9;
}

</style>

</head>

<body>

<div class="app">

<h1>Y.C.B</h1>

<div class="subtitle">
Football Prediction Engine
</div>

<div class="card">

<h2>اختر مباراة</h2>

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

<div id="result">

<h2>حالة التحليل</h2>

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

</div>

<div
  id="providerInfo"
  class="provider-info"
>
</div>

<div
  id="matchData"
  class="match-data"
  style="display:none"
>
</div>

<div
  id="dataWarning"
  class="data-warning"
  style="display:none"
>
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

  const providerInfo =
    document.getElementById("providerInfo");

  const matchData =
    document.getElementById("matchData");

  const dataWarning =
    document.getElementById("dataWarning");


  const match =
    input.value.trim();


  if(!match){

    status.className="error";

    status.textContent=
      "أدخل المباراة أولاً.";

    return;

  }


  button.disabled=true;

  result.style.display="none";

  dataWarning.style.display="none";

  matchData.style.display="none";

  status.className="";

  status.textContent=
    "جاري الاتصال بمصادر البيانات...";


  try{

    const response =
      await fetch(
        "/api/analyze",
        {

          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({
            match:match
          })

        }
      );


    const text =
      await response.text();


    if(!text){

      throw new Error(
        "الخادم أعاد استجابة فارغة."
      );

    }


    let data;


    try{

      data =
        JSON.parse(text);

    }catch(error){

      console.error(
        "Invalid JSON:",
        text
      );

      throw new Error(
        "الخادم أعاد بيانات غير صالحة."
      );

    }


    if(!response.ok){

      throw new Error(
        data.error ||
        "حدث خطأ في الخادم."
      );

    }


    if(!data.success){

      throw new Error(
        data.error ||
        "فشل تحليل المباراة."
      );

    }


    const predictions =
      data.predictions;


    if(
      !Array.isArray(predictions) ||
      predictions.length !== 3
    ){

      throw new Error(
        "نتيجة Y.C.B غير مكتملة."
      );

    }


    const p1 =
      predictions[0];

    const p2 =
      predictions[1];

    const p3 =
      predictions[2];


    document.getElementById(
      "prediction1"
    ).textContent =
      "🥇 " + p1.label;


    document.getElementById(
      "probability1"
    ).textContent =
      p1.probability;


    document.getElementById(
      "prediction2"
    ).textContent =
      "🥈 " + p2.label;


    document.getElementById(
      "probability2"
    ).textContent =
      p2.probability;


    document.getElementById(
      "prediction3"
    ).textContent =
      "🥉 " + p3.label;


    document.getElementById(
      "probability3"
    ).textContent =
      p3.probability;


    if(
      Array.isArray(
        data.providers
      )
    ){

      providerInfo.innerHTML =
        "<strong>مصادر البيانات</strong><br>" +

        data.providers
          .map(
            provider => {

              const icon =
                provider.success
                  ? "✓"
                  : "✗";

              return (
                icon +
                " " +
                provider.provider +
                " — " +
                (
                  provider.status ||
                  "unknown"
                )
              );

            }
          )
          .join("<br>");

    }


    if(data.realData){

      const real =
        data.realData;


      const homeTeam =
        real.homeTeam?.name ||
        data.match.home;


      const awayTeam =
        real.awayTeam?.name ||
        data.match.away;


      const competition =
        real.competition?.name ||
        "-";


      const matchStatus =
        real.status ||
        "-";


      const date =
        real.utcDate ||
        "-";


      matchData.innerHTML =
        "<strong>المباراة الموجودة في المصدر</strong><br>" +
        "🏠 " +
        homeTeam +
        "<br>" +
        "✈️ " +
        awayTeam +
        "<br>" +
        "🏆 " +
        competition +
        "<br>" +
        "📅 " +
        date +
        "<br>" +
        "📌 " +
        matchStatus;


      matchData.style.display=
        "block";

    }


    if(
      data.analysisStatus ===
      "insufficient_data"
    ){

      dataWarning.style.display=
        "block";

      dataWarning.textContent=
        data.message ||
        "البيانات غير كافية لإصدار توقع موثوق.";

      status.className=
        "warning";

      status.textContent=
        "تم الاتصال بالمصادر، لكن لا توجد بيانات كافية للتوقع.";

    }else{

      status.className="";

      status.textContent=
        "تم العثور على بيانات المباراة. مرحلة التوقع لم تُفعّل بعد.";

    }


    result.style.display=
      "block";


  }catch(error){

    console.error(error);

    status.className=
      "error";

    status.textContent=
      error.message ||
      "حدث خطأ غير معروف.";

  }finally{

    button.disabled=false;

  }

}

</script>

</body>

</html>`;


// ==========================================
// WORKER
// ==========================================

export default {

  async fetch(request, env){

    const url =
      new URL(request.url);


    // ========================================
    // OPTIONS
    // ========================================

    if(
      request.method === "OPTIONS"
    ){

      return json({
        success:true
      });

    }


    // ========================================
    // HEALTH
    // ========================================

    if(
      url.pathname === "/api/health"
    ){

      return json({

        success:true,

        status:"ok",

        app:"Y.C.B",

        engine:
          "Y.C.B Prediction Engine",

        version:"1.4.0",

        architecture:
          "Multi Provider Architecture"

      });

    }


    // ========================================
    // PROVIDERS
    // ========================================

    if(
      url.pathname === "/api/providers"
    ){

      return json({

        success:true,

        providers:
          getProviders()

      });

    }


    // ========================================
    // ANALYZE
    // ========================================

    if(
      url.pathname === "/api/analyze"
    ){

      if(
        request.method !== "POST"
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
            body?.match || ""
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


        // ==================================
        // PARSE MATCH
        // ==================================

        const parts =
          match.split(
            /\s+vs\s+/i
          );


        if(
          parts.length !== 2
        ){

          return json(
            {
              success:false,

              error:
                "اكتب المباراة بهذا الشكل: Arsenal vs Coventry City"
            },
            400
          );

        }


        const home =
          parts[0].trim();


        const away =
          parts[1].trim();


        if(
          !home ||
          !away
        ){

          return json(
            {
              success:false,

              error:
                "يجب إدخال الفريق المضيف والفريق الضيف."
            },
            400
          );

        }


        // ==================================
        // DATA PROVIDERS
        // ==================================

        const providerResults =
          await getAllMatchData(
            home,
            away,
            env
          );


        // ==================================
        // FIND REAL FOOTBALL DATA
        // ==================================

        const footballDataResult =
          providerResults.find(
            item =>
              item.provider ===
              "Football-Data.org"
          );


        const realMatchData =
          footballDataResult?.success
            ? footballDataResult.data
            : null;


        const hasRealMatch =
          Boolean(
            footballDataResult &&
            footballDataResult.success &&
            realMatchData
          );


        // ==================================
        // NO FAKE PREDICTIONS
        // ==================================

        const predictions =
          buildDataStatusPredictions(
            home,
            away,
            hasRealMatch
          );


        return json({

          success:true,

          app:"Y.C.B",

          engine:
            "Y.C.B Prediction Engine",

          version:"1.4.0",

          architecture:
            "Multi Provider Architecture",


          match:{

            home:home,

            away:away

          },


          analysisStatus:
            hasRealMatch
              ? "data_connected"
              : "insufficient_data",


          realData:
            realMatchData || null,


          providerCount:
            providerResults.length,


          successfulProviderCount:
            providerResults.filter(
              item =>
                item.success === true
            ).length,


          providers:
            providerResults,


          message:
            hasRealMatch

              ? "تم العثور على المباراة الحقيقية. لا تزال طبقة التنبؤ غير مفعلة."

              : "لم يتم العثور على المباراة المطلوبة في مصادر البيانات الحالية.",


          predictions:
            predictions

        });


      }catch(error){

        console.error(
          "Analyze error:",
          error
        );


        return json(
          {
            success:false,

            error:
              error?.message ||
              String(error) ||
              "Unknown server error"
          },
          500
        );

      }

    }


    // ========================================
    // FRONTEND
    // ========================================

    return new Response(

      HTML,

      {

        status:200,

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
// DATA STATUS PREDICTIONS
// ==========================================

function buildDataStatusPredictions(
  home,
  away,
  hasRealMatch
){

  if(hasRealMatch){

    return [

      {
        outcome:"data",

        label:
          "بيانات " + home,

        probability:
          "متصلة ✓"
      },

      {
        outcome:"data",

        label:
          "بيانات " + away,

        probability:
          "متصلة ✓"
      },

      {
        outcome:"model",

        label:
          "التوقع الرياضي",

        probability:
          "بانتظار طبقة الإحصائيات"

      }

    ];

  }


  return [

    {
      outcome:"homeWin",

      label:
        "فوز " + home,

      probability:
        "غير متاح"
    },

    {
      outcome:"draw",

      label:
        "التعادل",

      probability:
        "غير متاح"
    },

    {
      outcome:"awayWin",

      label:
        "فوز " + away,

      probability:
        "غير متاح"
    }

  ];

}


// ==========================================
// JSON RESPONSE
// ==========================================

function json(
  data,
  status=200
){

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status:status,

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
