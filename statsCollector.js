/* ==========================================================
   Y.C.B STATS COLLECTOR 3.2.0
========================================================== */

export function mergeProviderData(
  results
) {
  const usable =
    Array.isArray(results)
      ? results
      : [];

  const fixtures = [];
  const homeMatches = [];
  const awayMatches = [];
  const sourceProviders = [];

  for (const item of usable) {
    const data =
      item?.data;

    if (
      !data ||
      item.success === false
    ) {
      continue;
    }

    if (
      data.matchFound &&
      data.fixture
    ) {
      fixtures.push({
        fixture:
          data.fixture,

        provider:
          item.provider ||
          "unknown"
      });
    }

    if (item.provider) {
      sourceProviders.push(
        item.provider
      );
    }

    if (
      Array.isArray(
        data.recentMatches?.home
      )
    ) {
      homeMatches.push(
        ...data.recentMatches.home
      );
    }

    if (
      Array.isArray(
        data.recentMatches?.away
      )
    ) {
      awayMatches.push(
        ...data.recentMatches.away
      );
    }
  }

  return {
    fixture:
      chooseFixture(fixtures),

    homeMatches:
      dedupeMatches(
        homeMatches
      ),

    awayMatches:
      dedupeMatches(
        awayMatches
      ),

    sourceProviders:
      [
        ...new Set(
          sourceProviders
        )
      ],

    fixtureSources:
      fixtures.map(
        item =>
          item.provider
      )
  };
}

function chooseFixture(
  fixtures
) {
  if (!fixtures.length) {
    return null;
  }

  return (
    fixtures[0].fixture ||
    null
  );
}

