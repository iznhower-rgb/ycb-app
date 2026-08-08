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
  value="Barcelona vs Real Madrid"
  placeholder="Barcelona vs Real Madrid"
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

<h2>أفضل التوقعات</h2>


<div class="prediction">

<div
  id="prediction1"
  class="rank"
>
🥇 التوقع الأول
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
🥈 التوقع الثاني
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
🥉 التوقع الثالث
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


  const match =
    input.value.trim();


  if(!match){

    status.className="error";

    status.textContent=
      "أدخل اسم المباراة أولاً.";

    return;

  }


  button.disabled=true;

  result.style.display="none";

  status.className="";

  status.textContent=
    "جاري تحليل المباراة...";


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


    if(
      !Array.isArray(
        data.predictions
      )
    ){

      throw new Error(
        "نتيجة التوقعات غير موجودة."
      );

    }


    if(
      data.predictions.length < 3
    ){

      throw new Error(
        "نتيجة التوقعات غير مكتملة."
      );

    }


    const p1 =
      data.predictions[0];

    const p2 =
      data.predictions[1];

    const p3 =
      data.predictions[2];


    document.getElementById(
      "prediction1"
    ).textContent =
      "🥇 " + p1.label;


    document.getElementById(
      "probability1"
    ).textContent =
      p1.probability + "%";


    document.getElementById(
      "prediction2"
    ).textContent =
      "🥈 " + p2.label;


    document.getElementById(
      "probability2"
    ).textContent =
      p2.probability + "%";


    document.getElementById(
      "prediction3"
    ).textContent =
      "🥉 " + p3.label;


    document.getElementById(
      "probability3"
    ).textContent =
      p3.probability + "%";


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
                provider.provider
              );

            }
          )
          .join("<br>");

    }


    result.style.display=
      "block";


    status.className="";

    status.textContent=
      "تم التحليل بواسطة Y.C.B";


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


// =====================================================
// WORKER
// =====================================================

export default {

  async fetch(request, env){

    const url =
      new URL(request.url);


    // =================================================
    // OPTIONS / CORS
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


        // ---------------------------------------------
        // Parse:
        // Barcelona vs Real Madrid
        // ---------------------------------------------

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
                "اكتب المباراة بهذا الشكل: Barcelona vs Real Madrid"
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


        // =================================================
        // IMPORTANT:
        // إرسال env إلى جميع مزودي البيانات
        // =================================================

        const providerResults =
          await getAllMatchData(
            home,
            away,
            env
          );


        // =================================================
        // Y.C.B TEMPORARY PREDICTION
        // =================================================

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

            home:home,

            away:away

          },


          providers:
            providerResults,


          probabilities:
            prediction.probabilities,


          predictions:
            prediction.predictions

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


    // =================================================
    // FRONTEND
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
// TEMPORARY Y.C.B PREDICTION
// =====================================================

function calculatePrediction(
  home,
  away
){

  let homeRating = 50;

  let awayRating = 50;


  // أفضلية الأرض
  homeRating += 7;


  const difference =
    homeRating -
    awayRating;


  let homeProb =
    45 +
    difference * 0.5;


  let drawProb =
    27;


  let awayProb =
    28 -
    difference * 0.5;


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
    homeProb /
    total *
    100;


  drawProb =
    drawProb /
    total *
    100;


  awayProb =
    awayProb /
    total *
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
    (item,index) => {

      item.rank =
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

    predictions:
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
