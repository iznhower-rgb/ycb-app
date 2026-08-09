/* =========================================================
   Y.C.B — Football Prediction Engine
   Cloudflare Worker
   Version 4.1.0

   DESIGN RULES
   ---------------------------------------------------------
   1. No MockProvider.
   2. No hard-coded prediction output.
   3. No fake/default historical data.
   4. Multiple independent providers.
   5. One provider failing NEVER stops analysis.
   6. All providers are normalized to one internal format.
   7. Predictions require enough real historical data.
   8. If data quality is insufficient => NO BET.
   9. Maximum 3 recommendations.
  10. Poisson is used only after validation.
  11. No xG label is used for ordinary goals averages.
  12. Provider errors are reported transparently.

   PROVIDERS
   ---------------------------------------------------------
   1) BSD          optional token
   2) TheSportsDB public
   3) OpenLigaDB public
   4) SofaScore public
   5) ESPN public

   Football-Data.org is intentionally NOT used here.
   ========================================================= */

const APP_NAME = "Y.C.B";
const VERSION = "4.1.0";

const CONFIG = {
  MAX_RECENT_MATCHES: 15,

  MIN_TEAM_MATCHES: 4,
  MIN_TOTAL_MATCHES: 8,

  MIN_DATA_QUALITY_FOR_BET: 55,

  MIN_PROBABILITY_RESULT: 54,
  MIN_PROBABILITY_MARKET: 57,

  MAX_SCORE_GOALS: 8,

  REQUEST_TIMEOUT_MS: 9000,

  CACHE_SECONDS: 600
};


/* =========================================================
   UI
   ========================================================= */

const HTML = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1,viewport-fit=cover"
>

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
  --warn:#ffd166;
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
  margin-top:18px;
  line-height:1.6
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
  value="Arsenal vs Coventry City"
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

<h2>ملخص البيانات</h2>

<div id="dataMetrics" class="grid"></div>

<p class="small">
جودة البيانات لا تعني ضمان النتيجة.
Y.C.B لا يصدر توصية عندما تكون العينة التاريخية
أو تنوع المصادر غير كافيين.
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

  return String(v==null?"":v)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}


function pct(v){

  return Number(v||0).toFixed(2)+"%";
}


function setMetric(
  id,
  label,
  value
){

  return (
    '<div class="metric">'+
      '<div class="label">'+
        esc(label)+
      '</div>'+
      '<div class="value">'+
        esc(value)+
      '</div>'+
    '</div>'
  );
}


