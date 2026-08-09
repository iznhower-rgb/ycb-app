// Y.C.B FINAL WORKER 2.2.1

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

const VERSION = "2.2.1";

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
        "prediction
