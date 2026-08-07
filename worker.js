export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // اختبار الخادم
    if (url.pathname === "/api/health") {
      return json({
        status: "ok",
        app: "Y.C.B",
        engine: "Y.C.B Prediction Engine",
        version: "1.0.0"
      });
    }

    // تحليل المباراة
    if (url.pathname === "/api/analyze") {

      if (request.method !== "POST") {
        return json({
          error: "يجب استخدام POST"
        }, 405);
      }

      try {
        const body = await request.json();

        const match = String(body.match || "").trim();

        if (!match) {
          return json({
            error: "لم يتم إدخال المباراة"
          }, 400);
        }

        const parts = match.split(/\s+vs\s+/i);

        if (parts.length !== 2) {
          return json({
            error: "اكتب المباراة بهذا الشكل: Barcelona vs Real Madrid"
          }, 400);
        }

        const home = parts[0].trim();
        const away = parts[1].trim();

        if (!home || !away) {
          return json({
            error: "يجب إدخال الفريقين"
          }, 400);
        }

        const prediction = calculatePrediction(home, away);

        return json({
          success: true,
          app: "Y.C.B",
          engine: "Y.C.B Prediction Engine",
          version: "1.0.0",

          match: {
            home: home,
            away: away
          },

          probabilities: prediction.probabilities,

          predictions: prediction.predictions
        });

      } catch (error) {

        return json({
          success: false,
          error: "تعذر تحليل البيانات",
          details: error.message
        }, 500);
      }
    }

    // الصفحة الرئيسية
    return new Response("Y.C.B Server Online", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8"
      }
    });
  }
};


// ======================================
// Y.C.B Prediction Engine
// ======================================

function calculatePrediction(home, away) {

  // الإصدار الأول من محرك Y.C.B
  // سيتم تطويره لاحقاً ببيانات حقيقية

  let homeRating = 50;
  let awayRating = 50;

  // أفضلية الأرض
  homeRating += 7;

  const difference = homeRating - awayRating;

  let homeProb = 45 + difference * 0.5;
  let drawProb = 27;
  let awayProb = 28 - difference * 0.5;

  homeProb = Math.max(5, homeProb);
  drawProb = Math.max(5, drawProb);
  awayProb = Math.max(5, awayProb);

  const total =
    homeProb +
    drawProb +
    awayProb;

  homeProb = (homeProb / total) * 100;
  drawProb = (drawProb / total) * 100;
  awayProb = (awayProb / total) * 100;

  const probabilities = {
    homeWin: round(homeProb),
    draw: round(drawProb),
    awayWin: round(awayProb)
  };

  const predictions = [
    {
      rank: 1,
      outcome: "homeWin",
      label: `فوز ${home}`,
      probability: probabilities.homeWin
    },

    {
      rank: 2,
      outcome: "draw",
      label: "التعادل",
      probability: probabilities.draw
    },

    {
      rank: 3,
      outcome: "awayWin",
      label: `فوز ${away}`,
      probability: probabilities.awayWin
    }
  ];

  predictions.sort(
    (a, b) => b.probability - a.probability
  );

  predictions.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    probabilities,
    predictions
  };
}


// ======================================
// Helpers
// ======================================

function round(value) {
  return Math.round(value * 10) / 10;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status: status,

      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        ...corsHeaders()
      }
    }
  );
}
