import { OBSClient } from "@/lib/obs/client";
import { OBSRequest, OBSResponse } from "@/types/obs";
import { settings } from "@/utils/settings";

// Map
const obsClients = new Map<string, { client: OBSClient; tabId: number }>();

/**
 * Sends a message to the tab (content script).
 */
const sendMessage = (tabId: number, message: OBSResponse) => {
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
};

// Get client with timeout check
const getConnection = (connectionId: string) => {
  const connection = obsClients.get(connectionId);
  if (!connection) throw new Error("OBSClient not connected");
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
const disconnectConnection = (connectionId: string) => {
  const connection = obsClients.get(connectionId);
  if (!connection) return;
  connection.client.disconnect();
  obsClients.delete(connectionId);
};

/**
 * Disables all OBS connections in the tab.
 */
const disconnectTab = (tabId: number) => {
  for (const [id, connection] of obsClients) {
    if (connection.tabId === tabId) {
      connection.client.disconnect();
      obsClients.delete(id);
    }
  }
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
      obsClients.set(connectionId, { client, tabId });
      const result = await client.connect();
      return { type: "obs:connect", connectionId, result };
    }

    case "obs:disconnect": {
      disconnectConnection(message.connectionId);
      return { type: "obs:disconnect", connectionId: message.connectionId };
    }

    case "obs:getScene": {
      const client = getConnection(message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.getScene();
      return {
        type: "obs:getScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:getActiveScene": {
      const client = getConnection(message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.getActiveScene();
      return {
        type: "obs:getActiveScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:setActiveScene": {
      const client = getConnection(message.connectionId);
      if (!client) throw new Error("OBSClient not connected");
      const result = await client.setActiveScene(message.scene);
      return {
        type: "obs:setActiveScene",
        connectionId: message.connectionId,
        result,
      };
    }

    case "obs:findScene": {
      const client = getConnection(message.connectionId);
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
chrome.tabs.onRemoved.addListener((tabId) => disconnectTab(tabId));

// Automatically disconnects all OBS connections when the URL in the tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    disconnectTab(tabId);
  }
});
