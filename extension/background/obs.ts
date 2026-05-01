import { OBSClient } from "@/lib/obs/client";
import { OBSRequest, OBSResponse } from "@/types/obs";
import { settings } from "@/utils/settings";

// Timeout
const HEARTBEAT_TIMEOUT = 600000;

// Map
const obsClients = new Map<
  number,
  Map<
    string,
    {
      client: OBSClient;
      lastActivity: number;
    }
  >
>();

/**
 * Sends a message to the tab (content script).
 */
const sendMessage = (tabId: number, message: OBSResponse) => {
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
};

// Activity update
const touchConnection = (tabId: number, connectionId: string) => {
  const connection = obsClients.get(tabId)?.get(connectionId);
  if (connection) {
    connection.lastActivity = Date.now();
  }
};

// Get client with timeout check
const getConnection = (tabId: number, connectionId: string) => {
  const connection = obsClients.get(tabId)?.get(connectionId);
  if (!connection) throw new Error("OBSClient not connected");

  if (Date.now() - connection.lastActivity > HEARTBEAT_TIMEOUT) {
    connection.client.disconnect();
    obsClients.get(tabId)?.delete(connectionId);
    throw new Error("Connection timeout - no activity for 10 minutes");
  }

  connection.lastActivity = Date.now();
  return connection.client;
};

/**
 * Creates a new OBSClient based on the user's settings.
 */
const getObsClient = (tabId: number, connectionId: string): OBSClient => {
  const obsClientSettings = settings.get("obsClient");

  if (
    !obsClientSettings?.type ||
    !obsClientSettings?.host ||
    !obsClientSettings?.port ||
    !obsClientSettings?.auth
  ) {
    throw new Error("Missing connection data");
  }

  const client = new OBSClient({
    type: obsClientSettings.type,
    host: obsClientSettings.host,
    port: obsClientSettings.port,
    auth: obsClientSettings.auth,
  });

  client.onError((error) =>
    sendMessage(tabId, {
      type: "obs:onError",
      connectionId,
      error: String(error),
    }),
  );
  client.onClose(() =>
    sendMessage(tabId, { type: "obs:onClose", connectionId }),
  );

  return client;
};

/**
 * Disables a specific OBS connection in the tab.
 * If this is the last connection, it removes the tab from the Map.
 */
const disconnectConnection = (tabId: number, connectionId: string) => {
  const tabConnections = obsClients.get(tabId);
  if (!tabConnections) return;

  const connection = tabConnections.get(connectionId);
  if (connection) {
    connection.client.disconnect();
    tabConnections.delete(connectionId);
  }

  if (tabConnections.size === 0) {
    obsClients.delete(tabId);
  }
};

/**
 * Disables all OBS connections in the tab.
 */
const disconnectTab = (tabId: number) => {
  const tabConnections = obsClients.get(tabId);
  if (!tabConnections) return;

  for (const connection of tabConnections.values()) {
    connection.client.disconnect();
  }
  obsClients.delete(tabId);
};

/**
 * Generates a unique identifier for the OBS connection.
 */
const generateConnectionId = (): string => {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Handles messages from the content script related to OBS.
 */
export const handleOBSMessage = async (
  message: OBSRequest,
  tabId: number,
): Promise<OBSResponse> => {
  switch (message.type) {
    case "obs:connect": {
      const connectionId = generateConnectionId();
      const client = getObsClient(tabId, connectionId);

      if (!obsClients.has(tabId)) {
        obsClients.set(tabId, new Map());
      }
      obsClients.get(tabId)!.set(connectionId, {
        client,
        lastActivity: Date.now(),
      });

      const result = await client.connect();
      return { type: "obs:connect", connectionId, result };
    }

    case "obs:ping": {
      touchConnection(tabId, message.connectionId);
      return { type: "obs:pong", connectionId: message.connectionId };
    }

    case "obs:disconnect": {
      disconnectConnection(tabId, message.connectionId);
      return { type: "obs:disconnect", connectionId: message.connectionId };
    }

    case "obs:getScene": {
      const client = getConnection(tabId, message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.getScene();
      return {
        type: "obs:getScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:getActiveScene": {
      const client = getConnection(tabId, message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.getActiveScene();
      return {
        type: "obs:getActiveScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:setActiveScene": {
      const client = getConnection(tabId, message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.setActiveScene(message.scene);
      return {
        type: "obs:setActiveScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:findScene": {
      const client = getConnection(tabId, message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.findScene(message.name, message.scenes);
      return {
        type: "obs:findScene",
        connectionId: message.connectionId,
        result,
      };
    }
  }
};

// Automatically disconnects all OBS connections when the tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  disconnectTab(tabId);
});

// Automatically disconnects all OBS connections when the URL in the tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    disconnectTab(tabId);
  }
});
