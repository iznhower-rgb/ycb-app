/* Y.C.B - Cloudflare Worker
 * Data Layer Repair - Phase 1
 *
 * Providers:
 * 1) BSD              optional
 * 2) TheSportsDB      free
 * 3) OpenLigaDB       public / limited coverage
 * 4) SofaScore        global fallback
 *
 * Important:
 * - Provider failure never stops the whole analysis.
 * - Data is normalized before reaching the engine.
 * - Data Quality Gate prevents predictions from weak data.
 * - Poisson engine remains unchanged in this phase.
 */

const APP_NAME = "Y.C.B";
const VERSION = "3.1.0";

const HTML = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1,viewport-fit=cover">

<title>Y.C.B Football Prediction Engine</title>

<style>
:root{
  --bg:#0d1425;
  --card:#1d2a3f;
  --card2:#34465c;
  --ink:#f7f9fc;
  --muted:#aeb8c8;
  --green:#20c45a;
  --green2:#075d48;
  --danger:#e05252;
  --line:#27364d;
}

*{
  box-sizing:border-box
}

body{
  margin:0;
  background:var(--bg);
  color:var(--ink);
  font-family:Arial,sans-serif
}

main{
  max-width:720px;
  margin:auto;
  padding:28px 18px 70px
}

.brand{
  text-align:center;
  margin:12px 0 36px
}

.brand h1{
  font-size:58px;
  letter-spacing:8px;
  margin:0 0 8px
}

.brand p{
  font-size:22px;
  color:#aab5c7;
  margin:0
}

.card{
  background:var(--card);
  border-radius:34px;
  padding:26px;
  margin:18px 0;
  box-shadow:0 10px 30px #0002
}

h2{
  font-size:32px;
  margin:0 0 22px;
  text-align:center
}

input{
  width:100%;
  border:0;
  border-radius:22px;
  padding:22px 20px;
  font-size:23px;
  text-align:center;
  outline:none;
  background:#fff;
  color:#111
}

button{
  width:100%;
  border:0;
  border-radius:22px;
  padding:21px;
  margin-top:22px;
  background:var(--green);
  color:white;
  font-size:27px;
  font-weight:700;
  cursor:pointer
}

button:disabled{
  opacity:.65
}

.status{
  text-align:center;
  color:#48e884;
  font-size:20px;
  margin-top:22px;
  min-height:28px
}

.pred{
  background:var(--card2);
  border-radius:28px;
  padding:24px;
  margin:14px 0
}

.pred .title{
  font-size:27px;
  font-weight:700
}

.pred .pct{
  color:#45e87e;
  font-size:36px;
  font-weight:800;
  margin:12px 0
}

.pred .reason{
  color:#d4dbe5;
  font-size:18px;
  line-height:1.55
}

.badge{
  display:inline-block;
  font-size:18px;
  margin-left:8px
}

.now{
  background:var(--green2);
  border-radius:26px;
  padding:22px;
  text-align:center;
  color:#57ef91;
  font-size:21px;
  line-height:1.6;
  margin-top:18px
}

.score{
  text-align:center;
  color:#dbe2ec;
  font-size:22px;
  margin-top:18px
}

.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px
}

.metric{
  background:#0c1529;
  border-radius:22px;
  padding:20px;
  text-align:center;
  min-height:120px
}

.metric .label{
  color:#d0d7e2;
  font-size:20px
}

.metric .value{
  font-size:28px;
  font-weight:800;
  margin-top:12px
}

.source{
  padding:12px 0;
  border-bottom:1px solid var(--line);
  font-size:18px;
  line-height:1.5
}

.source:last-child{
  border-bottom:0
}

.ok{
  color:#63e992
}

.warn{
  color:#ffd166
}

.bad{
  color:#ff7777
}

.small{
  font-size:16px;
  color:#aeb8c8;
  line-height:1.6
}

.hidden{
  display:none
}

.loader{
  display:inline-block;
  width:17px;
  height:17px;
  border:3px solid #ffffff55;
  border-top-color:#fff;
  border-radius:50%;
  animation:spin .8s linear infinite;
  vertical-align:middle
}

@keyframes spin{
  to{
    transform:rotate(360deg)
  }
}

@media(max-width:480px){

  .brand h1{
    font-size:48px
  }

  .brand p{
    font-size:19px
  }

  h2{
    font-size:28px
  }

  .card{
    padding:20px;
    border-radius:28px
  }

  input{
    font-size:20px
  }

  .pred .title{
    font-size:23px
  }

  .pred .pct{
    font-size:32px
  }
}
</style>
</head>

<body>

<main>

<section class="brand">
  <h1>Y.C.B</h1>
  <p>Football Prediction Engine</p>
</section>

<section class="card">

  <h2>اختر مباراة</h2>

  <input
    id="match"
    value="Cameroon Women vs Nigeria Women"
    placeholder="Arsenal vs Coventry City"
  >

  <button id="analyze">
    تحليل المباراة
  </button>

  <div id="status" class="status"></div>

</section>

<section id="results" class="hidden">

<section class="card">

  <h2>أفضل 3 توقعات</h2>

  <div id="predictions"></div>

  <div id="now" class="now"></div>

  <div id="score" class="score"></div>

</section>

<section class="card">

  <h2>ملخص التحليل</h2>

  <div id="metrics" class="grid"></div>

</section>

<section class="card">

  <h2>جودة البيانات</h2>

  <div id="quality"></div>

</section>

<section class="card">

  <h2>ملخص البيانات</h2>

  <div id="dataMetrics" class="grid"></div>

  <p class="small">
    جودة البيانات لا تعني ضمان النتيجة.
    يتم احتسابها من عدد المباريات الحقيقية،
    تأكيد المباراة، وتعدد المصادر.
  </p>

</section>

<section class="card">

  <h2>مصادر البيانات</h2>

  <div id="sources"></div>

</section>

</section>

</main>

<script>