function render(data){

  document
    .getElementById("results")
    .classList
    .remove("hidden");


  var p =
    data.predictions || [];


  document
    .getElementById("predictions")
    .innerHTML =

    p.length

    ?

    p.map(function(x,i){

      var medal =
        ["🥇","🥈","🥉"][i] || "•";


      return (

        '<div class="pred">'+

          '<div class="title">'+
            esc(x.label)+
            ' <span class="badge">'+
            medal+
            '</span>'+
          '</div>'+

          '<div class="pct">'+
            pct(x.probability)+
          '</div>'+

          '<div class="reason">'+
            esc(x.reason||"")+
          '</div>'+

        '</div>'

      );

    }).join("")

    :

    '<div class="pred">'+

      '<div class="title">'+
        'لا توجد توصية آمنة حالياً'+
      '</div>'+

      '<div class="reason">'+
        'لم تتوفر بيانات تاريخية موثوقة '+
        'بالكمية والجودة المطلوبة. '+
        'لن يخترع Y.C.B توقعاً من بيانات ناقصة.'+
      '</div>'+

    '</div>';


  document
    .getElementById("now")
    .textContent =

      "التوقع الأقوى حالياً: "+

      (
        data.summary?.strongestLabel ||
        "لا يوجد"
      )+

      " بنسبة "+

      pct(
        data.summary?.strongestProbability ||
        0
      );


  document
    .getElementById("score")
    .textContent =

      "النتيجة الأكثر ترجيحاً: "+

      (
        data.summary?.mostLikelyScore ||
        "—"
      )+

      " | جودة البيانات: "+

      Number(
        data.summary?.dataQuality ||
        0
      )+

      "/100";


  var m =
    data.metrics || {};


  document
    .getElementById("metrics")
    .innerHTML =

      setMetric(
        "xgh",
        "الأهداف المتوقعة للمضيف",
        Number(
          m.homeExpectedGoals ||
          0
        ).toFixed(2)
      )+

      setMetric(
        "xga",
        "الأهداف المتوقعة للضيف",
        Number(
          m.awayExpectedGoals ||
          0
        ).toFixed(2)
      )+

      setMetric(
        "home",
        "فوز المضيف",
        pct(m.homeWin)
      )+

      setMetric(
        "draw",
        "التعادل",
        pct(m.draw)
      )+

      setMetric(
        "btts",
        "BTTS",
        pct(m.btts)
      )+

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
      )+

      setMetric(
        "am",
        "مباريات الضيف",
        dm.awayMatches || 0
      )+

      setMetric(
        "hg",
        "أهداف المضيف/مباراة",
        Number(
          dm.homeGoalsPerMatch ||
          0
        ).toFixed(2)
      )+

      setMetric(
        "ag",
        "أهداف الضيف/مباراة",
        Number(
          dm.awayGoalsPerMatch ||
          0
        ).toFixed(2)
      )+

      setMetric(
        "hc",
        "استقبال المضيف",
        Number(
          dm.homeConcededPerMatch ||
          0
        ).toFixed(2)
      )+

      setMetric(
        "ac",
        "استقبال الضيف",
        Number(
          dm.awayConcededPerMatch ||
          0
        ).toFixed(2)
      );


  document
    .getElementById("sources")
    .innerHTML =

      (data.sources || [])
      .map(function(s){

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

          '<div class="source '+cls+'">'+

            esc(s.name)+
            " — "+
            esc(
              s.statusLabel ||
              s.status
            )+

            (
              s.message
              ? " — "+esc(s.message)
              : ""
            )+

          "</div>"

        );

      })
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
        "اكتب المباراة بهذا الشكل: Arsenal vs Coventry City";

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

            body:
              JSON.stringify({
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
        data.summary?.recommendationStatus ===
        "no_bet"

        ? "اكتمل التحليل — لا توجد توصية آمنة."

        : "اكتمل تحليل المباراة بنجاح.";


      window.scrollTo({
        top:0,
        behavior:"smooth"
      });


    }catch(e){

      status.textContent =
        "خطأ: "+e.message;

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


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(
    request,
    env,
    ctx
  ){

    const url =
      new URL(request.url);


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


    /* -------------------------
       HEALTH
       ------------------------- */

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

          sofascore:true,

          espn:true
        }

      });

    }


    /* -------------------------
       PROVIDERS
       ------------------------- */

    if(
      url.pathname ===
      "/api/providers"
    ){

      return json({

        success:true,

        version:VERSION,

        providers:[
          {
            name:"BSD",
            configured:
              !!getBsdToken(env),
            type:"token"
          },
          {
            name:"TheSportsDB",
            configured:true,
            type:"public"
          },
          {
            name:"OpenLigaDB",
            configured:true,
            type:"public"
          },
          {
            name:"SofaScore",
            configured:true,
            type:"public"
          },
          {
            name:"ESPN",
            configured:true,
            type:"public"
          }
        ]

      });

    }


    /* -------------------------
       ANALYZE
       ------------------------- */

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
            body?.match ||
            ""
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


    /* -------------------------
       UI
       ------------------------- */

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


/* =========================================================
   HTTP HELPERS
   ========================================================= */

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


/* =========================================================
   MAIN ANALYSIS
   ========================================================= */

