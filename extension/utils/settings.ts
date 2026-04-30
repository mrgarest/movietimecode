import { ChatbotAccess, ChatbotAction } from "@/enums/chatbot";
import { BlurPower, TimecodeAction } from "@/enums/timecode";
import { ChatbotCommand } from "@/types/chatbot";
import { Settings } from "@/types/settings";

export const SettingsDefault = {
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
 * Get all settings, filling in missing fields with values from SettingsDefault.
 */
export const getSettings = async (): Promise<Settings>=> {
  const result = await chrome.storage.sync.get("settings");
  const storedSettings = (result.settings as Settings) || {};

  return {
    ...SettingsDefault,
    ...storedSettings,
  } as Required<Settings>;
};

/**
 * Get a specific field from the ‘settings’ object in chrome.storage.
 * @param key
 */
export const getSetting = async <K extends keyof Settings>(
  key: K
): Promise<Settings[K]> => {
  const settings = await getSettings();
  return settings[key];
};

/**
 * Subscription to changes in settings in chrome.storage.
 * @param callback The function that will receive the updated Settings object
 */
export const onSettingsChanged = (
  callback: (newSettings: Settings) => void
) => {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "sync" && changes.settings) {
      callback(changes.settings.newValue as Settings);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  return () => chrome.storage.onChanged.removeListener(listener);
};

/**
 * Updating settings in chrome.storage.
 *
 * @param updates
 */
export const updateSettings = async (
  updates: Partial<Settings>
): Promise<void> => {
  const currentSettings = await getSettings();

  // Create a copy for safe editing
  const sanitizedUpdates: Partial<Settings> = { ...updates };

  for (const key in sanitizedUpdates) {
    const k = key as keyof Settings;
    const newValue = sanitizedUpdates[k];
    const defaultValue = SettingsDefault[k as keyof typeof SettingsDefault];

    // If the default is a number and a string is received, convert it to a number.
    if (typeof defaultValue === "number" && typeof newValue === "string") {
      (sanitizedUpdates[k] as any) = Number(newValue);
    }
    // If the default is boolean, but a string is received
    else if (
      typeof defaultValue === "boolean" &&
      typeof newValue === "string"
    ) {
      (sanitizedUpdates[k] as any) = newValue === "true";
    }
  }

  const updatedSettings = {
    ...currentSettings,
    ...sanitizedUpdates,
  };

  await chrome.storage.sync.set({ settings: updatedSettings });
};

/**
 * Updates the specific field in chrome.storage
 * @param key
 * @param value
 */
export const updateSetting = async <K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> => {
  await updateSettings({ [key]: value });
};
