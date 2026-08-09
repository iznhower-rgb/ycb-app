// ==========================================
// Y.C.B MOCK PROVIDER
// ==========================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// ==========================================
// MOCK PROVIDER
// ==========================================

class MockProvider extends DataProvider {

  constructor() {
    super("Mock Provider");
  }


  async getMatchData(home, away) {

    return {

      status: "success",

      data: {

        source: "mock",

        available: true,

        home: home,

        away: away,

        message:
          "Mock provider is working correctly"

      },

      message:
        "Mock data received successfully"

    };

  }

}


// ==========================================
// CREATE PROVIDER
// ==========================================

const mockProvider =
  new MockProvider();


// ==========================================
// REGISTER
// ==========================================

registerProvider(
  mockProvider
);


// ==========================================
// EXPORT
// ==========================================

export default mockProvider;
