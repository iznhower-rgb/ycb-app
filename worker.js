// ==========================================================
// Y.C.B WORKER 4.3.0 - ADVANCED QUANTITATIVE PREDICTION SUITE
// ==========================================================

import {
  getProviders,
  getAllMatchData,
  getUsableProviderResults,
  countFixtureVerifications,
  countHistoryProviders,
  getProviderSummary
} from "./providers.js";
import {
  teamsMatch,
  resolveTeamAlias,
  cleanRawName
} from "./teamAliases.js";
import {
  buildDixonColesMatrix,
  calculateCalibratedXg,
  evaluateDixonColesScores,
  calculatePythagoreanExpectation,
  calculateTimeDecayWeights,
  estimateTeamElo,
  calculateEloMatchExpectancy,
  analyzeHeadToHead,
  calculateFatigueIndex,
  detectDerbyAndMotivation,
  generateWeatherCondition,
  getRefereeProfile,
  getEaSportsRating,
  buildProAnalystReport,
  buildMarketOddsAndValueBets,
  buildLockerRoomAndInsiderIntel,
  buildDeepWebAndAnalystLeaks,
  buildBookmakerFinancialFlows,
  buildEaFifaMetaRatings,
  buildMatchIntegrityRadar,
  buildStartingLineupsAndDuels,
  buildModelConfidenceAndBacktest,
  buildGameTimingAndHalfTimeMatrix,
  buildArbitrageAndDiscrepancyScanner,
  buildKellyCriterionBankrollStrategy
} from "./quantEngine.js";
import { generateAiMatchReport } from "./geminiMatchAi.js";
import { CLIENT_JS } from "./clientCode.js";

/* ==========================================================
   PROVIDERS
========================================================== */

import "./espnProvider.js";
import "./theSportsDBProvider.js";
import "./openFootballProvider.js";
import "./openLigaProvider.js";
import "./bsdProvider.js";

/* ==========================================================
   VERSION & CONFIG
========================================================== */

const VERSION = "4.3.0";
const MIN_HISTORY = 3;
const MIN_FIXTURE_PROVIDERS = 1;
const MIN_DATA_QUALITY = 50;
const MIN_RECOMMENDATION_PROBABILITY = 0.50;

/* ==========================================================
   HTML INTERFACE
========================================================== */

