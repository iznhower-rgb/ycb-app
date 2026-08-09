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

      provider:
        this.name,

      home:
        home,

      away:
        away,

      status:
        "success",

      data: {

        message:
          "Mock provider is working",

        source:
          "mock",

        available:
          true

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
// REGISTER PROVIDER
// ==========================================

registerProvider(
  mockProvider
);


// ==========================================
// EXPORT
// ==========================================

export default mockProvider;
