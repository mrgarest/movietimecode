import config from "config";
import { User } from "@/types/user";
import { getDeviceToken, getUser } from "@/utils/user";
import { event } from "@/utils/event";
import { EventType } from "@/enums/event";
import { migrateSettings, settings } from "@/utils/settings";
import { handleOBSMessage } from "./obs";

/**
 * Ensures a device token is generated when the extension is installed.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  await migrateSettings();
  await getDeviceToken();
  const installedAt = settings.get("installedAt");
  if (!installedAt) {
    await settings.set({ installedAt: Date.now() });
    event(EventType.INSTALLED);
  }
});

/**
 * Opens the extension page when the browser action icon is clicked.
 */
chrome.action.onClicked.addListener(() => goToTab({ to: "/settings" }));

/**
 * Handles commands and passes them to the content script of the active tab.
 */
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "command", command });
});

/**
 * Handles messages received via `chrome.runtime.onMessage`.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "fetchData":
      return fetchData(message, sendResponse);
    case "goToTab":
      goToTab(message);
      break;
    default:
      break;
  }

  if (!message.type?.startsWith("obs:") || !sender.tab?.id) return false;

  handleOBSMessage(message, sender.tab.id)
    .then(sendResponse)
    .catch((error) =>
      sendResponse({ type: message.type, error: String(error) }),
    );

  return true;
});

/**
 * Opens a new tab with the extension and navigates to the specified section (hash).
 * @param message
 */
const goToTab = (message: any) => {
  let url: string;
  if (message.url) {
    url = message.url;
  } else if (message.to) {
    url = chrome.runtime.getURL("index.html") + "#" + message.to;
  } else return;

  chrome.tabs.create({
    url: url,
  });
};

/**
 * Performs an HTTP request via fetch and returns the result to the background script.
 * @param message Object with URL and request parameters.
 * @param sendResponse Function to send the response.
 * @returns true if the request was performed.
 */
const fetchData = (
  message: any,
  sendResponse: (response?: any) => void,
): boolean => {
  if (!message.url) {
    sendResponse({ error: "URL is required" });
    return false;
  }
  (async () => {
    try {
      const options = message.options ?? {};

      options.headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Extension-Id": chrome.runtime.id as string,
        ...options.headers,
      };

      const user: User | undefined = await getUser();

      if (user?.accessToken) {
        options.headers["Authorization"] = `Bearer ${user.accessToken}`;
      }

      if (config.version) {
        options.headers["Extension-Version"] = config.version;
      }

      const response = await fetch(message.url, options);
      const data = await response.json();
      sendResponse(data);
    } catch (error) {
      sendResponse({ error: error });
    }
  })();

  return true;
};