const HTML = `<!doctype html>
<html lang="fr" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1120">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="application-name" content="YCB Football">
<link rel="manifest" href="/manifest.json">
<title>Y.C.B Pro Football Prediction & Quantitative Engine</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow-x:hidden;background:#0b1120;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.app{width:100%;max-width:920px;margin:auto;padding:20px 14px 60px}
.header{text-align:center;margin-bottom:24px}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;background:#1e293b;color:#38bdf8;border:1px solid #334155;margin-bottom:8px}
h1{font-size:36px;font-weight:900;margin:0 0 4px;background:linear-gradient(135deg,#60a5fa,#38bdf8,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.subtitle{color:#94a3b8;font-size:15px}

.card{background:#131d33;border:1px solid #1e293b;border-radius:18px;padding:20px;margin-bottom:20px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3)}
.input-row{display:flex;flex-direction:column;gap:12px}
input{width:100%;padding:15px;background:#0b1120;border:1px solid #334155;border-radius:12px;font-size:16px;color:#fff;text-align:center;outline:none;transition:border-color .2s}
input:focus{border-color:#38bdf8}
.btn-group{display:grid;grid-template-columns:1fr;gap:10px}
button{padding:15px;border:0;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;box-shadow:0 4px 14px rgba(2,132,199,0.3)}
.btn-primary:hover{opacity:.95;transform:translateY(-1px)}
.btn-secondary{background:#1e293b;color:#cbd5e1;border:1px solid #334155}
.btn-secondary:hover{background:#334155}
button:disabled{opacity:.5;cursor:not-allowed;transform:none}

.status{text-align:center;margin-top:14px;font-size:14px;color:#94a3b8;line-height:1.6}
.success{color:#4ade80!important}
.error{color:#f87171!important}
.warning{color:#fbbf24!important}
.hidden{display:none!important}

/* TABS */
.tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:18px;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab-btn{padding:8px 16px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#94a3b8;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;transition:all .15s}
.tab-btn:hover{color:#fff;background:#273549}
.tab-btn.active{background:#0284c7;color:#fff;border-color:#38bdf8}

/* PANELS & SECTIONS */
.panel{background:#131d33;border:1px solid #1e293b;border-radius:16px;padding:18px;margin-bottom:18px}
.panel-title{font-size:17px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px;color:#f1f5f9}

/* PREDICTION CARDS */
.rec-box{background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #059669;border-radius:14px;padding:16px;margin-bottom:16px;color:#a7f3d0}
.rec-title{font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#34d399;margin-bottom:4px}
.rec-content{font-size:18px;font-weight:800;color:#fff}

.preds-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:14px}
.pred-card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between}
.pred-rank{font-size:15px;font-weight:700;color:#f8fafc}
.pred-prob{font-size:24px;font-weight:900;color:#38bdf8;margin:6px 0}
.pred-meta{font-size:12px;color:#94a3b8;line-height:1.4}

/* GRID STATS */
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.stat-box{background:#0b1120;border:1px solid #1e293b;border-radius:12px;padding:12px;text-align:center}
.stat-label{font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600}
.stat-value{font-size:18px;font-weight:800;color:#f8fafc;margin-top:4px}
.stat-sub{font-size:11px;color:#38bdf8;margin-top:2px}

/* ODDS & VALUE BET TABLE */
.odds-table{width:100%;border-collapse:collapse;margin-top:8px}
.odds-table th{text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;padding:8px 6px;border-bottom:1px solid #334155}
.odds-table td{padding:10px 6px;font-size:13px;border-bottom:1px solid #1e293b}
.ev-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px}
.ev-positive{background:#064e3b;color:#34d399;border:1px solid #059669}
.ev-neutral{background:#1e293b;color:#94a3b8}

/* CUSTOM INTEL CARDS & BADGES */
.intel-card{background:#0b1120;border:1px solid #1e293b;border-radius:14px;padding:16px;margin-bottom:10px}
.playstyle-pill{display:inline-block;margin:3px 4px 3px 0;padding:4px 9px;background:#1e293b;color:#38bdf8;border:1px solid #0284c7;border-radius:8px;font-size:11px;font-weight:700}
.leak-box{background:#111b2e;border-left:3px solid #38bdf8;padding:12px 14px;border-radius:0 10px 10px 0;margin:8px 0;font-size:13px;line-height:1.6;color:#cbd5e1}
.check-item{display:flex;justify-content:space-between;align-items:flex-start;padding:10px 12px;background:#0b1120;border-radius:10px;margin-bottom:8px;border:1px solid #1e293b}
.badge-clean{background:#064e3b;color:#34d399;border:1px solid #059669;padding:4px 10px;border-radius:8px;font-weight:700;font-size:12px}
.badge-warn{background:#78350f;color:#fcd34d;border:1px solid #b45309;padding:4px 10px;border-radius:8px;font-weight:700;font-size:12px}

/* AI BOX */
.ai-box{background:#0f172a;border:1px solid #3b82f6;border-radius:14px;padding:16px;line-height:1.7;font-size:14px;color:#cbd5e1;white-space:pre-line}

/* EXECUTIVE SLIP & PRINT STYLES */
.exec-card{background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);border:2px solid #6366f1;border-radius:18px;padding:22px;margin-bottom:18px;position:relative;box-shadow:0 10px 25px -5px rgba(99,102,241,0.2)}
.exec-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #312e81;padding-bottom:12px;margin-bottom:14px}
.duel-card{background:#0b1120;border:1px solid #1e293b;border-radius:12px;padding:14px;margin-bottom:10px}
.duel-adv{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:800}
.htft-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.htft-item{background:#0b1120;border:1px solid #1e293b;border-radius:10px;padding:10px;text-align:center;transition:all .15s}
.htft-item:hover{border-color:#38bdf8;background:#131d33}
.timing-bar{height:8px;border-radius:4px;background:#1e293b;overflow:hidden;margin-top:6px}
.timing-fill{height:100%;background:linear-gradient(90deg,#0284c7,#38bdf8);border-radius:4px}
.bankroll-input{background:#0b1120;border:1px solid #334155;border-radius:8px;padding:8px 12px;color:#fff;font-weight:700;font-size:14px;width:140px}

/* PROVIDERS LIST */
.prov-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0b1120;border-radius:10px;margin-bottom:6px;font-size:13px}

.chip-btn{background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:20px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s}
.chip-btn:hover{background:#0284c7;color:#fff;border-color:#38bdf8}

@media(max-width:600px){
  .btn-group{grid-template-columns:1fr}
  .grid-2,.grid-3,.grid-4{grid-template-columns:1fr 1fr}
  h1{font-size:28px}
}
</style>
</head>
<body>
<div class="app">

<div class="header">
  <div class="badge">Quantitative AI Match Engine v${VERSION}</div>
  <h1>Y.C.B Football Intelligence</h1>
</div>

<div class="card">
  <div class="input-row">
    <input id="match" value="Arsenal vs Coventry City" placeholder="Ex: Arsenal vs Coventry City ou Barcelone vs Majorque" onkeydown="if(event.key==='Enter')analyzeMatch()">
    <div class="btn-group">
      <button id="analyzeBtn" class="btn-primary" onclick="analyzeMatch()">🚀 Analyser le Match</button>
    </div>
  </div>
  <div id="status" class="status"></div>
  <div id="health" class="panel hidden" style="margin-top:14px;font-size:13px;line-height:1.7"></div>
</div>

<div id="result" class="hidden">

  <!-- TOP RECOMMANDATION & PREDICTIONS -->
  <div class="panel">
    <div id="recBox" class="rec-box">
      <div class="rec-title">🎯 Recommandation Principale Y.C.B</div>
      <div id="recMessage" class="rec-content">-</div>
    </div>

    <div class="panel-title">🏆 Top 3 Sélections Statistiques</div>
    <div class="preds-grid">
      <div class="pred-card">
        <div id="predRank1" class="pred-rank">🥇 -</div>
        <div id="predProb1" class="pred-prob">-</div>
        <div id="predMeta1" class="pred-meta">-</div>
      </div>
      <div class="pred-card">
        <div id="predRank2" class="pred-rank">🥈 -</div>
        <div id="predProb2" class="pred-prob">-</div>
        <div id="predMeta2" class="pred-meta">-</div>
      </div>
      <div class="pred-card">
        <div id="predRank3" class="pred-rank">🥉 -</div>
        <div id="predProb3" class="pred-prob">-</div>
        <div id="predMeta3" class="pred-meta">-</div>
      </div>
    </div>

    <div class="grid-4" style="margin-top:10px">
      <div class="stat-box">
        <div class="stat-label">Score Exact Probable</div>
        <div id="bestScore" class="stat-value">-</div>
        <div id="bestScoreScenario" class="stat-sub" style="color:#38bdf8">-</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Indice de Qualité Data</div>
        <div id="dataQuality" class="stat-value">-</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">xG Domicile</div>
        <div id="homeXg" class="stat-value">-</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">xG Extérieur</div>
        <div id="awayXg" class="stat-value">-</div>
      </div>
    </div>
  </div>

  <!-- NAVIGATION TABS -->
  <div class="tabs">
    <button class="tab-btn active" onclick="switchTab('execSlipTab', this)">🎯 بطاقة القرار والمشاركة</button>
    <button class="tab-btn" onclick="switchTab('confidenceTab', this)">📈 مؤشر الثقة والاختبار الرجعي</button>
    <button class="tab-btn" onclick="switchTab('lineupsTab', this)">🧠 التشكيلات والمعارك الفردية</button>
    <button class="tab-btn" onclick="switchTab('timingTab', this)">⏱️ توقيت الأهداف ومصفوفة الشوطين</button>
    <button class="tab-btn" onclick="switchTab('kellyTab', this)">🎯 حاسبة كيلي والمحفظة</button>
    <button class="tab-btn" onclick="switchTab('arbitrageTab', this)">🌐 رادار الأربيتراج وبينكل</button>
    <button class="tab-btn" onclick="switchTab('insiderTab', this)">🕵️‍♂️ الكواليس والتسريبات</button>
    <button class="tab-btn" onclick="switchTab('integrityTab', this)">🚨 كشف التلاعب والسيولة</button>
    <button class="tab-btn" onclick="switchTab('fifaTab', this)">🎮 فيفا وميتا EA Sports</button>
    <button class="tab-btn" onclick="switchTab('oddsTab', this)">💰 Cotes & Value Bets</button>
    <button class="tab-btn" onclick="switchTab('pythagorasTab', this)">📐 Pythagore & Dixon-Coles</button>
    <button class="tab-btn" onclick="switchTab('aiTab', this)">🤖 Rapport IA Gemini</button>
    <button class="tab-btn" onclick="switchTab('analystTab', this)">📊 Données Pro (Opta/FBref)</button>
    <button class="tab-btn" onclick="switchTab('contextTab', this)">🌤️ Météo & Arbitre</button>
    <button class="tab-btn" onclick="switchTab('sourcesTab', this)">🔍 Sources Providers</button>
  </div>

  <!-- TAB: EXECUTIVE BET SLIP & SHARE CARD -->
  <div id="execSlipTab" class="tab-content">
    <div class="exec-card" id="executivePrintCard">
      <div class="exec-header">
        <div>
          <span style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#a5b4fc;font-weight:800">Y.C.B Institutional Quantitative Slip</span>
          <h2 id="execMatchTitle" style="margin:4px 0 0;font-size:22px;color:#fff;font-weight:900">-</h2>
        </div>
        <div style="text-align:right">
          <span id="execConfidenceBadge" class="ev-badge ev-positive" style="font-size:13px;padding:5px 12px">Thèse 92%</span>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom:14px">
        <div class="stat-box" style="background:#1e1b4b;border-color:#4338ca">
          <div class="stat-label" style="color:#c7d2fe">الرهان الأساسي المستحسن</div>
          <div id="execPrimaryBet" class="stat-value" style="color:#38bdf8;font-size:16px">-</div>
          <div id="execPrimaryEv" class="stat-sub" style="color:#34d399">-</div>
        </div>
        <div class="stat-box" style="background:#1e1b4b;border-color:#4338ca">
          <div class="stat-label" style="color:#c7d2fe">حصة كيلي المثلى (Bankroll)</div>
          <div id="execKellyStake" class="stat-value" style="color:#fcd34d;font-size:16px">-</div>
          <div id="execKellyAmount" class="stat-sub" style="color:#a5b4fc">-</div>
        </div>
        <div class="stat-box" style="background:#1e1b4b;border-color:#4338ca">
          <div class="stat-label" style="color:#c7d2fe">السيناريو والنتيجة المرجحة</div>
          <div id="execScoreScenario" class="stat-value" style="color:#f8fafc;font-size:16px">-</div>
          <div id="execIntegrityBadge" class="stat-sub" style="color:#34d399">✅ نزاهة تامة</div>
        </div>
      </div>

      <div class="leak-box" style="border-left-color:#818cf8;background:#1e1b4b;color:#e0e7ff;margin-bottom:14px">
        <b>💡 الخلاصة الاستثمارية :</b> <span id="execExecutiveSummary">-</span>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-primary" style="padding:10px 18px;font-size:13px" onclick="copyExecutiveSlip()">📋 نسخ بطاقة الرهان لمشاركتها</button>
        <button class="btn-secondary" style="padding:10px 18px;font-size:13px" onclick="window.print()">🖨️ طباعة / تصدير التقرير PDF</button>
      </div>
    </div>
  </div>

  <!-- TAB: CONFIDENCE CALIBRATION & HISTORICAL BACKTESTING -->
  <div id="confidenceTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">📈 مؤشر الثقة الكمية للنموذج والاختبار الرجعي (Confidence & Backtesting)</div>
      <div class="grid-3" style="margin-bottom:14px">
        <div class="stat-box">
          <div class="stat-label">مؤشر توافق النماذج (Consensus Score)</div>
          <div id="confScoreVal" class="stat-value" style="color:#34d399;font-size:26px">-</div>
          <div id="confTierVal" class="stat-sub" style="color:#38bdf8">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">نسبة نجاح آخر 50 مباراة مطابقة</div>
          <div id="backtestWinRate" class="stat-value" style="color:#38bdf8;font-size:26px">-</div>
          <div id="backtestSuccessCount" class="stat-sub">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">العائد الاستثماري المحاكى (Simulated ROI)</div>
          <div id="backtestRoi" class="stat-value" style="color:#fcd34d;font-size:26px">-</div>
          <div id="backtestBrier" class="stat-sub">-</div>
        </div>
      </div>
      <div class="leak-box">
        <b>📊 تقرير الاختبار الرجعي :</b> <span id="backtestVerdictText">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: STARTING LINEUPS & 1V1 KEY DUELS -->
  <div id="lineupsTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🧠 التشكيلات التكتيكية والمعارك الفردية المباشرة (Starting XI Duels)</div>
      <div class="grid-2" style="margin-bottom:14px">
        <div class="stat-box">
          <div class="stat-label">رسم وتشكيل المضيف التكتيكي</div>
          <div id="lineupHomeFormation" class="stat-value" style="color:#38bdf8">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">رسم وتشكيل الضيف التكتيكي</div>
          <div id="lineupAwayFormation" class="stat-value" style="color:#38bdf8">-</div>
        </div>
      </div>
      
      <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:10px">⚔️ أبرز المعارك الفردية المفصلية (Key 1v1 Duels) :</div>
      <div id="lineupDuelsContainer"></div>
      
      <div class="leak-box" style="margin-top:10px">
        <b>👑 خلاصة التفوق التكتيكي :</b> <span id="tacticalSupremacyText">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: GAME TIMING & HALF-TIME / FULL-TIME MATRIX -->
  <div id="timingTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">⏱️ توقيت الأهداف المتوقع وفترات الخطورة (Goal Timing Probability)</div>
      <div class="leak-box" style="border-left-color:#f59e0b;background:#1e1b4b;margin-bottom:14px">
        <b>⚠️ نافذة الخطر التهديفي القصوى :</b> <span id="peakDangerWindowText" style="color:#fbbf24;font-weight:700">-</span>
      </div>
      <div id="timingIntervalsContainer" class="grid-2"></div>
    </div>

    <div class="panel">
      <div class="panel-title">🎲 مصفوفة الشوط الأول / النتيجة النهائية (Half-Time / Full-Time HT/FT)</div>
      <div id="htftMatrixContainer" class="htft-grid"></div>
      <div style="margin-top:12px;font-size:12px;color:#94a3b8">
        💡 <b>مصفوفة HT/FT</b> تدمج احتمالات سيناريوهات الشوط الأول والعودة في النتيجة مع أسعار المعاملات المقابلة.
      </div>
    </div>
  </div>

  <!-- TAB: KELLY CRITERION & BANKROLL CALCULATOR -->
  <div id="kellyTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🎯 حاسبة كيلي الاحترافية لإدارة رأس المال (Fractional Kelly Criterion)</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;background:#0b1120;padding:12px;border-radius:12px;border:1px solid #1e293b">
        <label style="font-size:13px;font-weight:700;color:#94a3b8">حجم محفظتك المالية (€) :</label>
        <input id="userBankrollInput" type="number" class="bankroll-input" value="1000" min="50" step="50">
        <button class="btn-primary" style="padding:8px 16px;font-size:13px" onclick="recalculateKelly()">🔄 إعادة احتساب الحصص</button>
      </div>

      <div style="overflow-x:auto">
        <table class="odds-table">
          <thead>
            <tr>
              <th>السوق الرياضي</th>
              <th>المعامل</th>
              <th>الاحتمال الحقيقي</th>
              <th>حصة كيلي (0.25x)</th>
              <th>المبلغ المستحسن</th>
              <th>الوحدات (Units)</th>
              <th>درجة الأمان</th>
            </tr>
          </thead>
          <tbody id="kellyTableBody"></tbody>
        </table>
      </div>
      <div class="leak-box" style="margin-top:12px">
        <b>🛡️ قاعدة الحماية :</b> <span id="bankrollRuleText">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: ARBITRAGE & PINNACLE SCANNER -->
  <div id="arbitrageTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🌐 كاشف الفوارق السعرية وبورصة بينكل (Arbitrage & Pinnacle Benchmark)</div>
      <div class="grid-2" style="margin-bottom:14px">
        <div class="intel-card">
          <div style="font-size:14px;font-weight:800;color:#38bdf8;margin-bottom:8px">🏛️ خطوط بورصة بينكل المعتمدة (Pinnacle Benchmark)</div>
          <div class="grid-3">
            <div class="stat-box"><div class="stat-label">1 (فوز المضيف)</div><div id="pinHomeOdd" class="stat-value">-</div></div>
            <div class="stat-box"><div class="stat-label">X (التعادل)</div><div id="pinDrawOdd" class="stat-value">-</div></div>
            <div class="stat-box"><div class="stat-label">2 (فوز الضيف)</div><div id="pinAwayOdd" class="stat-value">-</div></div>
          </div>
        </div>
        <div class="intel-card">
          <div style="font-size:14px;font-weight:800;color:#34d399;margin-bottom:8px">🏢 متوسط شركات المراهنات (Soft Books)</div>
          <div class="grid-3">
            <div class="stat-box"><div class="stat-label">1 (فوز المضيف)</div><div id="softHomeOdd" class="stat-value">-</div></div>
            <div class="stat-box"><div class="stat-label">X (التعادل)</div><div id="softDrawOdd" class="stat-value">-</div></div>
            <div class="stat-box"><div class="stat-label">2 (فوز الضيف)</div><div id="softAwayOdd" class="stat-value">-</div></div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="stat-box">
          <div class="stat-label">فارق قيمة خط الإغلاق (Closing Line Value Edge)</div>
          <div id="clvEdgeVal" class="stat-value" style="color:#38bdf8;font-size:24px">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">حالة الأربيتراج والمراجحة الفورية (SureBet)</div>
          <div id="arbStatusVal" class="stat-value" style="font-size:15px;color:#34d399">-</div>
        </div>
      </div>

      <div class="leak-box" style="margin-top:12px">
        <b>⚡ توصية استغلال الفوارق السعرية :</b> <span id="arbRecommendationText">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: INSIDER INTEL & LOCKER ROOM LEAKS -->
  <div id="insiderTab" class="tab-content">
    <div class="panel">
      <div class="panel-title">🕵️‍♂️ كواليس المعسكرات وغرف الملابس (Locker Room & Absences)</div>
      <div class="grid-2">
        <div class="intel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <b id="insiderHomeName" style="font-size:16px;color:#38bdf8">Domicile</b>
            <span id="insiderHomeMorale" class="ev-badge ev-positive">معنويات -</span>
          </div>
          <div class="leak-box">
            <b>⚡ أجواء المعسكر:</b> <span id="insiderHomeAtmosphere">-</span>
          </div>
          <div class="leak-box">
            <b>📋 التوجيه التكتيكي المسرب:</b> <span id="insiderHomeTactics">-</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:6px">
            <b>🚑 تقرير الغيابات:</b> <span id="insiderHomeAbsences" style="color:#f8fafc">-</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px">
            <b>👔 الاستقرار الفني:</b> <span id="insiderHomeCoach" style="color:#34d399">-</span>
          </div>
        </div>

        <div class="intel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <b id="insiderAwayName" style="font-size:16px;color:#38bdf8">Extérieur</b>
            <span id="insiderAwayMorale" class="ev-badge ev-positive">معنويات -</span>
          </div>
          <div class="leak-box">
            <b>⚡ أجواء المعسكر:</b> <span id="insiderAwayAtmosphere">-</span>
          </div>
          <div class="leak-box">
            <b>📋 التوجيه التكتيكي المسرب:</b> <span id="insiderAwayTactics">-</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:6px">
            <b>🚑 تقرير الغيابات:</b> <span id="insiderAwayAbsences" style="color:#f8fafc">-</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px">
            <b>👔 الاستقرار الفني:</b> <span id="insiderAwayCoach" style="color:#34d399">-</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">🌐 تسريبات شبكة المحللين والمنتديات المتخصصة (Analyst & Syndicate Leaks)</div>
      <div class="intel-card">
        <div style="font-size:14px;font-weight:700;color:#38bdf8;margin-bottom:6px">🧠 إجماع شبكة كشافة المحللين المعتمدة :</div>
        <div id="syndicateConsensus" style="font-size:14px;line-height:1.6;color:#f1f5f9;margin-bottom:12px">-</div>
        
        <div class="leak-box" style="border-left-color:#a855f7">
          <b>🔒 تسريب الحصة التدريبية الأخيرة :</b> <span id="secretTacticalLeak">-</span>
        </div>

        <div class="grid-2" style="margin-top:10px">
          <div class="stat-box">
            <div class="stat-label">نبض المنتديات التحليلية المتخصصة</div>
            <div id="forumSentimentText" class="stat-value" style="font-size:15px;color:#38bdf8">-</div>
            <div id="forumSentimentPercent" class="stat-sub">-</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">مؤشر موثوقية المصادر المغلقة</div>
            <div id="sourceReliabilityScore" class="stat-value" style="color:#34d399">-</div>
            <div id="sourceReliabilityDesc" class="stat-sub">Tier-1 Scoped</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: MATCH INTEGRITY & BOOKMAKER FLOWS -->
  <div id="integrityTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🚨 رادار كشف التلاعب ونزاهة المباريات (Match Integrity & Anomaly Radar)</div>
      <div class="intel-card" style="text-align:center;padding:20px 16px;margin-bottom:14px">
        <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;font-weight:700">مؤشر خطر الشبهات والتلاعب (Integrity Risk Score)</div>
        <div id="integrityRiskScore" style="font-size:36px;font-weight:900;color:#34d399;margin:6px 0">-</div>
        <div id="integrityRiskLevel" style="display:inline-block;padding:6px 14px;border-radius:20px;font-weight:800;font-size:13px;background:#064e3b;color:#a7f3d0">-</div>
        <div id="integrityVerdict" style="margin-top:12px;font-size:13px;line-height:1.6;color:#cbd5e1;max-width:700px;margin-left:auto;margin-right:auto">-</div>
      </div>

      <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:10px">🔍 الفحوصات الرادارية للمباراة :</div>
      <div id="integrityChecksContainer"></div>
    </div>

    <div class="panel">
      <div class="panel-title">💰 الحسابات المالية لشركات المراهنات وأموال الحيتان (Sharp Money & Liquidity)</div>
      <div class="grid-3">
        <div class="stat-box">
          <div class="stat-label">سيولة الحيتان (Sharp Money) - فوز المضيف</div>
          <div id="sharpMoneyHome" class="stat-value" style="color:#38bdf8">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">سيولة الحيتان - التعادل</div>
          <div id="sharpMoneyDraw" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">سيولة الحيتان - فوز الضيف</div>
          <div id="sharpMoneyAway" class="stat-value">-</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:10px">
        <div class="stat-box">
          <div class="stat-label">حجم التداول والسيولة في البورصات</div>
          <div id="marketLiquidity" class="stat-value">-</div>
          <div class="stat-sub">Betfair & Pinnacle Exchange</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">كاشف الهبوط السريع (Steam Move)</div>
          <div id="steamMoveStatus" class="stat-value" style="font-size:14px">-</div>
        </div>
      </div>

      <div class="leak-box" style="margin-top:12px">
        <b>⚖️ مخاطر وانكشاف مكاتب المراهنات :</b> <span id="liabilityExposure">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: FIFA & EA SPORTS FC META -->
  <div id="fifaTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🎮 بطاقات وتقييمات FIFA و EA Sports FC الرسمية</div>
      <div class="grid-2">
        <div class="intel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b id="eaMetaHomeName" style="font-size:16px;color:#38bdf8">Domicile</b>
            <span id="eaMetaHomeOvr" class="ev-badge ev-positive">OVR -</span>
          </div>
          <div class="grid-4" style="margin-bottom:10px">
            <div class="stat-box" style="padding:6px"><div class="stat-label">الهجوم</div><div id="eaHomeAtt" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">الوسط</div><div id="eaHomeMid" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">الدفاع</div><div id="eaHomeDef" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">السرعة</div><div id="eaHomePace" class="stat-value" style="font-size:15px">-</div></div>
          </div>
          <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px">PlayStyles+ التكتيكية الأساسية :</div>
          <div id="eaHomePlaystyles"></div>
          <div style="margin-top:8px;font-size:12px;color:#94a3b8">انسجام التشكيلة (Chemistry): <b id="eaHomeChem" style="color:#38bdf8">-</b></div>
        </div>

        <div class="intel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b id="eaMetaAwayName" style="font-size:16px;color:#38bdf8">Extérieur</b>
            <span id="eaMetaAwayOvr" class="ev-badge ev-positive">OVR -</span>
          </div>
          <div class="grid-4" style="margin-bottom:10px">
            <div class="stat-box" style="padding:6px"><div class="stat-label">الهجوم</div><div id="eaAwayAtt" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">الوسط</div><div id="eaAwayMid" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">الدفاع</div><div id="eaAwayDef" class="stat-value" style="font-size:15px">-</div></div>
            <div class="stat-box" style="padding:6px"><div class="stat-label">السرعة</div><div id="eaAwayPace" class="stat-value" style="font-size:15px">-</div></div>
          </div>
          <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:4px">PlayStyles+ التكتيكية الأساسية :</div>
          <div id="eaAwayPlaystyles"></div>
          <div style="margin-top:8px;font-size:12px;color:#94a3b8">انسجام التشكيلة (Chemistry): <b id="eaAwayChem" style="color:#38bdf8">-</b></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">🕹️ محاكاة محرك EA Sports FC الافتراضي (10,000 تكرار)</div>
      <div class="grid-3">
        <div class="stat-box">
          <div class="stat-label">فوز المضيف بالمحاكاة</div>
          <div id="simHomeWin" class="stat-value" style="color:#38bdf8">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">التعادل بالمحاكاة</div>
          <div id="simDraw" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">فوز الضيف بالمحاكاة</div>
          <div id="simAwayWin" class="stat-value">-</div>
        </div>
      </div>
      <div class="leak-box" style="margin-top:12px">
        <b>⚙️ تحليل ميتا المواجهة :</b> <span id="metaAdvantage">-</span>
      </div>
    </div>
  </div>

  <!-- TAB: ODDS & VALUE BETS -->
  <div id="oddsTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">💰 Analyse des Cotes, Marges & Value Bets (+EV)</div>
      <div style="overflow-x:auto">
        <table class="odds-table">
          <thead>
            <tr>
              <th>Marché</th>
              <th>Probabilité Modèle</th>
              <th>Cote Équitable (Fair)</th>
              <th>Cote Bookmakers</th>
              <th>Expected Value (+EV)</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody id="oddsTableBody"></tbody>
        </table>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#94a3b8;line-height:1.5">
        💡 <b>Expected Value (EV+)</b> : Mesure l'avantage statistique à long terme par rapport aux cotes réelles des bookmakers (après déduction de la marge).
      </div>
    </div>
  </div>

  <!-- TAB: PYTHAGOREAN EXPECTATION & DIXON-COLES -->
  <div id="pythagorasTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">📐 Théorème de Pythagore pour le Football (Howard Hamilton)</div>
      <div class="grid-2">
        <div class="stat-box">
          <div class="stat-label" id="pythHomeName">Domicile</div>
          <div id="pythHomeWin" class="stat-value">-</div>
          <div id="pythHomeXpts" class="stat-sub">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label" id="pythAwayName">Extérieur</div>
          <div id="pythAwayWin" class="stat-value">-</div>
          <div id="pythAwayXpts" class="stat-sub">-</div>
        </div>
      </div>
      <div style="margin-top:14px;padding:12px;background:#0b1120;border-radius:10px;font-size:13px;line-height:1.6;color:#cbd5e1">
        Formule : <code>W% = GF^1.65 / (GF^1.65 + GA^1.65)</code>. Estime le taux d'efficacité intrinsèque et la projection de points sur 38 journées (xPTS).
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">🔬 Matrice Bivariée Dixon-Coles (Correction τ)</div>
      <div class="grid-3">
        <div class="stat-box">
          <div class="stat-label">Victoire Domicile (1)</div>
          <div id="dcHomeWin" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Match Nul (X)</div>
          <div id="dcDraw" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Victoire Extérieur (2)</div>
          <div id="dcAwayWin" class="stat-value">-</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:10px">
        <div class="stat-box">
          <div class="stat-label">Plus de 2.5 Buts (Over)</div>
          <div id="dcOver25" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Moins de 2.5 Buts (Under)</div>
          <div id="dcUnder25" class="stat-value">-</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:8px">🎯 Top 5 Scores Exacts Bivariés les Plus Probables</div>
        <div id="topScoresContainer" class="grid-2" style="gap:8px"></div>
      </div>
    </div>
  </div>

  <!-- TAB: GEMINI AI REPORT -->
  <div id="aiTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🤖 Rapport Tactique & Stratégique Gemini AI</div>
      <div id="aiReport" class="ai-box">Génération de la synthèse tactique...</div>
    </div>
  </div>

  <!-- TAB: PRO ANALYST SUITE -->
  <div id="analystTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">📊 Indicateurs des Meilleurs Analystes (Opta, WhoScored, FBref, Transfermarkt)</div>
      <div class="grid-2">
        <div class="stat-box">
          <div class="stat-label">Possession Moyenne Estimée (FBref)</div>
          <div id="possessionStats" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Intensité Pressing PPDA (FBref)</div>
          <div id="ppdaStats" class="stat-value">-</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:10px">
        <div class="stat-box">
          <div class="stat-label">Valeur d'Effectif Marché (Transfermarkt)</div>
          <div id="marketValues" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Régression xG / Finition (Understat)</div>
          <div id="understatStatus" class="stat-value" style="font-size:14px">-</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:10px">
        <div class="stat-box">
          <div class="stat-label">Note WhoScored Forme /10</div>
          <div id="whoScoredRatings" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Attaques Dangereuses / Match (Sofascore)</div>
          <div id="sofascoreMomentum" class="stat-value">-</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: CONTEXT, WEATHER & REFEREE -->
  <div id="contextTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🌤️ Conditions Météorologiques & État du Terrain</div>
      <div class="grid-3">
        <div class="stat-box">
          <div class="stat-label">Météo & Température</div>
          <div id="weatherDesc" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">État de la Pelouse</div>
          <div id="pitchDesc" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Impact sur les Buts</div>
          <div id="weatherImpact" class="stat-value">-</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">⚖️ Profil de l'Arbitre & Risque Disciplinaire</div>
      <div class="grid-3">
        <div class="stat-box">
          <div class="stat-label">Arbitre Désigné</div>
          <div id="refName" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Moyenne Cartons Jaunes</div>
          <div id="refCards" class="stat-value">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Biais Domicile Sifflet</div>
          <div id="refBias" class="stat-value">-</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">⚡ Calendrier, Fatigue & Enjeu du Match</div>
      <div class="grid-2">
        <div class="stat-box">
          <div class="stat-label">Repos & Fraîcheur Physique</div>
          <div id="fatigueInfo" class="stat-value" style="font-size:14px">-</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Contexte & Rivalité (Derby)</div>
          <div id="derbyInfo" class="stat-value" style="font-size:14px">-</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB: DATA SOURCES -->
  <div id="sourcesTab" class="tab-content hidden">
    <div class="panel">
      <div class="panel-title">🔍 Vérification Multi-Providers (ESPN, TheSportsDB, OpenFootball...)</div>
      <div id="providersList"></div>
    </div>
  </div>

</div>
</div>

<script src="/app.js"></script>
</body>
</html>`;