(function(){

  var btn =
    document.getElementById("analyze");

  var input =
    document.getElementById("match");

  var status =
    document.getElementById("status");

  function esc(v){

    return String(
      v == null ? "" : v
    )
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
  }

  function pct(v){

    return Number(v || 0)
      .toFixed(2) + "%";
  }

  function setMetric(
    id,
    label,
    value
  ){

    return (
      '<div class="metric">' +
      '<div class="label">' +
      esc(label) +
      '</div>' +
      '<div class="value">' +
      esc(value) +
      '</div>' +
      '</div>'
    );
  }

  function render(data){

    document
      .getElementById("results")
      .classList
      .remove("hidden");

    var predictions =
      data.predictions || [];

    document
      .getElementById("predictions")
      .innerHTML =
      predictions.length

      ? predictions.map(
          function(x,i){

            var medal =
              ["🥇","🥈","🥉"][i] || "•";

            return (
              '<div class="pred">' +

              '<div class="title">' +
              esc(x.label) +
              ' <span class="badge">' +
              medal +
              '</span>' +
              '</div>' +

              '<div class="pct">' +
              pct(x.probability) +
              '</div>' +

              '<div class="reason">' +
              esc(x.reason || "") +
              '</div>' +

              '</div>'
            );

          }
        ).join("")

      :

      '<div class="pred">' +

      '<div class="title">' +
      'لا توجد توصية آمنة حالياً' +
      '</div>' +

      '<div class="reason">' +
      'جودة البيانات الحالية لا تسمح بإصدار توقع موثوق.' +
      '</div>' +

      '</div>';

    document
      .getElementById("now")
      .textContent =
      "التوقع الأقوى حالياً: " +
      (
        data.summary?.strongestLabel ||
        "لا يوجد"
      ) +
      " بنسبة " +
      pct(
        data.summary?.strongestProbability ||
        0
      );

    document
      .getElementById("score")
      .textContent =
      "النتيجة الأكثر ترجيحاً: " +
      (
        data.summary?.mostLikelyScore ||
        "—"
      ) +
      " | جودة البيانات: " +
      Number(
        data.summary?.dataQuality ||
        0
      ) +
      "/100";

    var m =
      data.metrics || {};

    document
      .getElementById("metrics")
      .innerHTML =

      setMetric(
        "xgh",
        "xG المضيف",
        Number(m.homeXG || 0)
          .toFixed(2)
      ) +

      setMetric(
        "xga",
        "xG الضيف",
        Number(m.awayXG || 0)
          .toFixed(2)
      ) +

      setMetric(
        "home",
        "فوز المضيف",
        pct(m.homeWin)
      ) +

      setMetric(
        "draw",
        "التعادل",
        pct(m.draw)
      ) +

      setMetric(
        "btts",
        "BTTS",
        pct(m.btts)
      ) +

      setMetric(
        "away",
        "فوز الضيف",
        pct(m.awayWin)
      );

    var dm =
      data.dataSummary || {};

    document
      .getElementById("dataMetrics")
      .innerHTML =

      setMetric(
        "hm",
        "مباريات المضيف",
        dm.homeMatches || 0
      ) +

      setMetric(
        "am",
        "مباريات الضيف",
        dm.awayMatches || 0
      ) +

      setMetric(
        "hg",
        "أهداف المضيف/مباراة",
        Number(
          dm.homeGoalsPerMatch || 0
        ).toFixed(2)
      ) +

      setMetric(
        "ag",
        "أهداف الضيف/مباراة",
        Number(
          dm.awayGoalsPerMatch || 0
        ).toFixed(2)
      ) +

      setMetric(
        "hc",
        "استقبال المضيف",
        Number(
          dm.homeConcededPerMatch || 0
        ).toFixed(2)
      ) +

      setMetric(
        "ac",
        "استقبال الضيف",
        Number(
          dm.awayConcededPerMatch || 0
        ).toFixed(2)
      );

    var q =
      data.quality || {};

    document
      .getElementById("quality")
      .innerHTML =

      '<div class="pred">' +

      '<div class="title">' +
      'درجة جودة البيانات: ' +
      Number(q.score || 0) +
      '/100' +
      '</div>' +

      '<div class="reason">' +
      esc(
        q.label ||
        "غير محددة"
      ) +
      '<br><br>' +

      'المضيف: ' +
      Number(
        q.homeMatches || 0
      ) +
      ' مباراة فعلية' +

      '<br>' +

      'الضيف: ' +
      Number(
        q.awayMatches || 0
      ) +
      ' مباراة فعلية' +

      '<br>' +

      'تأكيد المباراة: ' +
      (
        q.fixtureConfirmed
        ? "نعم ✓"
        : "لا"
      ) +

      '<br>' +

      'مصادر البيانات الناجحة: ' +
      Number(
        q.successfulProviders || 0
      ) +

      '</div>' +

      '</div>';

    document
      .getElementById("sources")
      .innerHTML =
      (data.sources || [])
      .map(
        function(s){

          var cls =
            s.status === "success"
            ? "ok"
            :
            (
              s.status === "no_match" ||
              s.status === "not_configured"
            )
            ? "warn"
            : "bad";

          return (
            '<div class="source ' +
            cls +
            '">' +

            esc(s.name) +
            " — " +
            esc(
              s.statusLabel ||
              s.status
            ) +

            (
              s.message
              ? " — " +
                esc(s.message)
              : ""
            ) +

            "</div>"
          );

        }
      )
      .join("");
  }

  btn.addEventListener(
    "click",
    async function(){

      var match =
        input.value.trim();

      if(
        !match ||
        match
          .toLowerCase()
          .indexOf(" vs ") < 0
      ){

        status.textContent =
          "اكتب المباراة بهذا الشكل: Cameroon Women vs Nigeria Women";

        return;
      }

      btn.disabled = true;

      btn.innerHTML =
        '<span class="loader"></span> جارٍ التحليل...';

      status.textContent =
        "يتم جمع البيانات من المصادر الحقيقية...";

      try{

        var r =
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

        var data =
          await r.json();

        if(
          !r.ok ||
          !data.success
        ){

          throw new Error(
            data.message ||
            "تعذر التحليل"
          );
        }

        render(data);

        status.textContent =
          "اكتمل تحليل البيانات.";

        window.scrollTo({
          top:0,
          behavior:"smooth"
        });

      }catch(e){

        status.textContent =
          "خطأ: " +
          e.message;

      }finally{

        btn.disabled = false;

        btn.textContent =
          "تحليل المباراة";
      }

    }
  );

})();

</script>

