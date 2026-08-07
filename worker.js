export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
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
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      try {
        const body = await request.json();

        const match = body.match || "";

        if (!match.includes("vs")) {
          return json({
            error: "اكتب المباراة بهذا الشكل: Team A vs Team B"
          }, 400);
        }

        const parts = match.split(/vs/i);

        const home = parts[0].trim();
        const away = parts[1].trim();

        if (!home || !away) {
          return json({
            error: "يجب إدخال الفريقين"
          }, 400);
        }

        // النموذج الأساسي الأول لـ Y.C.B
        const prediction = calculatePrediction(home, away);

        return json({
          app: "Y.C.B",
          engine: "Y.C.B Prediction Engine",
          version: "1.0.0",
          match: {
            home,
            away
          },
          probabilities: prediction.probabilities,
          predictions: prediction.predictions
        });

      } catch (error) {
        return json({
          error: "حدث خطأ أثناء تحليل المباراة"
        }, 500);
      }
    }

    return json({
      app: "Y.C.B",
      status: "online"
    });
  }
};


// ================================
// Y.C.B Prediction Engine
// ================================

function calculatePrediction(home, away) {

  // القوة الأساسية المؤقتة
  // سيتم تطوير هذه القاعدة لاحقًا ببيانات حقيقية
  let homeRating = 50;
  let awayRating = 50;

  // أفضلية الأرض
  homeRating += 7;

  // فرق القوة البسيط
  const difference = homeRating - awayRating;

  let homeProb = 45 + difference * 0.5;
  let drawProb = 27;
  let awayProb = 28 - difference * 0.5;

  // حماية القيم
  homeProb = Math.max(5, homeProb);
  drawProb = Math.max(5, drawProb);
  awayProb = Math.max(5, awayProb);

  // التطبيع إلى 100%
  const total = homeProb + drawProb + awayProb;

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
  ].sort((a, b) => b.probability - a.probability);

  return {
    probabilities,
    predictions
  };
}


function round(value) {
  return Math.round(value * 10) / 10;
}


// ================================
// Helpers
// ================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders()
    }
  });
}