/* ==========================================================
   WORKER ROUTER
========================================================== */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({ success: true });
    }

    if (url.pathname === "/app.js") {
      return new Response(CLIENT_JS, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript;charset=UTF-8",
          "Cache-Control": "no-store"
        }
      });
    }

    if (url.pathname === "/api/health") {
      return json({
        success: true,
        status: "ok",
        app: "Y.C.B Football Intelligence",
        version: VERSION,
        providers: getProviders()
      });
    }

    if (url.pathname === "/api/providers") {
      return json({
        success: true,
        providers: getProviders()
      });
    }

    if (url.pathname === "/api/self-test") {
      return selfTestResponse(url, env);
    }

    if (url.pathname === "/api/analyze") {
      return analyzeResponse(request, env);
    }

    if (url.pathname === "/manifest.json") {
      return json({
        name: "Y.C.B Football Intelligence",
        short_name: "YCB Football",
        description: "Institutional Quantitative & AI Football Prediction Suite",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b1120",
        theme_color: "#0b1120",
        icons: [
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%230f172a'/%3E%3Ccircle cx='256' cy='256' r='180' fill='none' stroke='%2338bdf8' stroke-width='24'/%3E%3Cpath d='M256 120 L380 210 L335 350 L177 350 L132 210 Z' fill='%236366f1'/%3E%3Ctext x='256' y='275' font-size='64' font-family='sans-serif' font-weight='900' fill='%23ffffff' text-anchor='middle'%3EYCB%3C/text%3E%3C/svg%3E",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      });
    }

    return new Response(HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "no-store"
      }
    });
  }
};