</body>
</html>`;

export default {

  async fetch(
    request,
    env,
    ctx
  ){

    const url =
      new URL(
        request.url
      );

    if(
      request.method ===
      "OPTIONS"
    ){

      return new Response(
        null,
        {
          headers:
            corsHeaders()
        }
      );
    }

    if(
      url.pathname ===
      "/api/health"
    ){

      return json({

        success:true,

        app:APP_NAME,

        version:VERSION,

        status:"ok",

        time:
          new Date()
          .toISOString(),

        providers:{

          bsd:
            !!getBsdToken(env),

          thesportsdb:true,

          openligadb:true,

          sofascore:true

        }

      });
    }

    if(
      url.pathname ===
      "/api/analyze" &&
      request.method ===
      "POST"
    ){

      try{

        const body =
          await request.json();

        const match =
          String(
            body?.match || ""
          ).trim();

        const parsed =
          parseMatch(match);

        if(!parsed){

          return json(
            {
              success:false,
              message:
                "صيغة المباراة يجب أن تكون: Home vs Away"
            },
            400
          );
        }

        const result =
          await analyzeMatch(
            parsed.home,
            parsed.away,
            env,
            ctx
          );

        return json({

          success:true,

          app:APP_NAME,

          version:VERSION,

          ...result

        });

      }catch(error){

        return json(
          {
            success:false,
            message:
              error?.message ||
              String(error)
          },
          500
        );
      }
    }

    if(
      url.pathname === "/" ||
      url.pathname === "/index.html"
    ){

      return new Response(
        HTML,
        {
          headers:{
            "content-type":
              "text/html; charset=UTF-8",

            "cache-control":
              "no-store"
          }
        }
      );
    }

    return new Response(
      "Y.C.B is running.",
      {
        status:200,

        headers:{
          "content-type":
            "text/plain; charset=UTF-8"
        }
      }
    );
  }
};

function corsHeaders(){

  return {

    "access-control-allow-origin":
      "*",

    "access-control-allow-methods":
      "GET,POST,OPTIONS",

    "access-control-allow-headers":
      "Content-Type"

  };
}

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
      status,

      headers:{
        ...corsHeaders(),

        "content-type":
          "application/json; charset=UTF-8",

        "cache-control":
          "no-store"
      }
    }
  );
}

function parseMatch(
  value
){

  const m =
    String(value || "")
      .match(
        /^\s*(.+?)\s+vs\.?\s+(.+?)\s*$/i
      );

  if(!m)
    return null;

  const home =
    m[1].trim();

  const away =
    m[2].trim();

  if(
    !home ||
    !away
  )
    return null;

  return {
    home,
    away
  };
}

async function analyzeMatch(
  home,
  away,
  env,
  ctx
){

  const providers = [

    new BsdProvider(),

    new TheSportsDbProvider(),

    new OpenLigaDbProvider(),

    new SofaScoreProvider()

  ];

  const results =
    await Promise.all(

      providers.map(
        async provider => {

          try{

            return await provider
              .getMatchData(
                home,
                away,
                env,
                ctx
              );

          }catch(error){

            return {

              provider:
                provider.name,

              status:
                "error",

              message:
                error?.message ||
                String(error),

              data:null

            };
          }

        }
      )
    );

  const usable =
    results.filter(
      x => x?.data
    );

  const merged =
    mergeProviderData(
      usable,
      home,
      away
    );

  const quality =
    calculateDataQualityGate(
      merged,
      results,
      home,
      away
    );

  const analysis =
    buildAnalysis(
      merged.home,
      merged.away,
      merged.fixture,
      home,
      away,
      quality
    );

  const sources =
    results.map(
      x => ({

        name:x.provider,

        status:x.status,

        statusLabel:
          sourceStatusLabel(
            x.status
          ),

        message:
          x.message || ""

      })
    );

  return {

    match:{

      home,

      away,

      fixture:
        merged.fixture

    },

    predictions:
      analysis.predictions,

    summary:
      analysis.summary,

    metrics:
      analysis.metrics,

    dataSummary:
      analysis.dataSummary,

    quality,

    sources

  };
}

function sourceStatusLabel(
  status
){

  const map = {

    success:
      "success ✓",

    no_match:
      "متصل — لا توجد المباراة أو بيانات كافية",

    not_configured:
      "غير مفعّل — سيتم الاعتماد على بقية المصادر",

    error:
      "خطأ في المصدر",

    rate_limited:
      "مؤقتاً محدود — سيتم استخدام بقية المصادر",

    invalid_token:
      "رمز API غير صالح — تم تجاهل المصدر",

    disabled:
      "تم تجاهل المصدر"

  };

  return (
    map[status] ||
    status
  );
}

/* =========================================================
 * BSD
 * =======================================================*/

class BsdProvider{

  constructor(){

    this.name =
      "BSD";

    this.base =
      "https://sports.bzzoiro.com";

  }

  async getMatchData(
    home,
    away,
    env,
    ctx
  ){

    const token =
      getBsdToken(env);

    if(!token){

      return {

        provider:
          this.name,

        status:
          "not_configured",

        message:
          "BSD_TOKEN غير موجود في Secrets.",

        data:null

      };
    }

    const headers = {

      Authorization:
        `Token ${token}`,

      Accept:
        "application/json"

    };

    const homeTeam =
      await bsdFindTeam(
        home,
        headers
      );

    const awayTeam =
      await bsdFindTeam(
        away,
        headers
      );

    if(
      !homeTeam ||
      !awayTeam
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "تم الاتصال بـ BSD لكن تعذر العثور على أحد الفريقين.",

        data:null

      };
    }

    const [
      homeFixtures,
      awayFixtures,
      events
    ] =
      await Promise.all([

        bsdGetTeamFixtures(
          homeTeam.id,
          headers
        ),

        bsdGetTeamFixtures(
          awayTeam.id,
          headers
        ),

        bsdGetEvents(
          home,
          away,
          headers
        )

      ]);

    const all = [

      ...homeFixtures,

      ...awayFixtures

    ];

    const fixture =
      findFixture(
        all,
        home,
        away
      ) ||
      findFixture(
        events,
        home,
        away
      );

    const homeRecent =
      recentForTeam(
        homeFixtures,
        home,
        15
      );

    const awayRecent =
      recentForTeam(
        awayFixtures,
        away,
        15
      );

    if(
      !fixture &&
      !homeRecent.length &&
      !awayRecent.length
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "BSD متصل لكن لم يعثر على مباراة أو بيانات تاريخية كافية.",

        data:null

      };
    }

    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم العثور على بيانات حقيقية عبر BSD.",

      data:{

        fixture,

        homeRecent,

        awayRecent,

        prediction:
          await bsdFindPrediction(
            fixture,
            headers
          ),

        teams:{

          home:
            homeTeam,

          away:
            awayTeam

        }

      }

    };
  }
}

async function bsdFindTeam(
  name,
  headers
){

  const url =
    new URL(
      "https://sports.bzzoiro.com/api/v2/teams/"
    );

  url.searchParams.set(
    "search",
    name
  );

  url.searchParams.set(
    "limit",
    "10"
  );

  const r =
    await fetchJson(
      url.toString(),
      {headers},
      120
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "BSD HTTP 429"
      );

    if(
      r.status === 401
    )
      throw new Error(
        "BSD token غير صالح"
      );

    throw new Error(
      `BSD HTTP ${r.status}`
    );
  }

  const rows =
    Array.isArray(
      r.data?.results
    )
    ? r.data.results
    : [];

  return bestTeam(
    rows,
    name
  );
}

async function bsdGetTeamFixtures(
  teamId,
  headers
){

  const url =
    new URL(
      `https://sports.bzzoiro.com/api/v2/teams/${encodeURIComponent(teamId)}/fixtures/`
    );

  url.searchParams.set(
    "limit",
    "50"
  );

  const r =
    await fetchJson(
      url.toString(),
      {headers},
      120
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "BSD HTTP 429"
      );

    throw new Error(
      `BSD fixtures HTTP ${r.status}`
    );
  }

  return Array.isArray(
    r.data?.results
  )
    ? r.data.results
        .map(
          normalizeBsdMatch
        )
        .filter(Boolean)
    : [];
}

async function bsdGetEvents(
  home,
  away,
  headers
){

  const url =
    new URL(
      "https://sports.bzzoiro.com/api/v2/events/"
    );

  url.searchParams.set(
    "date_from",
    dateShift(-30)
  );

  url.searchParams.set(
    "date_to",
    dateShift(30)
  );

  url.searchParams.set(
    "limit",
    "200"
  );

  const r =
    await fetchJson(
      url.toString(),
      {headers},
      120
    );

  if(!r.ok)
    return [];

  const rows =
    Array.isArray(
      r.data?.results
    )
    ? r.data.results
    : [];

  return rows
    .map(
      normalizeBsdMatch
    )
    .filter(Boolean)
    .filter(
      x =>
        teamsPairMatch(
          x,
          home,
          away
        )
    );
}

