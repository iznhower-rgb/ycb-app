import {
  getProviders,
  getAllMatchData
} from "./providers.js";

import "./mockProvider.js";
import "./footballDataProvider.js";


// =====================================================
// Y.C.B HTML
// =====================================================

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
  margin-bottom:5px;
}

.subtitle{
  color:#94a3b8;
  margin-bottom:35px;
}

.card,
.prediction{
  background:#1e293b;
  border-radius:18px;
  padding:22px;
  margin-bottom:18px;
}

input{
  width:100%;
  padding:15px;
  border:0;
  border-radius:10px;
  font-size:16px;
  margin-bottom:15px;
  text-align:center;
}

button{
  width:100%;
  padding:15px;
  border:0;
  border-radius:10px;
  background:#22c55e;
  color:white;
  font-size:18px;
  font-weight:bold;
}

button:disabled{
  opacity:.6;
}

#status{
  margin-top:15px;
  color:#94a3b8;
}

#result{
  display:none;
  margin-top:25px;
}

.prediction{
  text-align:right;
  background:#334155;
}

.rank{
  font-size:20px;
  font-weight:bold;
  margin-bottom:8px;
}

.probability{
  color:#4ade80;
  font-size:19px;
  font-weight:bold;
}

.error{
  color:#f87171!important;
}

.provider-info{
  margin-top:20px;
  color:#94a3b8;
  font-size:14px;
  line-height:1.8;
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
  type="text"
  placeholder="Barcelona vs Real Madrid"
>

<button
  id="button"
  onclick="analyze()"
>
تحليل المباراة
</button>

<div id="status"></div>

</div>

<div id="result">

<h2>أفضل التوقعات</h2>

<div class="prediction">

<div
  class="rank"
  id="p1"
>
🥇 التوقع الأول
</div>

<div
  class="probability"
  id="v1"
></div>

</div>

<div class="prediction">

<div
  class="rank"
  id="p2"
>
🥈 التوقع الثاني
</div>

<div
  class="probability"
  id="v2"
></div>

</div>

<div class="prediction">

<div
  class="rank"
  id="p3"
>
🥉 التوقع الثالث
</div>

<div
  class="probability"
  id="v3"
></div>

</div>

<div
  class="provider-info"
  id="providerInfo"
></div>

</div>

</div>

<script>

async function analyze(){

  const input =
    document.getElementById("match");

  const button =
    document.getElementById("button");

  const status =
    document.getElementById("status");

  const result =
    document.getElementById("result");

  const providerInfo =
    document.getElementById("providerInfo");

  const match =
    input.value.trim();

  if(!match){

    status.className="error";

    status.textContent=
      "اكتب المباراة أولاً";

    return;

  }

  button.disabled=true;

  status.className="";

  status.textContent=
    "جاري التحليل...";

  result.style.display="none";

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

          body:
            JSON.stringify({
              match
            })
        }
      );

    const text =
      await response.text();

    if(!text){

      throw new Error(
        "الخادم أعاد استجابة فارغة"
      );

    }

    let data;

    try{

      data =
        JSON.parse(text);

    }catch{

      throw new Error(
        "استجابة الخادم غير صالحة"
      );

    }

    if(
      !response.ok ||
      !data.success
    ){

      throw new Error(
        data.error ||
        "فشل التحليل"
      );

    }

    const predictions =
      data.predictions;

    if(
      !predictions ||
      predictions.length !== 3
    ){

      throw new Error(
        "نتيجة Y.C.B غير مكتملة"
      );

    }

    document.getElementById("p1")
      .textContent =
      "🥇 " +
      predictions[0].label;

    document.getElementById("v1")
      .textContent =
      predictions[0].probability +
      "%";

    document.getElementById("p2")
      .textContent =
      "🥈 " +
      predictions[1].label;

    document.getElementById("v2")
      .textContent =
      predictions[1].probability +
      "%";

    document.getElementById("p3")
      .textContent =
      "🥉 " +
      predictions[2].label;

    document.getElementById("v3")
      .textContent =
      predictions[2].probability +
      "%";

    if(
      Array.isArray(data.providers)
    ){

      const providerLines =
        data.providers.map(
          provider => {

            const status =
              provider.success
                ? "✓"
                : "✗";

            return (
              status +
              " " +
              provider.provider
            );

          }
        );

      providerInfo.innerHTML =
        providerLines.join("<br>");

    }

    result.style.display=
      "block";

    status.textContent=
      "تم التحليل بواسطة Y.C.B";

  }catch(error){

    status.className=
      "error";

    status.textContent=
      error.message ||
      "حدث خطأ";

  }finally{

    button.disabled=false;

  }

}