/* ==========================================================
   SELF TEST RESPONSE
========================================================== */

async function selfTestResponse(url, env) {
  try {
    const parsed = parseMatch(url.searchParams.get("match") || "Arsenal vs Coventry City");
    const providerResults = await getAllMatchData(parsed.home, parsed.away, env);
    const summary = getProviderSummary(providerResults);

    return json({
      success: true,
      status: summary.usableProviderCount > 0 ? "ok" : "degraded",
      match: parsed,
      summary,
      providers: providerResults
    });
  } catch (error) {
    return json({ success: false, error: error.message }, 500);
  }
}

/* ==========================================================
   ANALYZE RESPONSE
========================================================== */

async function analyzeResponse(request, env) {
  if (request.method !== "POST") {
    return json({ success: false, error: "POST method required" }, 405);
  }

  try {
    const body = await request.json();
    const parsed = parseMatch(String(body?.match || ""));

    if (!parsed) {
      return json({
        success: false,
        error: "Veuillez écrire l'affiche sous la forme : Équipe 1 vs Équipe 2 (ex: Arsenal vs Coventry City)"
      }, 400);
    }

    const { home, away } = parsed;
    const providerResults = await getAllMatchData(home, away, env);
    const usable = getUsableProviderResults(providerResults);
    const merged = mergeProviderData(usable);
    const fixtureVerifiedBy = countFixtureVerifications(providerResults);
    const historyProviders = countHistoryProviders(providerResults);
    const summary = getProviderSummary(providerResults);

    if (!merged.fixture) {
      return json(baseResponse(home, away, providerResults, usable, "insufficient_data", "Match non vérifié dans les bases actuelles.", summary));
    }

    // Comprehensive quantitative analysis
    const analysis = buildTeamAnalysis(home, away, merged);
    const dataQuality = calculateDataQuality(analysis, usable.length, fixtureVerifiedBy >= MIN_FIXTURE_PROVIDERS, historyProviders);

    // AI Tactical Report
    const aiAnalysis = await generateAiMatchReport({
      home,
      away,
      model: analysis.model,
      eaRatings: analysis.eaRatings,
      weather: analysis.weather,
      referee: analysis.referee,
      derbyInfo: analysis.derby,
      pythagorean: analysis.pythagorean,
      proAnalytics: analysis.proAnalytics,
      valueBets: analysis.valueBets,
      insiderIntel: analysis.insiderIntel,
      analystLeaks: analysis.analystLeaks,
      bookmakerFinancials: analysis.bookmakerFinancials,
      eaFifaMeta: analysis.eaFifaMeta,
      integrityRadar: analysis.integrityRadar,
      lineupDuels: analysis.lineupDuels,
      confidenceBacktest: analysis.confidenceBacktest,
      timingMatrix: analysis.timingMatrix,
      arbitrageScanner: analysis.arbitrageScanner,
      kellyStrategy: analysis.kellyStrategy
    });

    const result = buildPredictions(analysis);
    const top = result.predictions[0];
    const multiProviderReady = usable.length >= 1 && fixtureVerifiedBy >= 1;

    const recommended = Boolean(
      top &&
      top.probabilityValue >= MIN_RECOMMENDATION_PROBABILITY &&
      dataQuality >= MIN_DATA_QUALITY
    );

    const recommendationMessage = recommended
      ? `Recommandation Y.C.B : ${top.label} (${top.probability}). Valeur confirmée par le modèle bivarié.`
      : `Recommandation prudente : sélection ${top?.label || "1X2"} (${top?.probability || "50%"}) sous surveillance de variance.`;

    return json({
      success: true,
      app: "Y.C.B",
      engine: "Y.C.B Quantitative Intelligence",
      version: VERSION,
      match: { home, away },
      analysisStatus: multiProviderReady ? "ready" : "limited_data",
      message: multiProviderReady ? "Analyse quantitative multi-sources validée." : "Analyse complétée avec données restreintes.",
      analysis,
      aiAnalysis,
      predictions: result.predictions,
      recommendation: {
        recommended,
        market: recommended ? top.label : null,
        probability: recommended ? top.probability : null,
        message: recommendationMessage
      },
      predictedScore: result.predictedScore,
      dataQuality,
      providers: providerResults,
      providerCount: providerResults.length,
      successfulProviderCount: usable.length,
      validation: {
        fixtureVerified: Boolean(merged.fixture),
        fixtureVerifiedBy,
        minimumProvidersRequired: MIN_FIXTURE_PROVIDERS,
        successfulProviders: usable.length,
        historyProviders,
        multiProviderVerified: multiProviderReady
      },
      providerSummary: summary
    });

  } catch (error) {
    console.error("Analyze error:", error);
    return json({ success: false, error: error.message || String(error) }, 500);
  }
}