async function bsdFindPrediction(
  fixture,
  headers
){

  if(!fixture?.id)
    return null;

  const url =
    new URL(
      "https://sports.bzzoiro.com/api/v2/predictions/"
    );

  url.searchParams.set(
    "limit",
    "200"
  );

  const r =
    await fetchJson(
      url.toString(),
      {headers},
      120
    );

  if(!r.ok)
    return null;

  const rows =
    Array.isArray(
      r.data?.results
    )
    ? r.data.results
    : [];

  const found =
    rows.find(
      x => {

        const event =
          x?.event ||
          x?.match ||
          x?.fixture;

        const id =
          event?.id ??
          x?.event_id ??
          x?.match_id;

        return (
          String(id || "") ===
          String(fixture.id)
        );

      }
    );

  if(!found)
    return null;

  return {

    homeWin:
      percentValue(
        found.prob_home_win ??
        found.home_win_prob ??
        found.probability_home
      ),

    draw:
      percentValue(
        found.prob_draw ??
        found.draw_prob
      ),

    awayWin:
      percentValue(
        found.prob_away_win ??
        found.away_win_prob ??
        found.probability_away
      ),

    confidence:
      percentValue(
        found.confidence
      )

  };
}

/* =========================================================
 * TheSportsDB
 * =======================================================*/

class TheSportsDbProvider{

  constructor(){

    this.name =
      "TheSportsDB";

    this.base =
      "https://www.thesportsdb.com/api/v1/json/123";

  }

  async getMatchData(
    home,
    away,
    env,
    ctx
  ){

    const homeTeam =
      await tsdbSearchTeam(
        home
      );

    const awayTeam =
      await tsdbSearchTeam(
        away
      );

    if(
      !homeTeam ||
      !awayTeam
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "لم يتم العثور على الفريقين في TheSportsDB.",

        data:null

      };
    }

    const exact =
      await tsdbSearchEvent(
        home,
        away
      );

    const [
      homeLast,
      awayLast,
      homeNext,
      awayNext
    ] =
      await Promise.all([

        tsdbTeamSchedule(
          "previous",
          homeTeam.id
        ),

        tsdbTeamSchedule(
          "previous",
          awayTeam.id
        ),

        tsdbTeamSchedule(
          "next",
          homeTeam.id
        ),

        tsdbTeamSchedule(
          "next",
          awayTeam.id
        )

      ]);

    const fixture =
      exact ||
      findFixture(
        [
          ...homeNext,
          ...awayNext
        ],
        home,
        away
      );

    const homeRecent =
      recentForTeam(
        homeLast,
        home,
        5
      );

    const awayRecent =
      recentForTeam(
        awayLast,
        away,
        5
      );

    if(
      !fixture &&
      !homeRecent.length &&
      !awayRecent.length
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "TheSportsDB متصل لكن لا توجد بيانات مناسبة للمباراة.",

        data:null

      };
    }

    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم العثور على بيانات عبر TheSportsDB.",

      data:{

        fixture,

        homeRecent,

        awayRecent

      }

    };
  }
}

async function tsdbSearchTeam(
  name
){

  const url =
    new URL(
      "https://www.thesportsdb.com/api/v1/json/123/searchteams.php"
    );

  url.searchParams.set(
    "t",
    name
  );

  const r =
    await fetchJson(
      url.toString(),
      {},
      300
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "TheSportsDB HTTP 429"
      );

    throw new Error(
      `TheSportsDB HTTP ${r.status}`
    );
  }

  const rows =
    Array.isArray(
      r.data?.teams
    )
    ? r.data.teams
    : [];

  return bestTeam(
    rows.map(
      x => ({

        id:
          x.idTeam,

        name:
          x.strTeam

      })
    ),
    name
  );
}

async function tsdbSearchEvent(
  home,
  away
){

  const eventName =
    `${slug(home)}_vs_${slug(away)}`;

  const url =
    new URL(
      "https://www.thesportsdb.com/api/v1/json/123/searchevents.php"
    );

  url.searchParams.set(
    "e",
    eventName
  );

  const r =
    await fetchJson(
      url.toString(),
      {},
      300
    );

  if(!r.ok)
    return null;

  const rows =
    Array.isArray(
      r.data?.event
    )
    ? r.data.event
    : [];

  const row =
    rows.find(
      x =>
        teamsPairMatch(
          {
            home:{
              name:
                x.strHomeTeam
            },

            away:{
              name:
                x.strAwayTeam
            }
          },
          home,
          away
        )
    );

  return row
    ? normalizeTsdbMatch(row)
    : null;
}

async function tsdbTeamSchedule(
  direction,
  teamId
){

  const path =
    direction === "previous"
    ? "eventslast.php"
    : "eventsnext.php";

  const url =
    new URL(
      `https://www.thesportsdb.com/api/v1/json/123/${path}`
    );

  url.searchParams.set(
    "id",
    teamId
  );

  const r =
    await fetchJson(
      url.toString(),
      {},
      300
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "TheSportsDB HTTP 429"
      );

    return [];
  }

  const rows =
    Array.isArray(
      r.data?.events
    )
    ? r.data.events
    : [];

  return rows
    .map(
      normalizeTsdbMatch
    )
    .filter(Boolean);
}

/* =========================================================
 * OpenLigaDB
 * =======================================================*/

class OpenLigaDbProvider{

  constructor(){

    this.name =
      "OpenLigaDB";

  }

  async getMatchData(
    home,
    away,
    env,
    ctx
  ){

    const leagues =
      await openLigaLeagues();

    let foundFixture =
      null;

    let homeRecent =
      [];

    let awayRecent =
      [];

    for(
      const league
      of leagues.slice(0,8)
    ){

      if(
        !league?.shortcut
      )
        continue;

      const season =
        Number(
          league.season
        );

      if(
        !Number.isFinite(
          season
        )
      )
        continue;

      const url =
        `https://api.openligadb.de/getmatchdata/${encodeURIComponent(league.shortcut)}/${season}`;

      const r =
        await fetchJson(
          url,
          {},
          900
        );

      if(!r.ok)
        continue;

      const rows =
        Array.isArray(
          r.data
        )
        ? r.data
        : [];

      const normalized =
        rows
          .map(
            normalizeOpenLigaMatch
          )
          .filter(Boolean);

      const candidate =
        normalized.find(
          x =>
            teamsPairMatch(
              x,
              home,
              away
            )
        );

      if(candidate){

        foundFixture =
          candidate;

        break;
      }

      const h =
        normalized
          .filter(
            x =>
              teamNameMatch(
                x.home?.name,
                home
              ) &&
              x.status ===
                "finished"
          )
          .slice(-5)
          .reverse();

      const a =
        normalized
          .filter(
            x =>
              teamNameMatch(
                x.away?.name,
                away
              ) &&
              x.status ===
                "finished"
          )
          .slice(-5)
          .reverse();

      homeRecent.push(
        ...h
      );

      awayRecent.push(
        ...a
      );
    }

    homeRecent =
      dedupeMatches(
        homeRecent
      ).slice(-5);

    awayRecent =
      dedupeMatches(
        awayRecent
      ).slice(-5);

    if(
      !foundFixture &&
      !homeRecent.length &&
      !awayRecent.length
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "المصدر متصل، لكن هذه المباراة ليست ضمن تغطيته.",

        data:null

      };
    }

    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم العثور على بيانات عبر OpenLigaDB.",

