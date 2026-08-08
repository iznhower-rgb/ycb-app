import {
  DataProvider,
  registerProvider
} from "./providers.js";

class MockProvider extends DataProvider {

  constructor() {
    super("Mock Provider");
  }

  async getMatchData(home, away) {

    return {
      provider: this.name,
      home,
      away,
      status: "success",
      data: {
        message: "Mock data received successfully"
      }
    };

  }

}

const mockProvider = new MockProvider();

registerProvider(mockProvider);

export default mockProvider;