export function dedupeMatches(
  matches
) {
  const seen =
    new Set();

  const result = [];

  for (
    const match of
      Array.isArray(matches)
        ? matches
        : []
  ) {
    if (!match) {
      continue;
    }

    const key =
      String(
        match.id ||
        [
          match.utcDate ||
            match.date ||
            "",

          match.homeTeam?.name ||
            "",

          match.awayTeam?.name ||
            "",

          match.score?.fullTime?.home ??
            "",

          match.score?.fullTime?.away ??
            ""
        ].join("|")
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    result.push(match);
  }

  result.sort(
    (a, b) =>
      parseDate(
        b?.utcDate ||
        b?.date
      ) -
      parseDate(
        a?.utcDate ||
        a?.date
      )
  );

  return result.slice(
    0,
    30
  );
}

export function buildTeamAnalysis(
  homeName,
  awayName,
  merged = {}
) {
  const home =
    calculateTeamStats(
      homeName,
      merged.homeMatches ||
        []
    );

  const away =
    calculateTeamStats(
      awayName,
      merged.awayMatches ||
        []
    );

  const homeAttack =
    blend(
      home.goalsForAvg,
      1.35,
      home.games
    );

  const homeDefense =
    blend(
      home.goalsAgainstAvg,
      1.35,
      home.games
    );

  const awayAttack =
    blend(
      away.goalsForAvg,
      1.15,
      away.games
    );

  const awayDefense =
    blend(
      away.goalsAgainstAvg,
      1.35,
      away.games
    );

  const homeXg =
    clamp(
      homeAttack * 0.58 +
      awayDefense * 0.42 +
      0.12,

      0.15,
      4.5
    );

  const awayXg =
    clamp(
      awayAttack * 0.58 +
      homeDefense * 0.42,

      0.10,
      4.0
    );

  return {
    home,
    away,

    model: {
      homeXg:
        round(homeXg),

      awayXg:
        round(awayXg)
    }
  };
}

function blend(
  value,
  prior,
  games
) {
  const n =
    Math.max(
      0,
      Number(games) || 0
    );

  return (
    Number(value) * n +
    prior * 3
  ) /
  (n + 3);
}

export function calculateTeamStats(
  teamName,
  matches
) {
  const team =
    normalizeName(
      teamName
    );

  const usable =
    (
      Array.isArray(matches)
        ? matches
        : []
    )
      .map(match => {
        if (!match) {
          return null;
        }

        const homeName =
          match.homeTeam?.name;

        const awayName =
          match.awayTeam?.name;

        const home =
          normalizeName(
            homeName
          );

        const away =
          normalizeName(
            awayName
          );

        const homeGoals =
          Number(
            match.score?.fullTime?.home
          );

        const awayGoals =
          Number(
            match.score?.fullTime?.away
          );

        if (
          !Number.isFinite(
            homeGoals
          ) ||
          !Number.isFinite(
            awayGoals
          )
        ) {
          return null;
        }

        const homeMatch =
          namesMatch(
            home,
            team
          );

        const awayMatch =
          namesMatch(
            away,
            team
          );

        if (
          homeMatch === awayMatch
        ) {
          return null;
        }

        const isHome =
          homeMatch;

        const gf =
          isHome
            ? homeGoals
            : awayGoals;

        const ga =
          isHome
            ? awayGoals
            : homeGoals;

        return {
          id:
            match.id ||
            null,

          utcDate:
            match.utcDate ||
            match.date ||
            null,

          gf,
          ga,

          result:
            gf > ga
              ? "W"
              : gf < ga
                ? "L"
                : "D"
        };
      })

      .filter(Boolean)

      .sort(
        (a, b) =>
          parseDate(
            b.utcDate
          ) -
          parseDate(
            a.utcDate
          )
      );

  const last5 =
    usable.slice(
      0,
      5
    );

  const last10 =
    usable.slice(
      0,
      10
    );

  const average =
    (items, key) =>
      items.length
        ? items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item[key] || 0
              ),
            0
          ) /
          items.length
        : 0;

  const gf5 =
    average(
      last5,
      "gf"
    );

  const gf10 =
    average(
      last10,
      "gf"
    );

  const ga5 =
    average(
      last5,
      "ga"
    );

  const ga10 =
    average(
      last10,
      "ga"
    );

  const wins =
    usable.filter(
      item =>
        item.result === "W"
    ).length;

  const draws =
    usable.filter(
      item =>
        item.result === "D"
    ).length;

  const losses =
    usable.filter(
      item =>
        item.result === "L"
    ).length;

  const games =
    usable.length;

  return {
    team:
      teamName,

    games,

    wins,

    draws,

    losses,

    formPoints:
      wins * 3 +
      draws,

    formRate:
      games
        ? round(
            (
              wins * 3 +
              draws
            ) /
            (games * 3)
          )
        : 0,

    goalsForAvg:
      round(
        last5.length
          ? gf5 * 0.6 +
            gf10 * 0.4
          : gf10
      ),

    goalsAgainstAvg:
      round(
        last5.length
          ? ga5 * 0.6 +
            ga10 * 0.4
          : ga10
      ),

    last5:
      last5.map(
        item => ({
          gf:
            item.gf,

          ga:
            item.ga,

          result:
            item.result
        })
      )
  };
}

export function normalizeName(
  value
) {
  return String(value || "")
    .toLowerCase()
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
      /\b(fc|cf|afc|sc|ac|fk|club|the)\b/g,
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

export function namesMatch(
  first,
  second
) {
  const a =
    normalizeName(first);

  const b =
    normalizeName(second);

  if (!a || !b) {
    return false;
  }

  if (
    a === b ||
    a.includes(b) ||
    b.includes(a)
  ) {
    return true;
  }

  const ta =
    new Set(
      a.split(" ")
        .filter(
          token =>
            token.length >= 3
        )
    );

  const tb =
    b.split(" ")
      .filter(
        token =>
          token.length >= 3
      );

  if (
    !ta.size ||
    !tb.length
  ) {
    return false;
  }

  const overlap =
    tb.filter(
      token =>
        ta.has(token)
    ).length;

  return tb.length === 1
    ? overlap >= 1
    : overlap >=
      Math.min(
        2,
        tb.length
      );
}

function parseDate(
  value
) {
  if (!value) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function clamp(
  value,
  min,
  max
) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? Math.min(
        Math.max(
          n,
          min
        ),
        max
      )
    : min;
}

function round(
  value
) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? Math.round(
        n * 100
      ) / 100
    : 0;
}