      data:{

        fixture:
          foundFixture,

        homeRecent,

        awayRecent

      }

    };
  }
}

async function openLigaLeagues(){

  const r =
    await fetchJson(
      "https://api.openligadb.de/getavailableleagues",
      {},
      1800
    );

  if(!r.ok)
    return [];

  const rows =
    Array.isArray(
      r.data
    )
    ? r.data
    : [];

  const now =
    new Date();

  const currentYear =
    now.getUTCFullYear();

  return rows

    .filter(
      x => {

        const sport =
          String(
            x.sport ||
            x.Sport ||
            ""
          ).toLowerCase();

        return (
          !sport ||
          sport.includes(
            "fußball"
          ) ||
          sport.includes(
            "fussball"
          ) ||
          sport.includes(
            "football"
          )
        );
      }
    )

    .map(
      x => ({

        shortcut:
          x.leagueShortcut ||
          x.LeagueShortcut ||
          x.shortcut,

        season:
          x.leagueSeason ||
          x.LeagueSeason ||
          currentYear

      })
    )

    .filter(
      x =>
        x.shortcut
    )

    .sort(
      (a,b) =>
        Number(b.season) -
        Number(a.season)
    );
}

/* =========================================================
 * SofaScore GLOBAL FALLBACK
 * =======================================================*/

class SofaScoreProvider{

  constructor(){

    this.name =
      "SofaScore";

    this.base =
      "https://www.sofascore.com/api/v1";

  }

  async getMatchData(
    home,
    away,
    env,
    ctx
  ){

    const homeTeam =
      await sofaSearchTeam(
        home
      );

    const awayTeam =
      await sofaSearchTeam(
        away
      );

    if(
      !homeTeam ||
      !awayTeam
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "SofaScore لم يجد الفريقين.",

        data:null

      };
    }

    const [
      homeEvents,
      awayEvents
    ] =
      await Promise.all([

        sofaTeamEvents(
          homeTeam.id
        ),

        sofaTeamEvents(
          awayTeam.id
        )

      ]);

    const homeRecent =
      recentForTeam(
        homeEvents,
        home,
        15
      );

    const awayRecent =
      recentForTeam(
        awayEvents,
        away,
        15
      );

    const fixture =
      findFixture(
        [
          ...homeEvents,
          ...awayEvents
        ],
        home,
        away
      );

    if(
      !fixture &&
      !homeRecent.length &&
      !awayRecent.length
    ){

      return {

        provider:
          this.name,

        status:
          "no_match",

        message:
          "SofaScore متصل لكن لم يجد بيانات مناسبة.",

        data:null

      };
    }

    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم العثور على بيانات عبر SofaScore.",

      data:{

        fixture,

        homeRecent,

        awayRecent

      }

    };
  }
}

async function sofaSearchTeam(
  name
){

  const url =
    new URL(
      "https://www.sofascore.com/api/v1/search/all"
    );

  url.searchParams.set(
    "q",
    name
  );

  const r =
    await fetchJson(
      url.toString(),
      {},
      300
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "SofaScore HTTP 429"
      );

    throw new Error(
      `SofaScore HTTP ${r.status}`
    );
  }

  const rows =
    Array.isArray(
      r.data?.results
    )
    ? r.data.results
    : [];

  const teams =
    rows
      .filter(
        x =>
          x?.entity?.sport?.slug ===
            "football" ||
          x?.entity?.sport?.name ===
            "Football"
      )
      .map(
        x => ({

          id:
            x.entity?.id,

          name:
            x.entity?.name

        })
      )
      .filter(
        x =>
          x.id &&
          x.name
      );

  return bestTeam(
    teams,
    name
  );
}

async function sofaTeamEvents(
  teamId
){

  const url =
    `https://www.sofascore.com/api/v1/team/${encodeURIComponent(teamId)}/events/last/0`;

  const r =
    await fetchJson(
      url,
      {},
      120
    );

  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "SofaScore HTTP 429"
      );

    return [];
  }

  const events =
    Array.isArray(
      r.data?.events
    )
    ? r.data.events
    : [];

  return events
    .map(
      normalizeSofaMatch
    )
    .filter(Boolean);
}

/* =========================================================
 * NORMALIZATION
 * =======================================================*/

function normalizeBsdMatch(
  x
){

  if(!x)
    return null;

  const home =
    x.home_team ||
    x.homeTeam ||
    x.home ||
    {};

  const away =
    x.away_team ||
    x.awayTeam ||
    x.away ||
    {};

  const hs =
    numberOrNull(
      x.home_score ??
      x.homeScore ??
      x.score?.home ??
      x.result?.home
    );

  const as =
    numberOrNull(
      x.away_score ??
      x.awayScore ??
      x.score?.away ??
      x.result?.away
    );

  const status =
    normalizeStatus(
      x.status?.name ??
      x.status ??
      x.state
    );

  return {

    id:
      String(
        x.id ??
        x.event_id ??
        x.match_id ??
        ""
      ),

    utcDate:
      x.utc_date ||
      x.date ||
      x.start_time ||
      x.kickoff ||
      null,

    status,

    home:{
      id:
        home.id ??
        home.team_id ??
        null,

      name:
        home.name ??
        home.team_name ??
        null
    },

    away:{
      id:
        away.id ??
        away.team_id ??
        null,

      name:
        away.name ??
        away.team_name ??
        null
    },

    score:{
      home:hs,
      away:as
    },

    league:
      x.league?.name ??
      x.league_name ??
      null

  };
}

function normalizeTsdbMatch(
  x
){

  if(!x)
    return null;

  return {

    id:
      String(
        x.idEvent ||
        ""
      ),

    utcDate:
      x.strTimestamp ||
      x.dateEvent ||
      x.strTime ||
      null,

    status:
      x.intHomeScore != null &&
      x.intAwayScore != null
        ? "finished"
        : "upcoming",

    home:{
      id:
        x.idHomeTeam ||
        null,

      name:
        x.strHomeTeam ||
        null
    },

    away:{
      id:
        x.idAwayTeam ||
        null,

      name:
        x.strAwayTeam ||
        null
    },

    score:{
      home:
        numberOrNull(
          x.intHomeScore
        ),

      away:
        numberOrNull(
          x.intAwayScore
        )
    },

    league:
      x.strLeague ||
      null

  };
}

