// ==========================================================
// Y.C.B OPENFOOTBALL PROVIDER 1.0.0
// ==========================================================
// Open Football Datasets (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
//
// المزايا:
// 1. مجاني 100% وبدون أي API Key أو قيود (No Rate Limits).
// 2. يغطي كبرى الدوريات الأوروبية لمواسم كاملة بتواريخ ونتائج دقيقة.
// 3. تخزين ذكي في الذاكرة (In-Memory Cache) للاستجابة الفورية (1-2ms).
// 4. استخراج المباراة القادمة وآخر 15 مباراة لكل فريق.
// ==========================================================

import { registerProvider } from "./providers.js";
import { teamsMatch, resolveTeamAlias, cleanRawName } from "./teamAliases.js";

const PROVIDER_VERSION = "1.1.0";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_HISTORY = 15;

const LEAGUE_SOURCES = [
  // 2024-25 Top Leagues & 2nd Divisions
  { id: "en.1-24", league: "English Premier League", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/en.1.json" },
  { id: "en.2-24", league: "English Championship", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/en.2.json" },
  { id: "en.3-24", league: "English League One", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/en.3.json" },
  { id: "es.1-24", league: "Spain La Liga", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/es.1.json" },
  { id: "es.2-24", league: "Spain Segunda División", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/es.2.json" },
  { id: "de.1-24", league: "German Bundesliga", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/de.1.json" },
  { id: "de.2-24", league: "German 2. Bundesliga", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/de.2.json" },
  { id: "it.1-24", league: "Italian Serie A", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/it.1.json" },
  { id: "it.2-24", league: "Italian Serie B", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/it.2.json" },
  { id: "fr.1-24", league: "French Ligue 1", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/fr.1.json" },
  { id: "fr.2-24", league: "French Ligue 2", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/fr.2.json" },
  { id: "nl.1-24", league: "Dutch Eredivisie", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/nl.1.json" },
  { id: "pt.1-24", league: "Portuguese Primeira Liga", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/pt.1.json" },
  { id: "be.1-24", league: "Belgian Pro League", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/be.1.json" },
  { id: "sco.1-24", league: "Scottish Premiership", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/sco.1.json" },
  { id: "tr.1-24", league: "Turkish Süper Lig", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/tr.1.json" },
  { id: "at.1-24", league: "Austrian Bundesliga", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/at.1.json" },
  { id: "mx.1-24", league: "Mexican Liga MX", season: "2024-25", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2024-25/mx.1.json" },
  // 2023-24 Season
  { id: "en.1-23", league: "English Premier League", season: "2023-24", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json" },
  { id: "es.1-23", league: "Spain La Liga", season: "2023-24", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/es.1.json" },
  { id: "de.1-23", league: "German Bundesliga", season: "2023-24", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/de.1.json" },
  { id: "it.1-23", league: "Italian Serie A", season: "2023-24", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/it.1.json" },
  { id: "fr.1-23", league: "French Ligue 1", season: "2023-24", url: "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/fr.1.json" }
];

// In-Memory Database Cache
const LEAGUE_CACHE = new Map();

function normalizeName(value) {
  return cleanRawName(value);
}

function namesMatch(a, b) {
  return teamsMatch(a, b);
}

async function fetchLeagueData(leagueSource) {
  if (LEAGUE_CACHE.has(leagueSource.id)) {
    return LEAGUE_CACHE.get(leagueSource.id);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(leagueSource.url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "YCB-Football-Engine/1.0"
      },
      signal: controller.signal
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const matches = Array.isArray(json?.matches) ? json.matches : [];
    const payload = {
      league: json?.name || leagueSource.league,
      season: leagueSource.season,
      matches
    };

    LEAGUE_CACHE.set(leagueSource.id, payload);
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeMatch(match, leagueName) {
  const dateStr = match.date || "";
  const timeStr = match.time ? `T${match.time}:00Z` : "T00:00:00Z";
  const isoDate = `${dateStr}${timeStr}`;

  const hasScore = match.score?.ft && Array.isArray(match.score.ft);
  const homeScore = hasScore ? Number(match.score.ft[0]) : null;
  const awayScore = hasScore ? Number(match.score.ft[1]) : null;
  const isFinished = hasScore && homeScore !== null && awayScore !== null && !isNaN(homeScore);

  return {
    id: `of-${normalizeName(match.team1)}-${normalizeName(match.team2)}-${dateStr}`,
    utcDate: isoDate,
    date: isoDate,
    status: isFinished ? "FINISHED" : "SCHEDULED",
    homeTeam: {
      id: normalizeName(match.team1),
      name: match.team1
    },
    awayTeam: {
      id: normalizeName(match.team2),
      name: match.team2
    },
    score: {
      fullTime: {
        home: homeScore,
        away: awayScore
      },
      halfTime: match.score?.ht ? {
        home: Number(match.score.ht[0]),
        away: Number(match.score.ht[1])
      } : null
    },
    competition: {
      name: leagueName || "League Match"
    },
    round: match.round || null
  };
}

async function getAllMatches() {
  const results = await Promise.all(LEAGUE_SOURCES.map(s => fetchLeagueData(s)));
  const all = [];

  for (const item of results) {
    if (!item || !item.matches) continue;
    for (const m of item.matches) {
      all.push(normalizeMatch(m, item.league));
    }
  }

  return all;
}

const provider = {
  name: "OpenFootball",
  version: PROVIDER_VERSION,
  description: "OpenFootball high-reliability European league dataset",
  enabled: true,

  async getMatchData(home, away, env = {}) {
    const startedAt = Date.now();

    if (!home || !away) {
      return {
        status: "invalid_input",
        message: "OpenFootball: أسماء الفرق غير مكتملة.",
        data: null
      };
    }

    try {
      const allMatches = await getAllMatches();

      if (!allMatches.length) {
        return {
          status: "network_error",
          message: "OpenFootball: لم يتم تحميل قاعدة البيانات.",
          data: null
        };
      }

      // Filter matches involving home team
      const homeMatches = allMatches.filter(m =>
        namesMatch(m.homeTeam.name, home) || namesMatch(m.awayTeam.name, home)
      );

      // Filter matches involving away team
      const awayMatches = allMatches.filter(m =>
        namesMatch(m.homeTeam.name, away) || namesMatch(m.awayTeam.name, away)
      );

      // Find direct fixture between the two teams
      let fixture = allMatches.find(m =>
        namesMatch(m.homeTeam.name, home) && namesMatch(m.awayTeam.name, away)
      );

      // If scheduled fixture exists
      const homeRecent = homeMatches
        .filter(m => m.status === "FINISHED")
        .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
        .slice(0, MAX_HISTORY);

      const awayRecent = awayMatches
        .filter(m => m.status === "FINISHED")
        .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
        .slice(0, MAX_HISTORY);

      const matchFound = Boolean(fixture);
      const historyAvailable = homeRecent.length > 0 || awayRecent.length > 0;

      if (!matchFound && !historyAvailable) {
        return {
          status: "ready",
          message: "OpenFootball: متصل وجاهز (قاعدة بيانات البطولات الأوروبية الكبرى).",
          data: {
            source: "openfootball",
            available: true,
            matchFound: false,
            fixture: null,
            recentMatches: { home: [], away: [] },
            historyAvailable: false,
            diagnostics: {
              durationMs: Date.now() - startedAt
            }
          }
        };
      }

      return {
        status: "success",
        message: fixture
          ? "تم التحقق من المباراة وجمع التاريخ من OpenFootball."
          : "تم جمع التاريخ المكتمل للفرق من OpenFootball.",
        data: {
          source: "openfootball",
          available: true,
          matchFound,
          fixture: fixture || null,
          teams: {
            home: { name: home },
            away: { name: away }
          },
          recentMatches: {
            home: homeRecent,
            away: awayRecent
          },
          historyAvailable,
          diagnostics: {
            homeMatchesFound: homeMatches.length,
            awayMatchesFound: awayMatches.length,
            homeHistory: homeRecent.length,
            awayHistory: awayRecent.length,
            durationMs: Date.now() - startedAt
          }
        }
      };
    } catch (error) {
      return {
        status: "error",
        message: `OpenFootball: ${error?.message || String(error)}`,
        data: null
      };
    }
  }
};

registerProvider(provider);
export default provider;