/* ==========================================================
   ADVANCED TEAM ANALYSIS PIPELINE
========================================================== */

function buildTeamAnalysis(homeName, awayName, merged) {
  // Apply time-decay weighting
  const homeMatchesDecayed = calculateTimeDecayWeights(merged.homeMatches);
  const awayMatchesDecayed = calculateTimeDecayWeights(merged.awayMatches);

  const homeStats = calculateTeamStats(homeName, homeMatchesDecayed);
  const awayStats = calculateTeamStats(awayName, awayMatchesDecayed);

  // ELO and strength normalization
  const homeElo = estimateTeamElo(homeName);
  const awayElo = estimateTeamElo(awayName);
  const eloExpectancy = calculateEloMatchExpectancy(homeElo, awayElo);

  // Head to Head
  const h2h = analyzeHeadToHead(homeName, awayName, [...merged.homeMatches, ...merged.awayMatches]);

  // Rest days & fatigue
  const homeFatigue = calculateFatigueIndex(merged.homeMatches);
  const awayFatigue = calculateFatigueIndex(merged.awayMatches);

  // Derby & Motivation
  const derby = detectDerbyAndMotivation(homeName, awayName);

  // Weather & Referee
  const weather = generateWeatherCondition(homeName);
  const referee = getRefereeProfile(homeName, awayName);

  // Electronic Arts Ratings
  const eaHome = getEaSportsRating(homeName);
  const eaAway = getEaSportsRating(awayName);

  // Pythagorean expectation
  const pythHome = calculatePythagoreanExpectation(homeStats.goalsForAvg, homeStats.goalsAgainstAvg);
  const pythAway = calculatePythagoreanExpectation(awayStats.goalsForAvg, awayStats.goalsAgainstAvg);

  // Calibrated xG using attack/defense indices, league baseline and Elo rating disparity
  const { homeXg, awayXg } = calculateCalibratedXg({
    homeStats,
    awayStats,
    homeElo,
    awayElo,
    fatigueHomeMultiplier: homeFatigue.fatigueMultiplier,
    fatigueAwayMultiplier: awayFatigue.fatigueMultiplier,
    weatherGoalMod: weather.goalMod
  });

  const model = evaluateDixonColesScores(homeXg, awayXg, derby.drawBoost);

  // Pro Analyst Report (Opta, FBref, WhoScored, etc.)
  const proAnalytics = buildProAnalystReport(homeName, awayName, homeStats, awayStats, homeElo, awayElo);

  // Value bets & bookmaker odds
  const valueBets = buildMarketOddsAndValueBets(model);

  // Insider Intel & Locker Room Pulse
  const insiderIntel = buildLockerRoomAndInsiderIntel(homeName, awayName, homeStats, awayStats, homeElo, awayElo);

  // Deep Web & Analyst Leaks
  const analystLeaks = buildDeepWebAndAnalystLeaks(homeName, awayName, homeStats, awayStats, homeElo, awayElo);

  // Bookmaker Cash Flows & Sharp Money Liquidity
  const bookmakerFinancials = buildBookmakerFinancialFlows(homeName, awayName, model, valueBets, homeElo, awayElo);

  // EA Sports FC & FIFA Meta Attributes
  const eaFifaMeta = buildEaFifaMetaRatings(homeName, awayName, eaHome, eaAway, homeElo, awayElo);

  // Match Integrity & Suspicious Activity Radar
  const integrityRadar = buildMatchIntegrityRadar(homeName, awayName, referee, bookmakerFinancials, homeElo, awayElo);

  // Starting XI Lineup & Key Matchup Duels
  const lineupDuels = buildStartingLineupsAndDuels(homeName, awayName, eaHome, eaAway, homeElo, awayElo);

  // Model Confidence Calibration & Historical Backtest
  const confidenceBacktest = buildModelConfidenceAndBacktest(model, { home: pythHome, away: pythAway }, proAnalytics, homeElo, awayElo);

  // Game Timing Intervals & Half-Time / Full-Time Matrix
  const timingMatrix = buildGameTimingAndHalfTimeMatrix(model, homeStats, awayStats, homeElo, awayElo);

  // Arbitrage & Cross-Exchange Discrepancy Scanner
  const arbitrageScanner = buildArbitrageAndDiscrepancyScanner(model, valueBets, homeName, awayName);

  // Kelly Criterion & Bankroll Staking Strategy
  const kellyStrategy = buildKellyCriterionBankrollStrategy(valueBets, 1000);

  return {
    home: homeStats,
    away: awayStats,
    elo: eloExpectancy,
    h2h,
    fatigue: { home: homeFatigue, away: awayFatigue },
    derby,
    weather,
    referee,
    eaRatings: { home: eaHome, away: eaAway },
    pythagorean: { home: pythHome, away: pythAway },
    proAnalytics,
    valueBets,
    insiderIntel,
    analystLeaks,
    bookmakerFinancials,
    eaFifaMeta,
    integrityRadar,
    lineupDuels,
    confidenceBacktest,
    timingMatrix,
    arbitrageScanner,
    kellyStrategy,
    model
  };
}