async function analyzeMatch(
  home,
  away,
  env,
  ctx
){

  const providers =
    getProviders();


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
                classifyProviderError(
                  error
                ),

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
      x =>
        x?.data
    );


  const merged =
    mergeProviderData(
      usable,
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
      usable.length
    );


  const sources =
    results.map(
      x => ({

        name:
          x.provider,

        status:
          x.status,

        statusLabel:
          sourceStatusLabel(
            x.status
          ),

        message:
          x.message ||
          ""

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


    sources

  };

}


/* =========================================================
   PROVIDER REGISTRY
   ========================================================= */

function getProviders(){

  return [

    new BsdProvider(),

    new TheSportsDbProvider(),

    new OpenLigaDbProvider(),

    new SofaScoreProvider(),

    new EspnProvider()

  ];

}


/* =========================================================
   SOURCE STATUS
   ========================================================= */

function classifyProviderError(
  error
){

  const message =
    String(
      error?.message ||
      error ||
      ""
    );


  const lower =
    message.toLowerCase();


  if(
    lower.includes("429") ||
    lower.includes("rate")
  )
    return "rate_limited";


  if(
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("token")
  )
    return lower.includes("401") ||
      lower.includes("token")
      ? "invalid_token"
      : "forbidden";


  if(
    lower.includes("timeout")
  )
    return "timeout";


  return "error";

}


function sourceStatusLabel(
  status
){

  const map = {

    success:
      "success ✓",

    no_match:
      "متصل — لا توجد بيانات مناسبة",

    not_configured:
      "غير مفعّل",

    error:
      "خطأ في المصدر",

    rate_limited:
      "محدود مؤقتاً",

    invalid_token:
      "رمز API غير صالح",

    forbidden:
      "المصدر رفض الطلب",

    timeout:
      "انتهت مهلة المصدر",

    disabled:
      "تم تجاهل المصدر"

  };


  return (
    map[status] ||
    status
  );

}


/* =========================================================
   BSD PROVIDER
   ========================================================= */

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
        "Token "+token,

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
          "تعذر العثور على أحد الفريقين في BSD.",

        data:null

      };

    }


    const [
      homeFixtures,
      awayFixtures
    ] =
      await Promise.all([

        bsdGetTeamFixtures(
          homeTeam.id,
          headers
        ),

        bsdGetTeamFixtures(
          awayTeam.id,
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
      );


    const homeRecent =
      recentForTeam(
        homeFixtures,
        home,
        CONFIG.MAX_RECENT_MATCHES
      );


    const awayRecent =
      recentForTeam(
        awayFixtures,
        away,
        CONFIG.MAX_RECENT_MATCHES
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
          "BSD متصل لكن لم يوفر تاريخاً مناسباً.",

        data:null

      };

    }


    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم استلام بيانات حقيقية من BSD.",

      data:{

        fixture,

        homeRecent,

        awayRecent,

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
      {
        headers
      },
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(r.status === 429)
      throw new Error(
        "BSD HTTP 429"
      );

    if(r.status === 401)
      throw new Error(
        "BSD token غير صالح"
      );

    throw new Error(
      "BSD HTTP "+r.status
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
      "https://sports.bzzoiro.com/api/v2/teams/"+
      encodeURIComponent(teamId)+
      "/fixtures/"
    );


  url.searchParams.set(
    "limit",
    "50"
  );


  const r =
    await fetchJson(
      url.toString(),
      {
        headers
      },
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(r.status === 429)
      throw new Error(
        "BSD fixtures HTTP 429"
      );


    throw new Error(
      "BSD fixtures HTTP "+
      r.status
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


/* =========================================================
   THESPORTSDB PROVIDER
   ========================================================= */

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
          "لم يتم العثور على الفريقين.",

        data:null

      };

    }


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
        CONFIG.MAX_RECENT_MATCHES
      );


    const awayRecent =
      recentForTeam(
        awayLast,
        away,
        CONFIG.MAX_RECENT_MATCHES
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
          "المصدر متصل لكن لم يعط بيانات مناسبة.",

        data:null

      };

    }


    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم استلام بيانات حقيقية من TheSportsDB.",

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
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(r.status === 429)
      throw new Error(
        "TheSportsDB HTTP 429"
      );


    throw new Error(
      "TheSportsDB HTTP "+
      r.status
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
      "https://www.thesportsdb.com/api/v1/json/123/"+
      path
    );


  url.searchParams.set(
    "id",
    teamId
  );


  const r =
    await fetchJson(
      url.toString(),
      {},
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(r.status === 429)
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
   OPENLIGADB PROVIDER
   ========================================================= */

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

    /*
      OpenLigaDB is primarily useful
      for German football.

      We deliberately query a small,
      known set of German competitions
      instead of downloading the entire
      league catalogue on every analysis.
    */

    const leagues = [

      "bl1",
      "bl2",
      "bl3"

    ];


    let fixture = null;

    let homeRecent = [];

    let awayRecent = [];


    for(
      const shortcut of leagues
    ){

      const season =
        currentFootballSeason();


      const url =
        "https://api.openligadb.de/getmatchdata/"+
        encodeURIComponent(
          shortcut
        )+
        "/"+
        season;


      const r =
        await fetchJson(
          url,
          {},
          CONFIG.CACHE_SECONDS
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


      if(!fixture){

        fixture =
          normalized.find(
            x =>
              teamsPairMatch(
                x,
                home,
                away
              )
          ) || null;

      }


      const h =
        normalized
          .filter(
            x =>
              x.status === "finished" &&
              teamNameMatch(
                x.home?.name,
                home
              )
          )
          .map(
            x =>
              markTeamSide(
                x,
                "home"
              )
          );


      const a =
        normalized
          .filter(
            x =>
              x.status === "finished" &&
              teamNameMatch(
                x.away?.name,
                away
              )
          )
          .map(
            x =>
              markTeamSide(
                x,
                "away"
              )
          );


      homeRecent.push(...h);

      awayRecent.push(...a);


      if(
        fixture &&
        homeRecent.length >= 5 &&
        awayRecent.length >= 5
      )
        break;

    }


    homeRecent =
      dedupeMatches(
        homeRecent
      )
      .sort(byDateDesc)
      .slice(
        0,
        CONFIG.MAX_RECENT_MATCHES
      );


    awayRecent =
      dedupeMatches(
        awayRecent
      )
      .sort(byDateDesc)
      .slice(
        0,
        CONFIG.MAX_RECENT_MATCHES
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
          "المصدر متصل لكنه لا يغطي هذه المباراة.",

        data:null

      };

    }


    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم استلام بيانات حقيقية من OpenLigaDB.",

      data:{

        fixture,

        homeRecent,

        awayRecent

      }

    };

  }

}


