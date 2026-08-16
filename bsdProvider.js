/* ==========================================================
   Y.C.B BSD PROVIDER 3.2.0
   Optional compatible BSD endpoint
========================================================== */

import {
  registerProvider
} from "./providers.js";

const REQUEST_TIMEOUT_MS =
  15000;

function normalizeRaw(
  data,
  home,
  away
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  const fixture =
    data.fixture ||
    data.match ||
    null;

  const recentHome =
    data.recentMatches?.home ||
    data.homeMatches ||
    data.home_history ||
    [];

  const recentAway =
    data.recentMatches?.away ||
    data.awayMatches ||
    data.away_history ||
    [];

  return {
    matchFound:
      Boolean(
        data.matchFound ??
        fixture
      ),

    fixture,

    recentMatches: {
      home:
        Array.isArray(
          recentHome
        )
          ? recentHome
          : [],

      away:
        Array.isArray(
          recentAway
        )
          ? recentAway
          : []
    },

    requested: {
      home,
      away
    }
  };
}

async function getMatchData(
  home,
  away,
  env = {}
) {
  const endpoint =
    String(
      env?.BSD_API_URL ||
      ""
    ).trim();

  if (!endpoint) {
    return {
      status: "disabled",
      message:
        "BSD_API_URL غير مضبوط.",
      data: null
    };
  }

  let url;

  try {
    url =
      new URL(endpoint);

  } catch {
    return {
      status: "invalid_config",
      message:
        "BSD_API_URL غير صالح.",
      data: null
    };
  }

  url.searchParams.set(
    "home",
    home
  );

  url.searchParams.set(
    "away",
    away
  );

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),

      Number(
        env.YCB_BSD_TIMEOUT_MS
      ) ||
        REQUEST_TIMEOUT_MS
    );

  try {
    const headers = {
      Accept:
        "application/json"
    };

    if (
      env?.BSD_API_KEY
    ) {
      headers.Authorization =
        `Bearer ${env.BSD_API_KEY}`;
    }

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",
          headers,
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `BSD HTTP ${response.status}`
      );
    }

    const raw =
      await response.json();

    const data =
      normalizeRaw(
        raw,
        home,
        away
      );

    return {
      status:
        data
          ? "success"
          : "empty",

      message:
        data
          ? "BSD data loaded"
          : "BSD returned no usable data",

      data
    };

  } finally {
    clearTimeout(timer);
  }
}

const provider = {
  name:
    "BSD",

  version:
    "3.2.0",

  description:
    "Optional BSD football data provider",

  enabled:
    true,

  getMatchData
};

registerProvider(
  provider
);

export {
  getMatchData
};

export default provider;