function normalizeOpenLigaMatch(
  x
){

  if(!x)
    return null;

  const h =
    x.team1 ||
    x.Team1 ||
    {};

  const a =
    x.team2 ||
    x.Team2 ||
    {};

  const hs =
    x.matchResults?.find?.(
      r =>
        r.resultTypeID === 2
    )?.pointsTeam1 ??
    x.matchResults?.[0]
      ?.pointsTeam1 ??
    null;

  const as =
    x.matchResults?.find?.(
      r =>
        r.resultTypeID === 2
    )?.pointsTeam2 ??
    x.matchResults?.[0]
      ?.pointsTeam2 ??
    null;

  return {

    id:
      String(
        x.matchID ||
        x.MatchID ||
        ""
      ),

    utcDate:
      x.matchDateTimeUTC ||
      x.matchDateTime ||
      null,

    status:
      hs != null &&
      as != null
        ? "finished"
        : "upcoming",

    home:{
      id:
        h.teamId ||
        h.TeamId ||
        null,

      name:
        h.teamName ||
        h.TeamName ||
        null
    },

    away:{
      id:
        a.teamId ||
        a.TeamId ||
        null,

      name:
        a.teamName ||
        a.TeamName ||
        null
    },

    score:{
      home:
        numberOrNull(
          hs
        ),

      away:
        numberOrNull(
          as
        )
    },

    league:
      x.leagueName ||
      x.LeagueName ||
      null

  };
}

function normalizeSofaMatch(
  x
){

  if(!x)
    return null;

  const home =
    x.homeTeam ||
    {};

  const away =
    x.awayTeam ||
    {};

  const status =
    x.status?.type ||
    "";

  const hs =
    numberOrNull(
      x.homeScore?.current ??
      x.homeScore?.display
    );

  const as =
    numberOrNull(
      x.awayScore?.current ??
      x.awayScore?.display
    );

  let normalizedStatus =
    "upcoming";

  if(
    status === "finished" ||
    status === "afterpenalties"
  ){

    normalizedStatus =
      "finished";

  }else if(
    status === "inprogress"
  ){

    normalizedStatus =
      "live";

  }else if(
    status === "canceled" ||
    status === "postponed"
  ){

    normalizedStatus =
      "cancelled";
  }

  return {

    id:
      String(
        x.id ||
        ""
      ),

    utcDate:
      x.startTimestamp
        ? new Date(
            x.startTimestamp *
            1000
          ).toISOString()
        : null,

    status:
      normalizedStatus,

    home:{
      id:
        home.id ||
        null,

      name:
        home.name ||
        null
    },

    away:{
      id:
        away.id ||
        null,

      name:
        away.name ||
        null
    },

    score:{
      home:hs,
      away:as
    },

    league:
      x.tournament?.name ||
      null

  };
}

/* =========================================================
 * MERGE
 * =======================================================*/

function mergeProviderData(
  results,
  home,
  away
){

  let fixture =
    null;

  let homeRecent =
    [];

  let awayRecent =
    [];

  const providerNames =
    [];

  for(
    const r of results
  ){

    if(
      r.provider
    )
      providerNames.push(
        r.provider
      );

    if(
      !fixture &&
      r.data?.fixture &&
      teamsPairMatch(
        r.data.fixture,
        home,
        away
      )
    ){

      fixture =
        r.data.fixture;
    }

    homeRecent.push(
      ...(r.data?.homeRecent || [])
    );

    awayRecent.push(
      ...(r.data?.awayRecent || [])
    );
  }

  return {

    fixture,

    home:
      dedupeMatches(
        homeRecent
      )
      .filter(
        x =>
          x.status ===
          "finished"
      )
      .sort(
        byDateDesc
      )
      .slice(
        0,
        15
      ),

    away:
      dedupeMatches(
        awayRecent
      )
      .filter(
        x =>
          x.status ===
          "finished"
      )
      .sort(
        byDateDesc
      )
      .slice(
        0,
        15
      ),

    providerNames

  };
}

/* =========================================================
 * DATA QUALITY GATE
 * =======================================================*/

function calculateDataQualityGate(
  merged,
  results,
  home,
  away
){

  const homeMatches =
    merged.home.length;

  const awayMatches =
    merged.away.length;

  const successfulProviders =
    results.filter(
      x =>
        x.status ===
        "success"
    ).length;

  const fixtureConfirmed =
    !!(
      merged.fixture &&
      teamsPairMatch(
        merged.fixture,
        home,
        away
      )
    );

  let score = 0;

  /*
   * Home sample:
   * maximum 30 points.
   */
  score +=
    Math.min(
      homeMatches,
      15
    ) * 2;

  /*
   * Away sample:
   * maximum 30 points.
   */
  score +=
    Math.min(
      awayMatches,
      15
    ) * 2;

  /*
   * Fixture confirmation:
   * 20 points.
   */
  if(
    fixtureConfirmed
  )
    score += 20;

  /*
   * Source diversity:
   * maximum 20 points.
   */
  score +=
    Math.min(
      successfulProviders,
      4
    ) * 5;

  score =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  let label =
    "بيانات ضعيفة";

  if(
    score >= 75
  ){

    label =
      "بيانات قوية — يسمح بالتحليل";

  }else if(
    score >= 55
  ){

    label =
      "بيانات متوسطة — تحليل حذر";

  }else if(
    score >= 35
  ){

    label =
      "بيانات محدودة — لا يوصى برهان قوي";

  }else{

    label =
      "بيانات غير كافية — No Bet";

  }

  /*
   * Hard safety gate.
   *
   * We require:
   * - at least 2 matches for each team
   * - and quality >= 45
   *
   * Otherwise no prediction.
   */
  const canAnalyze =
    homeMatches >= 2 &&
    awayMatches >= 2 &&
    score >= 45;

  return {

    score,

    label,

    canAnalyze,

    homeMatches,

    awayMatches,

    fixtureConfirmed,

    successfulProviders,

    providersUsed:
      results
        .filter(
          x =>
            x.status ===
            "success"
        )
        .map(
          x =>
            x.provider
        )

  };
}

/* =========================================================
 * ANALYSIS ENGINE
 * =======================================================*/

