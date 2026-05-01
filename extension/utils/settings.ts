import { ChatbotAccess, ChatbotAction } from "@/enums/chatbot";
import { BlurPower, TimecodeAction } from "@/enums/timecode";
import { ChatbotCommand } from "@/types/chatbot";
import { Settings } from "@/types/settings";
import config from "config";

// Default settings for the extension.
export const DEFAULT_SETTINGS: Settings = {
  installedAt: null,
  user: null,
  deviceToken: null,
  timeBuffer: 0,
  blurPower: BlurPower.base,
  nudity: TimecodeAction.blur,
  sexualContentWithoutNudity: TimecodeAction.blur,
  eroticSounds: TimecodeAction.mute,
  violence: TimecodeAction.blur,
  sensitiveExpressions: TimecodeAction.mute,
  playerContentCensorshipCommand: TimecodeAction.blur,
  useDrugsAlcoholTobacco: TimecodeAction.blur,
  prohibitedSymbols: TimecodeAction.blur,
  obsClient: null,
  obsCensorScene: null,
  editTwitchContentClassification: false,
  chatbotEnabled: false,
  checkStreamLive: true,
  chatbotCommands: [
    {
      enabled: true,
      command: "!mtstop",
      action: ChatbotAction.stop,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!pause",
      action: ChatbotAction.pause,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!play",
      action: ChatbotAction.play,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!mute",
      action: ChatbotAction.mute,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!blur",
      action: ChatbotAction.blur,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!unblur",
      action: ChatbotAction.unblur,
      access: ChatbotAccess.onlyMe,
    },
    {
      enabled: true,
      command: "!movietitle",
      action: ChatbotAction.movieTitle,
      access: ChatbotAccess.users,
    },
    {
      enabled: true,
      command: "!movietime",
      action: ChatbotAction.currentMovieTime,
      access: ChatbotAccess.users,
    },
  ] as ChatbotCommand[],
};

/**
 * Extension Settings Manager.
 * Provides synchronous access to the cache, asynchronous loading, updates, and change subscriptions.
 */
class SettingsManager {
  private cache: Settings = { ...DEFAULT_SETTINGS };
  private listeners: Partial<{
    [K in keyof Settings]: ((key: K, newValue: Settings[K]) => void)[];
  }> = {};

  constructor() {
    this.init();
  }

  private async init() {
    const res = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    this.cache = { ...DEFAULT_SETTINGS, ...res } as unknown as Settings;

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") {
        for (const [key, change] of Object.entries(changes)) {
          if (key in this.cache) {
            (this.cache as any)[key] = change.newValue;

            const keyListeners = this.listeners[key as keyof Settings];
            if (keyListeners) {
              for (const listener of keyListeners) {
                (listener as (key: unknown, value: unknown) => void)(
                  key,
                  change.newValue,
                );
              }
            }
          }
        }
      }
    });
  }

  /**
   * Retrieves the current setting value from the cache (synchronously).
   */
  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.cache[key];
  }

  /**
   * Loads all settings from `chrome.storage.local` with their default values.
   */
  async getAll(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...result } as unknown as Settings);
      });
    });
  }

  /**
   * Sets one or more settings.
   */
  async set(values: Partial<Settings>): Promise<void> {
    await chrome.storage.local.set(values);
  }

  /**
   * Creates a handler to synchronize React state with chrome.storage.
   * Used in the UI for two-way communication.
   */
  sync<K extends keyof Settings>(key: K, setter: (value: Settings[K]) => void) {
    return (newValue: Settings[K]) => {
      setter(newValue);
      chrome.storage.local.set({ [key]: newValue }, () => {
        if (chrome.runtime.lastError && config.debug) {
          console.error(`Error saving ${key}:`, chrome.runtime.lastError);
        }
      });
    };
  }

  /**
   * Subscribes to changes to one or more settings.
   * @returns Unsubscribe function
   */
  onChange<K extends keyof Settings>(
    keys: K | K[],
    listener: (key: K, newValue: Settings[K]) => void,
  ): () => void {
    const keysArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keysArray) {
      if (!this.listeners[key]) {
        this.listeners[key] = [];
      }
      this.listeners[key]!.push(
        listener as (key: K, value: Settings[K]) => void,
      );
    }

    return () => {
      for (const key of keysArray) {
        this.listeners[key] = this.listeners[key]!.filter(
          (l) => l !== listener,
        ) as (typeof this.listeners)[K];
      }
    };
  }
}

export const settings = new SettingsManager();

/**
 * Migration from the old chrome.storage.sync format to chrome.storage.local.
 */
export const migrateSettings = async (): Promise<void> => {
  const { migrated } = await chrome.storage.local.get("migrated");
  if (migrated) return;

  const old = await chrome.storage.sync.get("settings");
  const oldSettings = old.settings as Partial<Settings> | undefined;

  if (oldSettings) {
    // Filter only those keys that are in DEFAULT_SETTINGS
    const validKeys = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
    const migratedSettings: Partial<Settings> = {};

    for (const key of validKeys) {
      if (key in oldSettings) {
        (migratedSettings as any)[key] = oldSettings[key];
      }
    }

    await chrome.storage.local.set(migratedSettings);
    await chrome.storage.sync.remove("settings");

    if (config.debug)
      console.log("Settings migrated from sync to local:", migratedSettings);
  }

  const { device } = await chrome.storage.sync.get<{
    device?: { token: string };
  }>("device");

  if (device) {
    await chrome.storage.sync.remove("device");
    settings.set({ deviceToken: device.token });
  }

  await chrome.storage.sync.remove("user");

  await chrome.storage.local.set({ migrated: 1 });
};
