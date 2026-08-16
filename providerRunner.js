/* ==========================================================
   Y.C.B PROVIDER RUNNER 3.2.0
========================================================== */

import { getProviderInstances } from "./providers.js";

import "./espnProvider.js";
import "./theSportsDBProvider.js";
import "./bsdProvider.js";

const TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timeout after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

export async function getAllMatchData(home, away, env = {}) {
  const providers = getProviderInstances().filter(
    provider => provider.enabled !== false
  );

  return Promise.all(
    providers.map(async provider => {
      const startedAt = Date.now();

      try {
        const result = await withTimeout(
          provider.getMatchData(home, away, env),
          Number(env.YCB_PROVIDER_TIMEOUT_MS) || TIMEOUT_MS,
          provider.name
        );

        return {
          provider: provider.name,
          version: provider.version,
          success: result?.status === "success" && Boolean(result?.data),
          status: result?.status || "unknown",
          message: result?.message || "",
          data: result?.data || null,
          durationMs: Date.now() - startedAt
        };
      } catch (error) {
        return {
          provider: provider.name,
          version: provider.version,
          success: false,
          status: "provider_error",
          message: error?.message || String(error),
          data: null,
          durationMs: Date.now() - startedAt
        };
      }
    })
  );
}
