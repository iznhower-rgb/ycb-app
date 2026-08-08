// ============================================
// Y.C.B - WORKER
// ============================================

import {
  getProviders,
  getMatchData
} from "./providers.js";


// Register available providers
import "./mockProvider.js";


// ============================================
// Main Worker
// ============================================

export default {

  async fetch(request) {

    try {

      const url = new URL(request.url);


      // ----------------------------------------
      // CORS / OPTIONS
      // ----------------------------------------

      if (request.method === "OPTIONS") {

        return new Response(null, {
          status: 204,
          headers: corsHeaders()
        });

      }


      // ----------------------------------------
      // HEALTH
      // ----------------------------------------

      if (url.pathname === "/api/health") {

        return json({

          success: true,

          status: "ok",

          app: "Y.C.B",

          engine: "Y.C.B Prediction Engine",

          version: "1.0.0"

        });

      }


      // ----------------------------------------
      // PROVIDERS
      // ----------------------------------------

      if (url.pathname === "/api/providers") {

        return json({

          success: true,

          providers: getProviders()

        });

      }


      // ----------------------------------------
      // ANALYZE
      // ----------------------------------------

      if (url.pathname === "/api/analyze") {

        if (request.method !== "POST") {

          return json({

            success: false,

            error: "POST required"

          }, 405);

        }


        let body;

        try {

          body = await request.json();

        } catch {

          return json({

            success: false,

            error: "Invalid JSON body"

          }, 400);

        }


        const match =
          String(body?.match || "").trim();


        if (!match) {

          return json({

            success: false,

            error:
              "اكتب المباراة بهذا الشكل: Team A vs Team B"

          }, 400);

        }


        // Accept:
        // Team A vs Team B
        // Team A VS Team B
        // Team A vs. Team B

        const parts =
          match.split(/\s+vs\.?\s+/i);


        if (parts.length !== 2) {

          return json({

            success: false,

            error:
              "اكتب المباراة بهذا الشكل: Team A vs Team B"

          }, 400);

        }


        const home =
          parts[0].trim();

        const away =
          parts[1].trim();


        if (!home || !away) {

          return json({

            success: false,

            error:
              "يجب إدخال الفريقين"

          }, 400);

        }


        // --------------------------------------
        // Get data from registered providers
        // --------------------------------------

        const providerData =
          await getMatchData(home, away);


        // --------------------------------------
        // Run Y.C.B prediction engine
        // --------------------------------------

        const prediction =
          calculatePrediction(
            home,
            away,
            providerData
          );


        return json({

          success: true,

          app: "Y.C.B",

          engine:
            "Y.C.B Prediction Engine",

          version: "1.0.0",

          match: {

            home: home,

            away: away

          },

          providers:
            providerData,

          probabilities:
            prediction.probabilities,

          predictions:
            prediction.predictions

        });

      }


      // ----------------------------------------
      // MAIN APPLICATION
      // ----------------------------------------

      return new Response(

        HTML,

        {

          status: 200,

          headers: {

            "Content-Type":
              "text/html; charset=UTF-8",

            "Cache-Control":
              "no-store"

          }

        }

      );

    } catch (error) {

      return json({

        success: false,

        error:
          error?.message ||
          "Internal server error"

      }, 500);

    }

  }

};


// ============================================
// Y.C.B PREDICTION ENGINE
// ============================================

function calculatePrediction(
  home,
  away,
  providerData
) {

  // ------------------------------------------
  // Temporary baseline model
  // ------------------------------------------

  let homeRating = 50;

  let awayRating = 50;


  // Home advantage

  homeRating += 7;


  const difference =
    homeRating - awayRating;


  let homeProb =
    45 + difference * 0.5;


  let drawProb = 27;


  let awayProb =
    28 - difference * 0.5;


  // Protection

  homeProb =
    Math.max(5, homeProb);

  drawProb =
    Math.max(5, drawProb);

  awayProb =
    Math.max(5, awayProb);


  // Normalize

  const total =
    homeProb +
    drawProb +
    awayProb;


  homeProb =
    (homeProb / total) * 100;


  drawProb =
    (drawProb / total) * 100;


  awayProb =
    (awayProb / total) * 100;


  const probabilities = {

    homeWin:
      round(homeProb),

    draw:
      round(drawProb),

    awayWin:
      round(awayProb)

  };


  const predictions = [

    {

      outcome: "homeWin",

      label:
        "فوز " + home,

      probability:
        probabilities.homeWin

    },

    {

      outcome: "draw",

      label:
        "التعادل",

      probability:
        probabilities.draw

    },

    {

      outcome: "awayWin",

      label:
        "فوز " + away,

      probability:
        probabilities.awayWin

    }

  ];


  predictions.sort(

    (a, b) =>
      b.probability -
      a.probability

  );


  predictions.forEach(

    (prediction, index) => {

      prediction.rank =
        index + 1;

    }

  );


  return {

    probabilities,

    predictions

  };

}