function buildAnalysis(
  homeMatches,
  awayMatches,
  fixture,
  homeName,
  awayName,
  quality
){

  const homeStats =
    summarizeTeam(
      homeMatches
    );

  const awayStats =
    summarizeTeam(
      awayMatches
    );

  /*
   * REAL DATA QUALITY GATE
   *
   * The Poisson engine is not changed.
   * It simply refuses to produce a betting
   * recommendation when the data gate fails.
   */
  if(
    !quality?.canAnalyze
  ){

    return {

      predictions:[],

      metrics:{

        homeXG:0,

        awayXG:0,

        homeWin:0,

        draw:0,

        awayWin:0,

        btts:0

      },

      dataSummary:{

        homeMatches:
          homeStats.matches,

        awayMatches:
          awayStats.matches,

        homeGoalsPerMatch:
          homeStats.matches
            ? round2(
                homeStats.goalsFor /
                homeStats.matches
              )
            : 0,

        awayGoalsPerMatch:
          awayStats.matches
            ? round2(
                awayStats.goalsFor /
                awayStats.matches
              )
            : 0,

        homeConcededPerMatch:
          homeStats.matches
            ? round2(
                homeStats.goalsAgainst /
                homeStats.matches
              )
            : 0,

        awayConcededPerMatch:
          awayStats.matches
            ? round2(
                awayStats.goalsAgainst /
                awayStats.matches
              )
            : 0

      },

      summary:{

        strongestLabel:
          "لا توجد توصية",

        strongestProbability:
          0,

        mostLikelyScore:
          "—",

        dataQuality:
          quality.score

      }

    };
  }

  /*
   * Everything below remains the original
   * Poisson logic.
   */

  const homeAttack =
    homeStats.goalsFor /
    homeStats.matches;

  const homeDefense =
    homeStats.goalsAgainst /
    homeStats.matches;

  const awayAttack =
    awayStats.goalsFor /
    awayStats.matches;

  const awayDefense =
    awayStats.goalsAgainst /
    awayStats.matches;

  const lambdaHome =
    clamp(
      0.55 *
        homeAttack +

      0.45 *
        awayDefense +

      0.18,

      0.20,

      3.50
    );

  const lambdaAway =
    clamp(
      0.55 *
        awayAttack +

      0.45 *
        homeDefense,

      0.15,

      3.20
    );

  const probs =
    poissonMatchProbabilities(
      lambdaHome,
      lambdaAway
    );

  const xgHome =
    lambdaHome;

  const xgAway =
    lambdaAway;

  const totalXg =
    xgHome +
    xgAway;

  const btts =
    clamp(
      1 -
      poissonP0(
        lambdaHome
      ) -
      poissonP0(
        lambdaAway
      ) +
      poissonP0(
        lambdaHome +
        lambdaAway
      ),

      0,

      1
    );

  const over25 =
    1 -
    poissonCdf(
      2,
      totalXg
    );

  const predictions = [

    {

      key:"btts",

      label:
        "كلا الفريقين يسجلان",

      probability:
        btts * 100,

      reason:
        `النموذج الإحصائي يقدّر احتمال التسجيل من ${homeStats.matches + awayStats.matches} مباراة فعلية.`
    },

    {

      key:"over25",

      label:
        "أكثر من 2.5 هدف",

      probability:
        over25 * 100,

      reason:
        "الاحتمال مبني على توزيع بواسون للمتوسط المتوقع للأهداف."
    },

    {

      key:"home",

      label:
        `فوز ${homeName}`,

      probability:
        probs.home * 100,

      reason:
        "الاحتمال يجمع قوة الهجوم والدفاع مع أفضلية الأرض."
    },

    {

      key:"draw",

      label:
        "التعادل",

      probability:
        probs.draw * 100,

      reason:
        "احتمال التعادل الناتج من توزيع النتائج الممكنة."
    },

    {

      key:"away",

      label:
        `فوز ${awayName}`,

      probability:
        probs.away * 100,

      reason:
        "الاحتمال يعتمد على قوة الضيف الهجومية ودفاع المضيف."
    }

  ]

  .filter(
    x =>
      Number.isFinite(
        x.probability
      )
  )

  .sort(
    (a,b) =>
      b.probability -
      a.probability
  )

  .slice(
    0,
    3
  )

  .map(
    (x,i) => ({

      ...x,

      rank:
        i + 1,

      probability:
        round2(
          x.probability
        )

    })
  );

  const score =
    mostLikelyScore(
      lambdaHome,
      lambdaAway
    );

  return {

    predictions,

    metrics:{

      homeXG:
        round2(
          xgHome
        ),

      awayXG:
        round2(
          xgAway
        ),

      homeWin:
        round2(
          probs.home *
          100
        ),

      draw:
        round2(
          probs.draw *
          100
        ),

      awayWin:
        round2(
          probs.away *
          100
        ),

      btts:
        round2(
          btts *
          100
        )

    },

    dataSummary:{

      homeMatches:
        homeStats.matches,

      awayMatches:
        awayStats.matches,

      homeGoalsPerMatch:
        homeStats.goalsFor /
        Math.max(
          homeStats.matches,
          1
        ),

      awayGoalsPerMatch:
        awayStats.goalsFor /
        Math.max(
          awayStats.matches,
          1
        ),

      homeConcededPerMatch:
        homeStats.goalsAgainst /
        Math.max(
          homeStats.matches,
          1
        ),

      awayConcededPerMatch:
        awayStats.goalsAgainst /
        Math.max(
          awayStats.matches,
          1
        )

    },

    summary:{

      strongestLabel:
        predictions[0]?.label ||
        "لا يوجد",

      strongestProbability:
        predictions[0]?.probability ||
        0,

      mostLikelyScore:
        score,

      dataQuality:
        quality.score

    }

  };
}

/* =========================================================
 * TEAM STATISTICS
 * =======================================================*/

function summarizeTeam(
  matches
){

  let goalsFor = 0;

  let goalsAgainst = 0;

  let wins = 0;

  let draws = 0;

  let losses = 0;

  for(
    const m of matches
  ){

    const hs =
      numberOrNull(
        m.score?.home
      );

    const as =
      numberOrNull(
        m.score?.away
      );

    if(
      hs == null ||
      as == null
    )
      continue;

    const gf =
      m._teamSide ===
      "away"
        ? as
        : hs;

    const ga =
      m._teamSide ===
      "away"
        ? hs
        : as;

    goalsFor +=
      gf;

    goalsAgainst +=
      ga;

    if(
      gf > ga
    )
      wins++;

    else if(
      gf === ga
    )
      draws++;

    else
      losses++;
  }

  return {

    matches:
      wins +
      draws +
      losses,

    goalsFor,

    goalsAgainst,

    wins,

    draws,

    losses

  };
}

/* =========================================================
 * RECENT MATCHES
 * =======================================================*/

function recentForTeam(
  matches,
  team,
  limit
){

  return matches

    .filter(
      m =>
        m?.status ===
          "finished" &&

        (
          teamNameMatch(
            m.home?.name,
            team
          ) ||

          teamNameMatch(
            m.away?.name,
            team
          )
        )
    )

    .map(
      m => {

        const isAway =
          teamNameMatch(
            m.away?.name,
            team
          );

        return {

          ...m,

          _teamSide:
            isAway
              ? "away"
              : "home"

        };

      }
    )

    .sort(
      byDateDesc
    )

    .slice(
      0,
      limit
    );
}

/* =========================================================
 * MATCH HELPERS
 * =======================================================*/

function findFixture(
  matches,
  home,
  away
){

  return (
    matches.find(
      x =>
        teamsPairMatch(
          x,
          home,
          away
        )
    ) ||
    null
  );
}

function teamsPairMatch(
  m,
  home,
  away
){

  if(!m)
    return false;

  return (

    teamNameMatch(
      m.home?.name,
      home
    ) &&

    teamNameMatch(
      m.away?.name,
      away
    )

  );
}

function teamNameMatch(
  a,
  b
){

  const x =
    normalizeName(a);

  const y =
    normalizeName(b);

  if(
    !x ||
    !y
  )
    return false;

  if(
    x === y
  )
    return true;

  if(
    x.includes(y) ||
    y.includes(x)
  )
    return true;

  const xt =
    new Set(
      x
        .split(" ")
        .filter(
          t =>
            t.length >= 3
        )
    );

  return y
    .split(" ")
    .some(
      t =>
        t.length >= 3 &&
        xt.has(t)
    );
}