/* =========================================================
   SOFASCORE PROVIDER
   ========================================================= */

class SofaScoreProvider{

  constructor(){

    this.name =
      "SofaScore";

    this.base =
      "https://api.sofascore.com/api/v1";

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
          "لم يتم العثور على الفريقين في SofaScore.",

        data:null

      };

    }


    const [
      homeLast,
      awayLast,
      homeNext,
      awayNext
    ] =
      await Promise.all([

        sofaTeamEvents(
          homeTeam.id,
          "last"
        ),

        sofaTeamEvents(
          awayTeam.id,
          "last"
        ),

        sofaTeamEvents(
          homeTeam.id,
          "next"
        ),

        sofaTeamEvents(
          awayTeam.id,
          "next"
        )

      ]);


    const allUpcoming = [

      ...homeNext,

      ...awayNext

    ];


    const fixture =
      findFixture(
        allUpcoming,
        home,
        away
      );


    const homeRecent =
      recentForTeam(
        homeLast,
        home,
        CONFIG.MAX_RECENT_MATCHES
      );


    const awayRecent =
      recentForTeam(
        awayLast,
        away,
        CONFIG.MAX_RECENT_MATCHES
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
          "SofaScore متصل لكن لم يعط بيانات مناسبة.",

        data:null

      };

    }


    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم استلام بيانات حقيقية من SofaScore.",

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
      "https://api.sofascore.com/api/v1/search/all"
    );


  url.searchParams.set(
    "q",
    name
  );


  const r =
    await fetchJson(
      url.toString(),
      {},
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "SofaScore HTTP 429"
      );


    if(
      r.status === 403
    )
      throw new Error(
        "SofaScore HTTP 403"
      );


    throw new Error(
      "SofaScore HTTP "+
      r.status
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
          String(
            x?.entity?.sport?.slug ||
            ""
          ).toLowerCase()
          === "football"
      )
      .map(
        x => ({

          id:
            x?.entity?.id,

          name:
            x?.entity?.name

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
  teamId,
  direction
){

  const url =
    "https://api.sofascore.com/api/v1/team/"+
    encodeURIComponent(
      teamId
    )+
    "/events/"+
    direction;


  const r =
    await fetchJson(
      url,
      {},
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "SofaScore HTTP 429"
      );


    if(
      r.status === 403
    )
      throw new Error(
        "SofaScore HTTP 403"
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
      normalizeSofaMatch
    )
    .filter(Boolean);

}


/* =========================================================
   ESPN PROVIDER
   ========================================================= */

class EspnProvider{

  constructor(){

    this.name =
      "ESPN";

  }


  async getMatchData(
    home,
    away,
    env,
    ctx
  ){

    /*
      ESPN needs a competition slug.
      We search a controlled list rather
      than making unlimited requests.
    */

    const leagues = [

      "eng.1",
      "eng.2",
      "esp.1",
      "ger.1",
      "ita.1",
      "fra.1",
      "ned.1",
      "por.1",
      "sco.1",
      "tur.1",
      "usa.1",
      "bra.1",
      "arg.1",
      "mex.1",
      "ksa.1",
      "uefa.champions"

    ];


    let homeTeam = null;

    let awayTeam = null;

    let homeLeague = null;

    let awayLeague = null;


    /*
      Search both teams.
      Stop as soon as both are found.
    */

    for(
      const league of leagues
    ){

      if(
        !homeTeam
      ){

        homeTeam =
          await espnFindTeam(
            home,
            league
          );

        if(homeTeam)
          homeLeague =
            league;

      }


      if(
        !awayTeam
      ){

        awayTeam =
          await espnFindTeam(
            away,
            league
          );

        if(awayTeam)
          awayLeague =
            league;

      }


      if(
        homeTeam &&
        awayTeam
      )
        break;

    }


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
          "ESPN لم يجد الفريقين ضمن المنافسات المدعومة.",

        data:null

      };

    }


    const [
      homeSchedule,
      awaySchedule
    ] =
      await Promise.all([

        espnTeamSchedule(
          homeLeague,
          homeTeam.id
        ),

        espnTeamSchedule(
          awayLeague,
          awayTeam.id
        )

      ]);


    const fixture =
      findFixture(
        [
          ...homeSchedule,
          ...awaySchedule
        ],
        home,
        away
      );


    const homeRecent =
      recentForTeam(
        homeSchedule,
        home,
        CONFIG.MAX_RECENT_MATCHES
      );


    const awayRecent =
      recentForTeam(
        awaySchedule,
        away,
        CONFIG.MAX_RECENT_MATCHES
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
          "ESPN متصل لكن لم يعط تاريخاً مناسباً.",

        data:null

      };

    }


    return {

      provider:
        this.name,

      status:
        "success",

      message:
        "تم استلام بيانات حقيقية من ESPN.",

      data:{

        fixture,

        homeRecent,

        awayRecent

      }

    };

  }

}


