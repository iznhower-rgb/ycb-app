// ==========================================================
// Y.C.B MULTILINGUAL TEAM ALIAS & NORMALIZATION ENGINE
// ==========================================================
// Supports French, English, Spanish, German, Italian & Arabic translations,
// abbreviations, city names, and common nicknames.
// ==========================================================

const MULTILINGUAL_ALIASES = {
  // Spanish clubs & French/Arabic/English translations
  "la corogne": "deportivo la coruna",
  "la coruna": "deportivo la coruna",
  "coruna": "deportivo la coruna",
  "corogne": "deportivo la coruna",
  "deportivo": "deportivo la coruna",
  "depor": "deportivo la coruna",
  "rc deportivo": "deportivo la coruna",
  "rc deportivo la coruna": "deportivo la coruna",
  "deportivo de la coruna": "deportivo la coruna",
  "ديبورتيفو لاكورونيا": "deportivo la coruna",
  "لاكورونيا": "deportivo la coruna",
  
  "athletic bilbao": "athletic club",
  "bilbao": "athletic club",
  "اتلتيك بلباو": "athletic club",
  
  "atletico madrid": "atletico madrid",
  "atletico": "atletico madrid",
  "atleti": "atletico madrid",
  "اتلتيكو مدريد": "atletico madrid",
  
  "real madrid": "real madrid",
  "ريال مدريد": "real madrid",
  
  "barcelona": "barcelona",
  "fc barcelona": "barcelona",
  "barcelone": "barcelona",
  "barca": "barcelona",
  "برشلونة": "barcelona",
  
  "seville": "sevilla",
  "اشبيلية": "sevilla",
  
  "real betis": "real betis",
  "betis": "real betis",
  "ريال بيتيس": "real betis",
  
  "real sociedad": "real sociedad",
  "sociedad": "real sociedad",
  "ريال سوسيداد": "real sociedad",
  
  "espanyol barcelone": "espanyol",
  "espanyol barcelona": "espanyol",
  "اسبانيول": "espanyol",
  
  "elche cf": "elche",
  "التشي": "elche",
  
  "celta vigo": "celta vigo",
  "celta": "celta vigo",
  "سيلتا فيغو": "celta vigo",
  
  "rayo vallecano": "rayo vallecano",
  "rayo": "rayo vallecano",
  
  "majorque": "mallorca",
  "rcd mallorca": "mallorca",
  "مايوركا": "mallorca",
  
  "alaves": "deportivo alaves",
  "ديبورتيفو الافيس": "deportivo alaves",
  
  "valencia cf": "valencia",
  "valencia": "valencia",
  "فالنسيا": "valencia",
  
  "villarreal cf": "villarreal",
  "villareal": "villarreal",
  "فياريال": "villarreal",
  
  // English clubs & French/Arabic translations
  "arsenal fc": "arsenal",
  "ارسنال": "arsenal",
  
  "man city": "manchester city",
  "manchester city fc": "manchester city",
  "مانشستر سيتي": "manchester city",
  
  "man utd": "manchester united",
  "man united": "manchester united",
  "manchester united fc": "manchester united",
  "مانشستر يونايتد": "manchester united",
  
  "chelsea fc": "chelsea",
  "تشيلسي": "chelsea",
  
  "liverpool fc": "liverpool",
  "ليفربول": "liverpool",
  
  "tottenham hotspur": "tottenham hotspur",
  "tottenham": "tottenham hotspur",
  "spurs": "tottenham hotspur",
  "توتنهام": "tottenham hotspur",
  
  "newcastle united": "newcastle united",
  "newcastle": "newcastle united",
  "نيوكاسل": "newcastle united",
  
  "aston villa fc": "aston villa",
  "villa": "aston villa",
  "استون فيلا": "aston villa",
  
  "west ham united": "west ham united",
  "west ham": "west ham united",
  "وست هام": "west ham united",
  
  "brighton and hove albion": "brighton",
  "brighton": "brighton",
  "برايتون": "brighton",
  
  "wolverhampton wanderers": "wolverhampton",
  "wolves": "wolverhampton",
  "وولفرهامبتون": "wolverhampton",
  
  "nottingham forest": "nottingham forest",
  "nottingham": "nottingham forest",
  "نوتنغهام فورست": "nottingham forest",
  
  "leicester city": "leicester",
  "leicester": "leicester",
  "ليستر سيتي": "leicester",
  
  "southampton fc": "southampton",
  "ساوثهامبتون": "southampton",
  
  "everton fc": "everton",
  "ايفرتون": "everton",
  
  "coventry city": "coventry",
  "coventry": "coventry",
  "كوفنتري سيتي": "coventry",
  
  // French clubs
  "paris saint germain": "paris saint germain",
  "paris sg": "paris saint germain",
  "psg": "paris saint germain",
  "باريس سان جيرمان": "paris saint germain",
  
  "olympique marseille": "marseille",
  "olympique de marseille": "marseille",
  "om": "marseille",
  "مارسيليا": "marseille",
  
  "olympique lyonnais": "lyon",
  "olympique lyon": "lyon",
  "ol": "lyon",
  "ليون": "lyon",
  
  "as monaco": "monaco",
  "موناكو": "monaco",
  
  "lille osc": "lille",
  "losc": "lille",
  "ليل": "lille",
  
  "stade rennais": "rennes",
  "rennes": "rennes",
  "رين": "rennes",
  
  "rc lens": "lens",
  "لانس": "lens",
  
  "as saint etienne": "saint etienne",
  "saint etienne": "saint etienne",
  "st etienne": "saint etienne",
  "سانت ايتيان": "saint etienne",
  
  "ogc nice": "nice",
  "نيس": "nice",
  
  // German clubs
  "bayern munich": "bayern munchen",
  "bayern munchen": "bayern munchen",
  "bayern": "bayern munchen",
  "munich": "bayern munchen",
  "بايرن ميونخ": "bayern munchen",
  
  "borussia dortmund": "borussia dortmund",
  "dortmund": "borussia dortmund",
  "bvb": "borussia dortmund",
  "بوروسيا دورتموند": "borussia dortmund",
  
  "bayer leverkusen": "bayer leverkusen",
  "leverkusen": "bayer leverkusen",
  "باير ليفركوزن": "bayer leverkusen",
  
  "rb leipzig": "rb leipzig",
  "leipzig": "rb leipzig",
  "لايبزيغ": "rb leipzig",
  
  "eintracht frankfurt": "eintracht frankfurt",
  "frankfurt": "eintracht frankfurt",
  "فرانكفورت": "eintracht frankfurt",
  
  "borussia monchengladbach": "monchengladbach",
  "m gladbach": "monchengladbach",
  "gladbach": "monchengladbach",
  "مونشنغلادباخ": "monchengladbach",
  
  "vfb stuttgart": "stuttgart",
  "شتوتغارت": "stuttgart",
  
  // Italian clubs
  "juventus turin": "juventus",
  "juve": "juventus",
  "يوفنتوس": "juventus",
  
  "inter milan": "internazionale",
  "inter": "internazionale",
  "انتر ميلان": "internazionale",
  
  "ac milan": "ac milan",
  "milan ac": "ac milan",
  "milan": "ac milan",
  "اي سي ميلان": "ac milan",
  
  "as rome": "as roma",
  "as roma": "as roma",
  "rome": "as roma",
  "roma": "as roma",
  "روما": "as roma",
  
  "ss lazio": "lazio",
  "lazio rome": "lazio",
  "لاتسيو": "lazio",
  
  "ssc napoli": "napoli",
  "naples": "napoli",
  "نابولي": "napoli",
  
  "atalanta bergamo": "atalanta",
  "atalanta": "atalanta",
  "اتالانتا": "atalanta",
  
  "acf fiorentina": "fiorentina",
  "florence": "fiorentina",
  "فيورنتينا": "fiorentina",
  
  // Portuguese & other European
  "sporting lisbonne": "sporting cp",
  "sporting portugal": "sporting cp",
  "sporting cp": "sporting cp",
  "sporting lisbon": "sporting cp",
  "سبورتينغ لشبونة": "sporting cp",
  
  "sl benfica": "benfica",
  "benfica lisbonne": "benfica",
  "بنفيكا": "benfica",
  
  "fc porto": "porto",
  "بورتو": "porto",
  
  "ajax amsterdam": "ajax",
  "اياكس": "ajax",
  
  "psv eindhoven": "psv",
  "psv": "psv",
  "بي اس في": "psv",
  
  "feyenoord rotterdam": "feyenoord",
  "فينورد": "feyenoord",
  
  "copenhague": "kobenhavn",
  "copenhagen": "kobenhavn",
  "كوبنهاغن": "kobenhavn",
  
  "salzbourg": "salzburg",
  "rb salzburg": "salzburg",
  "سالزبورغ": "salzburg",
  
  "bale": "basel",
  "fc basel": "basel",
  "بازل": "basel",
  
  "bruges": "club brugge",
  "club brugge": "club brugge",
  "كلوب بروج": "club brugge",
  
  "etoile rouge": "red star belgrade",
  "crvena zvezda": "red star belgrade",
  "النجم الاحمر": "red star belgrade",

  // Arab & Regional Giants
  "الهلال": "al hilal",
  "al hilal": "al hilal",
  "al hilal sfc": "al hilal",

  "النصر": "al nassr",
  "al nassr": "al nassr",
  "al nassr fc": "al nassr",

  "الاتحاد": "al ittihad",
  "al ittihad": "al ittihad",
  "al ittihad club": "al ittihad",

  "الاهلي": "al ahly",
  "الاهلي المصري": "al ahly",
  "al ahly": "al ahly",
  "al ahli": "al ahly",

  "الزمالك": "zamalek",
  "zamalek": "zamalek",

  "الترجي": "esperance",
  "esperance tunis": "esperance",

  "الوداد": "wydad",
  "wydad ac": "wydad",

  "الرجاء": "raja",
  "raja casablanca": "raja",

  // South American & Intercontinental
  "بوكا جونيورز": "boca juniors",
  "boca juniors": "boca juniors",

  "ريفر بليت": "river plate",
  "river plate": "river plate",

  "فلامنغو": "flamengo",
  "flamengo": "flamengo"
};

