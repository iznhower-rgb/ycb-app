import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// Y.C.B MOCK PROVIDER
// ==========================================

class MockProvider extends DataProvider {

  constructor() {
    super("Mock Provider");
  }


  // ========================================
  // GET MATCH DATA
  // ========================================

  async getMatchData(home, away) {

    return {

      provider: this.name,

      home,

      away,

      status: "success",

      data: {

        message: "Mock data received successfully",

        source: "mock",

        available: true

      }

    };

  }

}


// ==========================================
// REGISTER PROVIDER
// ==========================================

const mockProvider = new MockProvider();

registerProvider(mockProvider);


// ==========================================
// EXPORT
// ==========================================

export default mockProvider;
