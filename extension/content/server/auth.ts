import { fetchBackground } from "@/utils/fetch";
import config from "config";
import { ServerResponse } from "@/types/response";
import { PostMessageSource } from "@/enums/post-command";
import { settings } from "@/utils/settings";

/**
 * Sends an error message and clears user from storage.
 */
const postError = () => {
  chrome.storage.sync.set({ user: undefined });
  window.postMessage(
    {
      source: PostMessageSource.EXTENSION,
      type: "error",
    },
    "*",
  );
};

// Interface for authentication extension response
interface AuthExtension extends ServerResponse {
  id: number;
  role_id: number;
  username: string;
  picture?: string | null;
  access_token: string;
  expires_at?: number | null;
  twitch?: {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
  } | null;
}

/**
 * Handles authentication message from window.
 * @param event - message event
 */
const onMessage = async (event: any) => {
  if (event.source !== window) return;
  if (event.data?.source !== PostMessageSource.SERVER) return;
  const auth = event.data?.auth;
  if (!auth?.id || !auth?.token) {
    return;
  }
  window.removeEventListener("message", onMessage);

  try {
    const data = await fetchBackground<AuthExtension>(
      `${config.baseUrl}/api/v2/auth/extension?id=${auth.id}&token=${auth.token}`,
      {
        method: "POST",
      },
    );
    if (data.success) {
      await settings.set({
        user: {
          id: data.id,
          roleId: data.role_id,
          username: data.username,
          picture: data?.picture ?? undefined,
          accessToken: data.access_token,
          expiresAt: data.expires_at,
          twitch:
            data?.twitch &&
            data?.twitch?.access_token &&
            data?.twitch?.refresh_token
              ? {
                  accessToken: data.twitch.access_token,
                  refreshToken: data.twitch.refresh_token,
                  expiresAt: data.twitch?.expires_at,
                }
              : null,
        },
      });
      window.postMessage(
        {
          source: PostMessageSource.EXTENSION,
          type: "success",
        },
        "*",
      );

      return;
    }
  } catch (e) {
    if (config.debug) {
      console.error(e);
    }
  }

  postError();
};

/**
 * Adds message listener if on auth callback page.
 */
if (location.href.includes("/auth/callback")) {
  window.addEventListener("message", onMessage);
}