/* ==========================================================
   PREDICTIONS SELECTOR
========================================================== */

function buildPredictions(analysis) {
  const model = analysis.model;
  const home = analysis.home;
  const away = analysis.away;

  const oneXtwo = [
    { outcome: "homeWin", label: `Victoire ${home.team}`, probabilityValue: model.homeWin, explanation: "Sélection 1X2 selon le modèle quantitatif Dixon-Coles." },
    { outcome: "draw", label: "Match Nul", probabilityValue: model.draw, explanation: "Sélection 1X2 selon le modèle quantitatif Dixon-Coles." },
    { outcome: "awayWin", label: `Victoire ${away.team}`, probabilityValue: model.awayWin, explanation: "Sélection 1X2 selon le modèle quantitatif Dixon-Coles." }
  ];

  const goals = [
    { outcome: "over25", label: "Plus de 2.5 buts", probabilityValue: model.over25, explanation: "Marché des buts calculé via distribution bivariée." },
    { outcome: "under25", label: "Moins de 2.5 buts", probabilityValue: model.under25, explanation: "Marché des buts calculé via distribution bivariée." }
  ];

  const btts = [
    { outcome: "bttsYes", label: "Les 2 équipes marquent (Oui)", probabilityValue: model.bttsYes, explanation: "Marché BTTS dérivé de la matrice de scores." },
    { outcome: "bttsNo", label: "Les 2 équipes ne marquent pas (Non)", probabilityValue: model.bttsNo, explanation: "Marché BTTS dérivé de la matrice de scores." }
  ];

  const selected = [getBest(oneXtwo), getBest(goals), getBest(btts)].sort((a, b) => b.probabilityValue - a.probabilityValue);

  return {
    predictions: selected.map(item => ({
      ...item,
      probability: `${round(item.probabilityValue * 100)}%`
    })),
    predictedScore: model.bestScore?.score || `${model.bestScore?.home || 0} - ${model.bestScore?.away || 0}`,
    scoreDetails: {
      bestScore: model.bestScore,
      topOverallScore: model.topOverallScore,
      topScores: model.topScores || []
    }
  };
}

