// ============================================
// Y.C.B - MOCK DATA PROVIDER
// ============================================

import {
  DataProvider,
  registerProvider
} from "./providers.js";


// --------------------------------------------
// Mock Provider
// --------------------------------------------

class MockProvider extends DataProvider {

  constructor() {

    super("Mock Provider");

  }


  // ------------------------------------------
  // Get Match Data
  // ------------------------------------------

  async getMatchData(home, away) {

    if (!home || !away) {

      throw new Error(
        "Home and away teams are required"
      );

    }

    return {

      provider: this.name,

      home: home,

      away: away,

      status: "success",

      data: {

        message:
          "Mock data received successfully",

        source:
          "Y.C.B Mock Provider",

        timestamp:
          new Date().toISOString()

      }

    };

  }

}


// --------------------------------------------
// Create Provider
// --------------------------------------------

const mockProvider =
  new MockProvider();


// --------------------------------------------
// Register Provider
// --------------------------------------------

registerProvider(
  mockProvider
);


// --------------------------------------------
// Export Provider
// --------------------------------------------

export default mockProvider;