</script>

</body>

</html>`;


// =====================================================
// WORKER
// =====================================================

export default {

  async fetch(request, env){

    const url =
      new URL(request.url);


    // =================================================
    // CORS / OPTIONS
    // =================================================

    if(
      request.method === "OPTIONS"
    ){

      return json({
        success:true
      });

    }


    // =================================================
    // HEALTH
    // =================================================

    if(
      url.pathname === "/api/health"
    ){

      return json({

        success:true,

        status:"ok",

        app:"Y.C.B",

        engine:
          "Y.C.B Prediction Engine",

        version:"1.2.0",

        architecture:
          "Multi Provider Architecture"

      });

    }


    // =================================================
    // PROVIDERS
    // =================================================

    if(
      url.pathname === "/api/providers"
    ){

      return json({

        success:true,

        providers:
          getProviders()

      });

    }


    // =================================================
    // ANALYZE
    // =================================================

    if(
      url.pathname === "/api/analyze"
    ){

      if(
        request.method !== "POST"
      ){

        return json(
          {
            success:false,
            error:"POST required"
          },
          405
        );

      }


      try{

        const body =
          await request.json();


        const match =
          String(
            body.match || ""
          ).trim();


        if(!match){

          return json(
            {
              success:false,
              error:
                "يجب إدخال المباراة"
            },
            400
          );

        }


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
                "اكتب المباراة بهذا الشكل: Team A vs Team B"
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
                "يجب إدخال الفريقين"
            },
            400
          );

        }


        // =============================================
        // GET DATA FROM ALL PROVIDERS
        // =============================================

        const providerResults =
          await getAllMatchData(
            home,
            away,
            env
          );


        // =============================================
        // TEMPORARY PREDICTION
        // =============================================

        const prediction =
          calculatePrediction(
            home,
            away
          );


        return json({

          success:true,

          app:"Y.C.B",

          engine:
            "Y.C.B Prediction Engine",

          version:"1.2.0",

          architecture:
            "Multi Provider Architecture",

          match:{
            home,
            away
          },

          providers:
            providerResults,

          probabilities:
            prediction.probabilities,

          predictions:
            prediction.predictions

        });


      }catch(error){

        return json(
          {
            success:false,

            error:
              error?.message ||
              "Unknown server error"
          },
          500
        );

      }

    }


    // =================================================
    // MAIN APP
    // =================================================

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


// =====================================================
// TEMPORARY PREDICTION ENGINE
// =====================================================

function calculatePrediction(
  home,
  away
){

  let homeRating=50;

  let awayRating=50;


  homeRating += 7;


  const difference =
    homeRating -
    awayRating;


  let homeProb =
    45 +
    (difference * 0.5);


  let drawProb =
    27;


  let awayProb =
    28 -
    (difference * 0.5);


  homeProb =
    Math.max(
      5,
      homeProb
    );


  drawProb =
    Math.max(
      5,
      drawProb
    );


  awayProb =
    Math.max(
      5,
      awayProb
    );


  const total =
    homeProb +
    drawProb +
    awayProb;


  homeProb =
    (homeProb / total) *
    100;


  drawProb =
    (drawProb / total) *
    100;


  awayProb =
    (awayProb / total) *
    100;


  const predictions = [

    {
      outcome:"homeWin",

      label:
        "فوز " + home,

      probability:
        round(homeProb)
    },

    {
      outcome:"draw",

      label:
        "التعادل",

      probability:
        round(drawProb)
    },

    {
      outcome:"awayWin",

      label:
        "فوز " + away,

      probability:
        round(awayProb)
    }

  ];


  predictions.sort(
    (a,b) =>
      b.probability -
      a.probability
  );


  predictions.forEach(
    (prediction,index) => {

      prediction.rank =
        index + 1;

    }
  );


  return {

    probabilities:{

      homeWin:
        round(homeProb),

      draw:
        round(drawProb),

      awayWin:
        round(awayProb)

    },

    predictions

  };

}


// =====================================================
// ROUND
// =====================================================

function round(value){

  return Math.round(
    value * 10
  ) / 10;

}


// =====================================================
// JSON RESPONSE
// =====================================================

function json(
  data,
  status=200
){

  return new Response(

    JSON.stringify(data),

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