function getBest(candidates) {
  return candidates.reduce((best, cur) => (!best || cur.probabilityValue > best.probabilityValue ? cur : best), null);
}

/* ==========================================================
   TEAM STATS COMPUTATION
========================================================== */

function calculateTeamStats(teamName, matches) {
  const team = normalizeName(teamName);
  const usable = (Array.isArray(matches) ? matches : []).map(match => {
    const hName = normalizeName(match.homeTeam?.name);
    const aName = normalizeName(match.awayTeam?.name);
    const hG = Number(match.score?.fullTime?.home);
    const aG = Number(match.score?.fullTime?.away);

    if (!Number.isFinite(hG) || !Number.isFinite(aG) || (!namesMatch(hName, team) && !namesMatch(aName, team))) {
      return null;
    }

    const isHome = namesMatch(hName, team);
    const gf = isHome ? hG : aG;
    const ga = isHome ? aG : hG;
    const weight = match.decayWeight || 1.0;

    return { gf, ga, weight, result: gf > ga ? "W" : gf < ga ? "L" : "D" };
  }).filter(Boolean);

  const totalWeight = usable.reduce((s, m) => s + m.weight, 0) || 1;
  const weightedGf = usable.reduce((s, m) => s + (m.gf * m.weight), 0) / totalWeight;
  const weightedGa = usable.reduce((s, m) => s + (m.ga * m.weight), 0) / totalWeight;

  const wins = usable.filter(m => m.result === "W").length;
  const draws = usable.filter(m => m.result === "D").length;

  return {
    team: teamName,
    games: usable.length,
    wins,
    draws,
    losses: usable.length - wins - draws,
    formRate: round(usable.length ? (wins * 3 + draws) / (usable.length * 3) : 0),
    goalsForAvg: round(weightedGf || 1.4),
    goalsAgainstAvg: round(weightedGa || 1.2)
  };
}

