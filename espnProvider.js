/* ==========================================================
   4. ESPEN PROVIDER (espnProvider.js)
========================================================== */

import { registerProvider, DataProvider } from "./providers.js";

class EspnProvider extends DataProvider {
  constructor() {
    super({
      name: "ESPN",
      version: "3.1.0",
      description: "ESPN football data provider"
    });
  }

  async getMatchData(home, away, env) {
    // منطق جلب البيانات من ESPN API
    return {
      status: "success",
      message: "ESPN data loaded",
      data: {
        matchFound: true,
        fixture: null,
        recentMatches: { 
          home: [], 
          away: [] 
        }
      }
    };
  }
}

// إنشاء وتصدير الكائن مسجلاً بشكل صحيح
const espnProviderInstance = new EspnProvider();
registerProvider(espnProviderInstance);

export default espnProviderInstance;
