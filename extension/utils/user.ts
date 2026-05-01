import config from "config";
import { goToTab } from "./navigation";
import { User } from "@/types/user";
import CryptoJS from "crypto-js";
import { settings } from "./settings";

/**
 * Opens a new tab for authorization.
 */
export const login = () =>
  goToTab({ url: `${config.baseUrl}/login/extension` });

/**
 * Log out of the system.
 */
export const logout = async () => await chrome.storage.local.remove("user");

/**
 * Receives user data.
 * @returns A user object of type User or undefined if the user is not found.
 */
export const getUser = async (): Promise<User | undefined> => {
  const user = settings.get("user");

  if (
    !user ||
    (user.expiresAt && Math.floor(Date.now() / 1000) >= user.expiresAt)
  ) {
    return undefined;
  }

  return user;
};

/**
 * Generates and stores a unique device token if it doesn't already exist.
 *
 * @returns Promise<string> - The device token.
 */
export const getDeviceToken = async (): Promise<string> => {
  let deviceToken = settings.get("deviceToken");
  if (deviceToken) return deviceToken;

  deviceToken = CryptoJS.lib.WordArray.random(18).toString();
  settings.set({ deviceToken });

  return deviceToken;
};