export function cleanRawName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F]/g, "") // Arabic tashkeel / accents
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/&/g, " and ")
    .replace(/\b(fc|cf|afc|sc|ac|fk|ks|club|the|as|cd|ud|rcd|ogc|rb|bvb|vfb|vfl|tsv|rsc|1\.)\b/gi, " ")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_ALIASES = {};
for (const [k, v] of Object.entries(MULTILINGUAL_ALIASES)) {
  NORMALIZED_ALIASES[cleanRawName(k)] = v;
}

export function resolveTeamAlias(name) {
  const clean = cleanRawName(name);
  if (!clean) return "";
  if (NORMALIZED_ALIASES[clean]) {
    return NORMALIZED_ALIASES[clean];
  }
  
  // Try sub-phrase matching where the query string contains a full alias key
  for (const [key, target] of Object.entries(NORMALIZED_ALIASES)) {
    if (key.length >= 4 && (clean.includes(key) || (key.length <= clean.length + 3 && clean.startsWith(key)))) {
      return target;
    }
  }
  
  return clean;
}

export function teamsMatch(a, b) {
  const normA = cleanRawName(a);
  const normB = cleanRawName(b);
  
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  
  const aliasA = resolveTeamAlias(a);
  const aliasB = resolveTeamAlias(b);
  
  if (aliasA && aliasB && aliasA === aliasB) return true;
  if (aliasA && normB && (aliasA === normB || aliasA.includes(normB) || normB.includes(aliasA))) return true;
  if (aliasB && normA && (aliasB === normA || aliasB.includes(normA) || normA.includes(aliasB))) return true;
  
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  const tokensA = new Set(normA.split(" ").filter(t => t.length >= 3));
  const tokensB = normB.split(" ").filter(t => t.length >= 3);
  
  if (!tokensB.length) return false;
  
  const common = tokensB.filter(t => tokensA.has(t)).length;
  return tokensB.length === 1 ? common >= 1 : common >= Math.min(2, tokensB.length);
}
