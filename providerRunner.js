/* ==========================================================
   2. PROVIDER RUNNER (providerRunner.js)
========================================================== */

import { getProviderInstances } from "./providers.js";

export async function getAllMatchData(home, away, env) {
  const providers = getProviderInstances().filter(
    provider => provider.enabled !== false
  );

  return Promise.all(
    providers.map(async provider => {
      const startedAt = Date.now();

      try {
        const result = await provider.getMatchData(home, away, env);

        return {
          provider: provider.name,
          success: result?.status === "success",
          status: result?.status || "unknown",
          message: result?.message || "",
          data: result?.data || null,
          durationMs: Date.now() - startedAt
        };
      } catch (error) {
        return {
          provider: provider.name,
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