function bestTeam(
  rows,
  name
){

  let best =
    null;

  let bestScore =
    -1;

  for(
    const row
    of rows || []
  ){

    const rowName =
      row?.name ||
      row?.strTeam ||
      "";

    const score =
      similarity(
        normalizeName(
          rowName
        ),

        normalizeName(
          name
        )
      );

    if(
      score >
      bestScore
    ){

      bestScore =
        score;

      best = {

        id:
          row?.id ||
          row?.idTeam ||
          null,

        name:
          rowName

      };
    }
  }

  return (
    bestScore >= 0.45
      ? best
      : null
  );
}

function similarity(
  a,
  b
){

  if(
    !a ||
    !b
  )
    return 0;

  if(
    a === b
  )
    return 1;

  if(
    a.includes(b) ||
    b.includes(a)
  )
    return 0.85;

  const aa =
    new Set(
      a.split(" ")
    );

  const bb =
    new Set(
      b.split(" ")
    );

  let common =
    0;

  for(
    const t of aa
  ){

    if(
      bb.has(t)
    )
      common++;

  }

  return (
    common /
    Math.max(
      aa.size,
      bb.size,
      1
    )
  );
}

function normalizeName(
  value
){

  return String(
    value || ""
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
    /\b(fc|cf|afc|sc|ac|fk|club|football club|women|w|ladies)\b/g,
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

function slug(
  value
){

  return normalizeName(
    value
  )
  .replace(
    /\s+/g,
    "_"
  );
}

function normalizeStatus(
  value
){

  const s =
    String(
      value || ""
    )
    .toLowerCase();

  if(
    s.includes("finish") ||
    s.includes("complete") ||
    s === "ft"
  )
    return "finished";

  if(
    s.includes("live") ||
    s.includes("progress") ||
    s.includes("playing")
  )
    return "live";

  if(
    s.includes("cancel") ||
    s.includes("postpon")
  )
    return "cancelled";

  return "upcoming";
}

function byDateDesc(
  a,
  b
){

  const aa =
    Date.parse(
      a?.utcDate || ""
    ) || 0;

  const bb =
    Date.parse(
      b?.utcDate || ""
    ) || 0;

  return bb - aa;
}

function dedupeMatches(
  rows
){

  const map =
    new Map();

  for(
    const row
    of rows || []
  ){

    const key =
      row?.id ||

      `${normalizeName(
        row?.home?.name
      )}|${normalizeName(
        row?.away?.name
      )}|${row?.utcDate || ""}`;

    if(
      !map.has(key)
    )
      map.set(
        key,
        row
      );
  }

  return [
    ...map.values()
  ];
}

/* =========================================================
 * POISSON
 * =======================================================*/

function poissonP0(
  lambda
){

  return Math.exp(
    -lambda
  );
}

function poissonPmf(
  k,
  lambda
){

  let p =
    Math.exp(
      -lambda
    );

  for(
    let i=1;
    i<=k;
    i++
  ){

    p *=
      lambda /
      i;
  }

  return p;
}

function poissonCdf(
  k,
  lambda
){

  let sum =
    0;

  for(
    let i=0;
    i<=k;
    i++
  ){

    sum +=
      poissonPmf(
        i,
        lambda
      );
  }

  return sum;
}

function poissonMatchProbabilities(
  homeLambda,
  awayLambda
){

  let home =
    0;

  let draw =
    0;

  let away =
    0;

  for(
    let h=0;
    h<=8;
    h++
  ){

    for(
      let a=0;
      a<=8;
      a++
    ){

      const p =
        poissonPmf(
          h,
          homeLambda
        ) *

        poissonPmf(
          a,
          awayLambda
        );

      if(
        h > a
      )
        home += p;

      else if(
        h === a
      )
        draw += p;

      else
        away += p;
    }
  }

  const total =
    home +
    draw +
    away;

  return {

    home:
      home /
      total,

    draw:
      draw /
      total,

    away:
      away /
      total

  };
}

function mostLikelyScore(
  homeLambda,
  awayLambda
){

  let best =
    null;

  let bestP =
    -1;

  for(
    let h=0;
    h<=6;
    h++
  ){

    for(
      let a=0;
      a<=6;
      a++
    ){

      const p =
        poissonPmf(
          h,
          homeLambda
        ) *

        poissonPmf(
          a,
          awayLambda
        );

      if(
        p >
        bestP
      ){

        bestP =
          p;

        best =
          `${h} - ${a}`;
      }
    }
  }

  return (
    best ||
    "—"
  );
}

/* =========================================================
 * UTILITIES
 * =======================================================*/

function getBsdToken(
  env
){

  return String(

    env?.BSD_API_TOKEN ||

    env?.BSD_TOKEN ||

    env?.BZZOIRO_API_KEY ||

    ""

  ).trim();
}

function numberOrNull(
  value
){

  if(
    value === null ||
    value === undefined ||
    value === ""
  )
    return null;

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function percentValue(
  value
){

  const n =
    numberOrNull(
      value
    );

  if(
    n == null
  )
    return null;

  return n > 1
    ? n
    : n * 100;
}

function round2(
  value
){

  return Math.round(
    Number(value) *
    100
  ) / 100;
}

function clamp(
  value,
  min,
  max
){

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function dateShift(
  days
){

  const d =
    new Date();

  d.setUTCDate(
    d.getUTCDate() +
    days
  );

  return d
    .toISOString()
    .slice(
      0,
      10
    );
}

/* =========================================================
 * FETCH JSON
 * =======================================================*/

async function fetchJson(
  url,
  options={},
  cacheSeconds=0
){

  const request =
    new Request(
      url,
      {
        method:
          options.method ||
          "GET",

        headers:
          options.headers ||
          {}
      }
    );

  if(
    cacheSeconds > 0 &&
    request.method === "GET"
  ){

    const cache =
      caches.default;

    const cached =
      await cache.match(
        request
      );

    if(cached){

      const data =
        await cached
          .clone()
          .json()
          .catch(
            () => null
          );

      return {

        ok:
          cached.ok,

        status:
          cached.status,

        data,

        text:""

      };
    }

    const response =
      await fetch(
        request
      );

    const clone =
      response.clone();

    if(
      response.ok
    ){

      const cacheResponse =
        new Response(
          clone.body,
          clone
        );

      cacheResponse.headers.set(
        "Cache-Control",
        `public, max-age=${cacheSeconds}`
      );

      await cache.put(
        request,
        cacheResponse
      );
    }

    const text =
      await response.text();

    let data =
      null;

    try{

      data =
        text
          ? JSON.parse(text)
          : null;

    }catch{}

    return {

      ok:
        response.ok,

      status:
        response.status,

      data,

      text

    };
  }

  const response =
    await fetch(
      request
    );

  const text =
    await response.text();

  let data =
    null;

  try{

    data =
      text
        ? JSON.parse(text)
        : null;

  }catch{}

  return {

    ok:
      response.ok,

    status:
      response.status,

    data,

    text

  };
}
