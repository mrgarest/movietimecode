import config from "config";
import { User, UserTwitch } from "@/types/user";
import { fetchBackground } from "./fetch";
import { StreamStatusResponse, TwitchTokenResponse } from "@/types/twitch";
import { ServerResponse } from "@/types/response";
import { getUser } from "./user";
import { settings } from "./settings";

/**
 * Checks if the user's Twitch token has expired.
 *
 * @param user
 * @returns boolean - True if the token is expired, false otherwise.
 */
export const isTwitchTokenExpires = (user: User): boolean => {
  if (!user?.twitch) return true;

  const expiresAt = user.twitch.expiresAt;
  if (!expiresAt) return true;

  const now = Math.floor(Date.now() / 1000);

  return now >= expiresAt;
};

/**
 * Refreshes Twitch token and updates chrome.storage.
 *
 * @param user
 * @returns Promise<UserTwitch | null>
 */
export const refreshTwitchToken = async (
  user: User,
): Promise<UserTwitch | null> => {
  if (!user?.twitch?.refreshToken) return null;
  try {
    const data = await fetchBackground<TwitchTokenResponse>(
      `${config.baseUrl}/api/v2/twitch/token?grant_type=refresh_token&refresh_token=${user.twitch.refreshToken}`,
      {
        method: "POST",
      },
    );

    if (!data.success) {
      return null;
    }

    const twitch: UserTwitch = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };

    await settings.set({ user: { ...user, twitch } });

    return twitch;
  } catch (err) {
    if (config.debug) {
      console.error("Failed to refresh Twitch token:", err);
    }
    return null;
  }
};

/**
 * Checks whether the stream has started.
 *
 * @param user
 * @returns Promise<boolean>
 */
export const isStreamLive = async (user: User): Promise<boolean> => {
  const checkStreamLive = settings.get("checkStreamLive");
  if (!checkStreamLive) return true;

  if (!user?.twitch?.accessToken) return false;
  try {
    const data = await fetchBackground<StreamStatusResponse>(
      `${config.baseUrl}/api/v2/twitch/stream/status?access_token=${user.twitch.accessToken}`,
    );

    return data.success && data.is_live;
  } catch (err) {
    if (config.debug) {
      console.error(err);
    }
  }
  return false;
};

export const updateTwitchContentClassification = async ({
  ids,
  enabled,
}: {
  ids: number[];
  enabled: boolean;
}): Promise<boolean> => {
  if (ids.length == 0) {
    return false;
  }

  const editTwitchContentClassification = settings.get(
    "editTwitchContentClassification",
  );
  if (!editTwitchContentClassification) return false;

  const user = await getUser();
  if (!user?.twitch?.accessToken) {
    return false;
  }

  let accessToken: string = user.twitch.accessToken;

  // If the token is outdated, try updating it.
  if (isTwitchTokenExpires(user)) {
    const token = await refreshTwitchToken(user);
    if (!token?.accessToken) return false;
    accessToken = token.accessToken;
  }

  if (!(await isStreamLive(user))) {
    return false;
  }

  try {
    const data = await fetchBackground<ServerResponse>(
      `${config.baseUrl}/api/v2/twitch/content-classification`,
      {
        method: "POST",
        body: JSON.stringify({
          access_token: accessToken,
          enabled: enabled,
          ids: ids,
        }),
      },
    );

    return data.success;
  } catch (err) {
    if (config.debug) {
      console.error(err);
    }
  }
  return false;
};