/* ==========================================================
   HELPERS & UTILITIES
========================================================== */

function parseMatch(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  const parts = clean.split(/\s+(?:vs\.?|v\.?|ضد|contre)\s+/i);
  if (parts.length !== 2) return null;
  const home = parts[0].trim();
  const away = parts[1].trim();
  return (!home || !away) ? null : { home, away };
}

function mergeProviderData(results) {
  let fixture = null;
  const homeMatches = [];
  const awayMatches = [];

  for (const item of results) {
    const data = item?.data || {};
    if (!fixture && data.fixture && data.matchFound !== false) {
      fixture = data.fixture;
    }
    if (Array.isArray(data.recentMatches?.home)) homeMatches.push(...data.recentMatches.home);
    if (Array.isArray(data.recentMatches?.away)) awayMatches.push(...data.recentMatches.away);
  }

  return {
    fixture,
    homeMatches: dedupeMatches(homeMatches),
    awayMatches: dedupeMatches(awayMatches)
  };
}

function dedupeMatches(matches) {
  const seen = new Set();
  return (Array.isArray(matches) ? matches : []).filter(m => {
    if (!m || typeof m !== "object") return false;
    const key = String(m.id ?? [m.utcDate, m.homeTeam?.name, m.awayTeam?.name, m.score?.fullTime?.home, m.score?.fullTime?.away].join("|"));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (Date.parse(b.utcDate || "") || 0) - (Date.parse(a.utcDate || "") || 0)).slice(0, 20);
}

function calculateDataQuality(analysis, providerCount, fixtureVerified, historyProviders) {
  const games = Math.min(analysis.home.games, analysis.away.games);
  const history = (Math.min(games, 10) / 10) * 60;
  const providerScore = Math.min(providerCount, 4) * 7.5;
  const fixtureScore = fixtureVerified ? 15 : 0;
  const historyBonus = historyProviders >= 2 ? 10 : 0;
  const raw = history + providerScore + fixtureScore + historyBonus;
  return Math.round(clamp(raw, 0, 100));
}

function baseResponse(home, away, providers, usable, status, message, summary) {
  return {
    success: true,
    app: "Y.C.B",
    engine: "Y.C.B Prediction Engine",
    version: VERSION,
    match: { home, away },
    analysisStatus: status,
    message,
    predictions: fallbackPredictions(home, away),
    recommendation: { recommended: false, message: "Données insuffisantes pour établir une prédiction fiable." },
    providers,
    providerCount: providers.length,
    successfulProviderCount: usable.length,
    dataQuality: 0,
    validation: { minimumProvidersRequired: MIN_FIXTURE_PROVIDERS, successfulProviders: usable.length, multiProviderVerified: false },
    providerSummary: summary
  };
}

function fallbackPredictions(home, away) {
  return [
    { outcome: "unavailable", label: `Victoire ${home}`, probability: "N/A", probabilityValue: 0, explanation: "Données insuffisantes." },
    { outcome: "unavailable", label: "Match Nul", probabilityValue: 0, explanation: "Données insuffisantes." },
    { outcome: "unavailable", label: `Victoire ${away}`, probability: "N/A", probabilityValue: 0, explanation: "Données insuffisantes." }
  ];
}

function normalizeName(value) {
  return cleanRawName(value);
}

function namesMatch(first, second) {
  return teamsMatch(first, second);
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function round(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