async function espnFindTeam(
  name,
  league
){

  const url =
    new URL(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/"+
      league+
      "/teams"
    );


  url.searchParams.set(
    "limit",
    "500"
  );


  const r =
    await fetchJson(
      url.toString(),
      {},
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "ESPN HTTP 429"
      );


    if(
      r.status === 403
    )
      throw new Error(
        "ESPN HTTP 403"
      );


    return null;

  }


  const rows =
    Array.isArray(
      r.data?.sports?.[0]
        ?.leagues?.[0]
        ?.teams
    )

    ?

    r.data.sports[0]
      .leagues[0]
      .teams

    : [];


  const teams =
    rows
      .map(
        x =>
          x?.team || x
      )
      .filter(Boolean)
      .map(
        x => ({

          id:
            x.id,

          name:
            x.displayName ||
            x.name ||
            x.shortDisplayName

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


async function espnTeamSchedule(
  league,
  teamId
){

  const url =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/"+
    league+
    "/teams/"+
    encodeURIComponent(
      teamId
    )+
    "/schedule";


  const r =
    await fetchJson(
      url,
      {},
      CONFIG.CACHE_SECONDS
    );


  if(!r.ok){

    if(
      r.status === 429
    )
      throw new Error(
        "ESPN HTTP 429"
      );


    if(
      r.status === 403
    )
      throw new Error(
        "ESPN HTTP 403"
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
      normalizeEspnMatch
    )
    .filter(Boolean);

}


/* =========================================================
   MERGE
   ========================================================= */

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


  for(
    const r of results
  ){

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


  const normalizedHome =
    dedupeMatches(
      homeRecent
    )
    .filter(
      x =>
        x.status === "finished"
    )
    .sort(
      byDateDesc
    )
    .slice(
      0,
      CONFIG.MAX_RECENT_MATCHES
    );


  const normalizedAway =
    dedupeMatches(
      awayRecent
    )
    .filter(
      x =>
        x.status === "finished"
    )
    .sort(
      byDateDesc
    )
    .slice(
      0,
      CONFIG.MAX_RECENT_MATCHES
    );


  return {

    fixture,

    home:
      normalizedHome,

    away:
      normalizedAway

  };

}


/* =========================================================
   ANALYSIS ENGINE
   ========================================================= */

function buildAnalysis(
  homeMatches,
  awayMatches,
  fixture,
  homeName,
  awayName,
  usableProviderCount
){

  const homeStats =
    summarizeTeam(
      homeMatches
    );


  const awayStats =
    summarizeTeam(
      awayMatches
    );


  const dataQuality =
    calculateDataQuality(
      homeMatches,
      awayMatches,
      fixture,
      usableProviderCount
    );


  const dataSummary = {

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

  };


  /*
    HARD DATA GATE

    We do NOT generate a prediction
    when the historical sample is too small.
  */

  const enoughData =
    homeStats.matches >=
      CONFIG.MIN_TEAM_MATCHES &&

    awayStats.matches >=
      CONFIG.MIN_TEAM_MATCHES &&

    (
      homeStats.matches +
      awayStats.matches
    ) >=
      CONFIG.MIN_TOTAL_MATCHES &&

    dataQuality >=
      CONFIG.MIN_DATA_QUALITY_FOR_BET;


  if(!enoughData){

    return {

      predictions:[],

      metrics:{

        homeExpectedGoals:0,

        awayExpectedGoals:0,

        homeWin:0,

        draw:0,

        awayWin:0,

        btts:0,

        over25:0,

        under25:0

      },

      dataSummary,

      summary:{

        strongestLabel:
          "لا توجد توصية",

        strongestProbability:
          0,

        mostLikelyScore:
          "—",

        dataQuality,

        recommendationStatus:
          "no_bet",

        reason:
          "العينة التاريخية أو جودة المصادر غير كافية."

      }

    };

  }


  /*
    Attack / defence averages.

    These are NOT xG.
    They are historical goals averages.
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


  /*
    Home advantage is intentionally modest.
    It must not dominate the data.
  */

  const lambdaHome =
    clamp(

      (
        0.55 *
        homeAttack
      )+

      (
        0.45 *
        awayDefense
      )+

      0.18,

      0.20,

      3.50

    );


  const lambdaAway =
    clamp(

      (
        0.55 *
        awayAttack
      )+

      (
        0.45 *
        homeDefense
      ),

      0.15,

      3.20

    );


  const probs =
    poissonMatchProbabilities(
      lambdaHome,
      lambdaAway
    );


  const totalExpectedGoals =
    lambdaHome +
    lambdaAway;


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
        totalExpectedGoals
      ),

      0,

      1

    );


  const over25 =
    clamp(

      1 -
      poissonCdf(
        2,
        totalExpectedGoals
      ),

      0,

      1

    );


  const under25 =
    clamp(
      1 -
      over25,
      0,
      1
    );


  const rawPredictions = [

    {

      key:
        "btts",

      label:
        "كلا الفريقين يسجلان",

      probability:
        btts * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_MARKET,

      reason:
        "الاحتمال مبني على توزيع الأهداف المتوقع من الأداء التاريخي الهجومي والدفاعي للفريقين."

    },


    {

      key:
        "over25",

      label:
        "أكثر من 2.5 هدف",

      probability:
        over25 * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_MARKET,

      reason:
        "الاحتمال ناتج عن توزيع بواسون لمجموع الأهداف المتوقع، وليس رقماً ثابتاً."

    },


    {

      key:
        "under25",

      label:
        "أقل من 2.5 هدف",

      probability:
        under25 * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_MARKET,

      reason:
        "الاحتمال ناتج عن توزيع بواسون لمجموع الأهداف المتوقع."

    },


    {

      key:
        "home",

      label:
        `فوز ${homeName}`,

      probability:
        probs.home * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_RESULT,

      reason:
        "الاحتمال يجمع الأداء الهجومي والدفاعي التاريخي مع أفضلية الأرض."

    },


    {

      key:
        "draw",

      label:
        "التعادل",

      probability:
        probs.draw * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_RESULT,

      reason:
        "احتمال التعادل ناتج مباشرة من جميع النتائج الممكنة في توزيع بواسون."

    },


    {

      key:
        "away",

      label:
        `فوز ${awayName}`,

      probability:
        probs.away * 100,

      threshold:
        CONFIG.MIN_PROBABILITY_RESULT,

      reason:
        "الاحتمال يعتمد على القوة الهجومية للضيف والدفاع التاريخي للمضيف."

    }

  ];


  /*
    A market becomes a recommendation
    only if it passes its minimum probability.
  */

  const predictions =
    rawPredictions

      .filter(
        x =>
          Number.isFinite(
            x.probability
          )
      )

      .filter(
        x =>
          x.probability >=
          x.threshold
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

          key:
            x.key,

          label:
            x.label,

          rank:
            i + 1,

          probability:
            round2(
              x.probability
            ),

          reason:
            x.reason

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

      homeExpectedGoals:
        round2(
          lambdaHome
        ),

      awayExpectedGoals:
        round2(
          lambdaAway
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
        ),

      over25:
        round2(
          over25 *
          100
        ),

      under25:
        round2(
          under25 *
          100
        )

    },

    dataSummary,

    summary:{

      strongestLabel:
        predictions[0]?.label ||
        "لا يوجد",

      strongestProbability:
        predictions[0]?.probability ||
        0,

      mostLikelyScore:
        score,

      dataQuality,

      recommendationStatus:
        predictions.length
          ? "recommended"
          : "no_bet",

      reason:
        predictions.length
          ? "تجاوزت التوقعات المتاحة حد الثقة الداخلي."
          : "لم يتجاوز أي سوق حد الثقة الداخلي."

    }

  };

}


/* =========================================================
   TEAM STATISTICS
   ========================================================= */

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
      m._teamSide === "away"
        ? as
        : hs;


    const ga =
      m._teamSide === "away"
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
   RECENT TEAM MATCHES
   ========================================================= */

function recentForTeam(
  matches,
  team,
  limit
){

  return (

    matches || []

  )

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
   MATCH HELPERS
   ========================================================= */

function findFixture(
  matches,
  home,
  away
){

  return (

    matches || []

  ).find(
    x =>
      teamsPairMatch(
        x,
        home,
        away
      )
  ) || null;

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


function markTeamSide(
  match,
  side
){

  return {

    ...match,

    _teamSide:
      side

  };

}


/* =========================================================
   TEAM NAME MATCHING
   ========================================================= */

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


  const tokens =
    y
      .split(" ")
      .filter(
        t =>
          t.length >= 3
      );


  let common =
    0;


  for(
    const token of tokens
  ){

    if(
      xt.has(token)
    )
      common++;

  }


  return common >= 1;

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
    const row of rows || []
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


  return bestScore >= 0.45
    ? best
    : null;

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


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeName(
  value
){

  return String(
    value || ""
  )

    .toLowerCase()

    .trim()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .replace(
      /&/g,
      " and "
    )

    .replace(
      /\b(fc|cf|afc|sc|ac|fk|club|football club)\b/g,
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
  ).replace(
    /\s+/g,
    "_"
  );

}


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

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
    s === "ft" ||
    s === "post"
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


/* =========================================================
   PROVIDER NORMALIZERS
   ========================================================= */

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

    status:
      normalizeStatus(
        x.status?.name ??
        x.status ??
        x.state
      ),

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


  const result =
    Array.isArray(
      x.matchResults
    )

    ?

    (
      x.matchResults.find(
        r =>
          Number(
            r.resultTypeID
          ) === 2
      ) ||
      x.matchResults[0] ||
      {}
    )

    : {};


  const hs =
    numberOrNull(
      result.pointsTeam1
    );


  const as =
    numberOrNull(
      result.pointsTeam2
    );


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

      home:hs,

      away:as

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


  const status =
    x.status ||
    {};


  const hs =
    numberOrNull(
      x.homeScore?.normaltime ??
      x.homeScore?.current ??
      x.homeScore?.display
    );


  const as =
    numberOrNull(
      x.awayScore?.normaltime ??
      x.awayScore?.current ??
      x.awayScore?.display
    );


  const finished =
    status.type === "finished" ||
    status.type === "ended" ||
    status.description === "Finished";


  return {

    id:
      String(
        x.id ||
        ""
      ),

    utcDate:
      x.startTimestamp
        ? new Date(
            x.startTimestamp * 1000
          ).toISOString()
        : null,

    status:
      finished &&
      hs != null &&
      as != null

      ? "finished"

      : "upcoming",

    home:{

      id:
        x.homeTeam?.id ||
        null,

      name:
        x.homeTeam?.name ||
        x.homeTeam?.shortName ||
        null

    },

    away:{

      id:
        x.awayTeam?.id ||
        null,

      name:
        x.awayTeam?.name ||
        x.awayTeam?.shortName ||
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


function normalizeEspnMatch(
  x
){

  if(!x)
    return null;


  const competition =
    x.competitions?.[0];


  if(!competition)
    return null;


  const competitors =
    competition.competitors ||
    [];


  let homeTeam =
    competitors.find(
      c =>
        c.homeAway === "home"
    );


  let awayTeam =
    competitors.find(
      c =>
        c.homeAway === "away"
    );


  if(
    !homeTeam ||
    !awayTeam
  ){

    homeTeam =
      competitors[0];

    awayTeam =
      competitors[1];

  }


  if(
    !homeTeam ||
    !awayTeam
  )
    return null;


  const hs =
    numberOrNull(
      homeTeam.score
    );


  const as =
    numberOrNull(
      awayTeam.score
    );


  const completed =
    competition.status?.type
      ?.completed === true;


  return {

    id:
      String(
        x.id ||
        ""
      ),

    utcDate:
      x.date ||
      null,

    status:
      completed &&
      hs != null &&
      as != null

      ? "finished"

      : "upcoming",

    home:{

      id:
        homeTeam.team?.id ||
        null,

      name:
        homeTeam.team?.displayName ||
        homeTeam.team?.name ||
        null

    },

    away:{

      id:
        awayTeam.team?.id ||
        null,

      name:
        awayTeam.team?.displayName ||
        awayTeam.team?.name ||
        null

    },

    score:{

      home:hs,

      away:as

    },

    league:
      x.league?.name ||
      null

  };

}


/* =========================================================
   DEDUPLICATION / DATES
   ========================================================= */

function byDateDesc(
  a,
  b
){

  const aa =
    Date.parse(
      a?.utcDate ||
      ""
    ) || 0;


  const bb =
    Date.parse(
      b?.utcDate ||
      ""
    ) || 0;


  return bb - aa;

}


function dedupeMatches(
  rows
){

  const map =
    new Map();


  for(
    const row of rows || []
  ){

    const key =

      row?.id

      ||

      (
        normalizeName(
          row?.home?.name
        )+

        "|" +

        normalizeName(
          row?.away?.name
        )+

        "|" +

        (
          row?.utcDate ||
          ""
        )
      );


    if(
      !map.has(key)
    ){

      map.set(
        key,
        row
      );

    }

  }


  return [
    ...map.values()
  ];

}


/* =========================================================
   DATA QUALITY
   ========================================================= */

function calculateDataQuality(
  homeMatches,
  awayMatches,
  fixture,
  usableProviderCount
){

  let score =
    0;


  /*
    Historical sample:
    maximum 50 points.
  */

  const homeSample =
    Math.min(
      homeMatches.length,
      15
    );


  const awaySample =
    Math.min(
      awayMatches.length,
      15
    );


  score +=
    Math.round(
      (
        homeSample /
        15
      ) *
      25
    );


  score +=
    Math.round(
      (
        awaySample /
        15
      ) *
      25
    );


  /*
    Provider diversity:
    maximum 25 points.
  */

  score +=
    Math.min(
      usableProviderCount,
      5
    ) *
    5;


  /*
    Fixture confirmation:
    10 points.
  */

  if(
    fixture
  )
    score += 10;


  /*
    Recency:
    maximum 15 points.
  */

  const recentCount =
    countRecentMatches(
      [
        ...homeMatches,
        ...awayMatches
      ],
      90
    );


  score +=
    Math.round(
      Math.min(
        recentCount,
        10
      ) *
      1.5
    );


  /*
    Do not allow a fake 100.
    Maximum is deliberately 100,
    but requires multiple real signals.
  */

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );

}


function countRecentMatches(
  matches,
  days
){

  const cutoff =
    Date.now() -
    (
      days *
      24 *
      60 *
      60 *
      1000
    );


  let count =
    0;


  for(
    const m of matches || []
  ){

    const t =
      Date.parse(
        m?.utcDate ||
        ""
      );


    if(
      t &&
      t >= cutoff
    )
      count++;

  }


  return count;

}


/* =========================================================
   POISSON
   ========================================================= */

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
    h<=CONFIG.MAX_SCORE_GOALS;
    h++
  ){

    for(
      let a=0;
      a<=CONFIG.MAX_SCORE_GOALS;
      a++
    ){

      const p =

        poissonPmf(
          h,
          homeLambda
        )

        *

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


  if(
    total <= 0
  ){

    return {

      home:0,

      draw:0,

      away:0

    };

  }


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
        )

        *

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
   MISC HELPERS
   ========================================================= */

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


function round2(
  value
){

  return Math.round(
    Number(value) *
    100
  ) /
  100;

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


function currentFootballSeason(){

  const now =
    new Date();


  const year =
    now.getUTCFullYear();


  const month =
    now.getUTCMonth() + 1;


  /*
    European football season:
    July -> June.
  */

  return month >= 7
    ? year
    : year - 1;

}


/* =========================================================
   FETCH WITH TIMEOUT + CACHE
   ========================================================= */

async function fetchJson(
  url,
  options={},
  cacheSeconds=0
){

  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () =>
        controller.abort(),
      CONFIG.REQUEST_TIMEOUT_MS
    );


  try{

    const request =
      new Request(
        url,
        {

          method:
            options.method ||
            "GET",

          headers:
            options.headers ||
            {},

          signal:
            controller.signal

        }
      );


    /*
      Cloudflare Cache
    */

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


  }catch(error){

    if(
      error?.name ===
      "AbortError"
    ){

      throw new Error(
        "Request timeout"
      );

    }


    throw error;


  }finally{

    clearTimeout(
      timer
    );

  }

}