// ============================================
// ROUND
// ============================================

function round(value) {

  return Math.round(
    value * 10
  ) / 10;

}


// ============================================
// JSON RESPONSE
// ============================================

function json(
  data,
  status = 200
) {

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
          "application/json; charset=UTF-8",

        ...corsHeaders()

      }

    }

  );

}


// ============================================
// CORS
// ============================================

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin":
      "*",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"

  };

}


// ============================================
// Y.C.B HTML APPLICATION
// ============================================

const HTML = `<!DOCTYPE html>

<html
  lang="ar"
  dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>Y.C.B</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  font-family:
    Arial,
    sans-serif;

  background:
    #0f172a;

  color:
    white;

  text-align:
    center;

}

.app {

  max-width:
    500px;

  margin:
    auto;

  padding:
    30px 20px;

}

h1 {

  font-size:
    42px;

  margin:
    10px 0 5px;

}

.subtitle {

  color:
    #94a3b8;

  margin-bottom:
    35px;

}

.card {

  background:
    #1e293b;

  border-radius:
    18px;

  padding:
    22px;

  margin-bottom:
    20px;

}

input {

  width:
    100%;

  padding:
    15px;

  border:
    none;

  border-radius:
    10px;

  font-size:
    16px;

  margin-bottom:
    15px;

  text-align:
    center;

}

button {

  width:
    100%;

  padding:
    15px;

  border:
    none;

  border-radius:
    10px;

  background:
    #22c55e;

  color:
    white;

  font-size:
    18px;

  font-weight:
    bold;

}

button:disabled {

  opacity:
    0.6;

}

#status {

  margin-top:
    15px;

  color:
    #94a3b8;

}

#result {

  display:
    none;

  margin-top:
    25px;

}

.prediction {

  background:
    #334155;

  border-radius:
    12px;

  padding:
    15px;

  margin:
    10px 0;

  text-align:
    right;

}

.rank {

  font-size:
    20px;

  font-weight:
    bold;

  margin-bottom:
    8px;

}

.probability {

  color:
    #4ade80;

  font-size:
    19px;

  font-weight:
    bold;

}

.error {

  color:
    #f87171 !important;

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

<h2>
اختر مباراة
</h2>

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

<h2>
أفضل التوقعات
</h2>

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

</div>

</div>


<script>

async function analyze() {

  const input =
    document.getElementById(
      "match"
    );

  const button =
    document.getElementById(
      "button"
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


  if (!match) {

    status.className =
      "error";

    status.textContent =
      "اكتب المباراة أولاً";

    return;

  }


  button.disabled =
    true;

  status.className =
    "";

  status.textContent =
    "جاري التحليل...";

  result.style.display =
    "none";


  try {

    const response =
      await fetch(
        "/api/analyze",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({
              match: match
            })

        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(

        data.error ||
        "فشل التحليل"

      );

    }


    const predictions =
      data.predictions;


    if (
      !Array.isArray(
        predictions
      ) ||
      predictions.length !== 3
    ) {

      throw new Error(
        "نتيجة Y.C.B غير مكتملة"
      );

    }


    document
      .getElementById("p1")
      .textContent =
        "🥇 " +
        predictions[0].label;


    document
      .getElementById("v1")
      .textContent =
        predictions[0].probability +
        "%";


    document
      .getElementById("p2")
      .textContent =
        "🥈 " +
        predictions[1].label;


    document
      .getElementById("v2")
      .textContent =
        predictions[1].probability +
        "%";


    document
      .getElementById("p3")
      .textContent =
        "🥉 " +
        predictions[2].label;


    document
      .getElementById("v3")
      .textContent =
        predictions[2].probability +
        "%";


    result.style.display =
      "block";


    status.className =
      "";

    status.textContent =
      "تم التحليل بواسطة Y.C.B";


  } catch (error) {

    status.className =
      "error";

    status.textContent =
      error.message ||
      "حدث خطأ";


  } finally {

    button.disabled =
      false;

  }

}

</script>

</body>

</html>`;
