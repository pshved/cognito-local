import { MockLogger } from "../__tests__/mockLogger";
import { ResourceNotFoundError } from "../errors";
import { CognitoClientService } from "./cognitoClient";
import { CreateDataStore, DataStore } from "./dataStore";
import { CreateUserPoolClient, UserPoolClient } from "./userPoolClient";

describe("Cognito Client", () => {
  let mockDataStore: jest.Mocked<DataStore>;
  let mockUserPool: jest.Mocked<UserPoolClient>;
  let createUserPoolClient: jest.MockedFunction<CreateUserPoolClient>;
  let createDataStore: jest.MockedFunction<CreateDataStore>;

  beforeEach(() => {
    mockDataStore = {
      set: jest.fn(),
      get: jest.fn(),
      getRoot: jest.fn(),
    };
    createUserPoolClient = jest.fn().mockResolvedValue(mockUserPool);
    createDataStore = jest.fn().mockResolvedValue(mockDataStore);
  });

  it("creates a database for clients", async () => {
    const createDataStore = (jest.fn(
      () => mockDataStore
    ) as unknown) as CreateDataStore;
    await CognitoClientService.create(
      { Id: "local", UsernameAttributes: [] },
      createDataStore,
      createUserPoolClient,
      MockLogger
    );

    expect(createDataStore).toHaveBeenCalledWith("clients", {
      Clients: {},
    });
  });

  describe("getUserPool", () => {
    // For now we're being lenient with the creation of user pools, if one is
    // used that doesn't exist we just create it and allow the operation to
    // continue. This may change in a later release.
    it("creates a user pool by the id specified", async () => {
      const cognitoClient = await CognitoClientService.create(
        { Id: "local", UsernameAttributes: [] },
        createDataStore,
        createUserPoolClient,
        MockLogger
      );

      const userPool = await cognitoClient.getUserPool("testing");

      expect(createUserPoolClient).toHaveBeenCalledWith(
        { Id: "testing", UsernameAttributes: [] },
        mockDataStore,
        createDataStore,
        MockLogger
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });

  describe("getUserPoolForClientId", () => {
    it("throws if client isn't registered", async () => {
      mockDataStore.get.mockResolvedValue(null);
      const cognitoClient = await CognitoClientService.create(
        { Id: "local", UsernameAttributes: [] },
        createDataStore,
        createUserPoolClient,
        MockLogger
      );

      await expect(
        cognitoClient.getUserPoolForClientId("testing")
      ).rejects.toBeInstanceOf(ResourceNotFoundError);

      expect(createUserPoolClient).not.toHaveBeenCalled();
    });

    it("creates a user pool by the id in the client config", async () => {
      mockDataStore.get.mockResolvedValue({
        UserPoolId: "userPoolId",
      });
      const cognitoClient = await CognitoClientService.create(
        { Id: "local", UsernameAttributes: [] },
        createDataStore,
        createUserPoolClient,
        MockLogger
      );

      const userPool = await cognitoClient.getUserPoolForClientId("testing");

      expect(mockDataStore.get).toHaveBeenCalledWith(["Clients", "testing"]);
      expect(createUserPoolClient).toHaveBeenCalledWith(
        { Id: "userPoolId", UsernameAttributes: [] },
        mockDataStore,
        createDataStore,
        MockLogger
      );
      expect(userPool).toEqual(mockUserPool);
    });
  });
});
