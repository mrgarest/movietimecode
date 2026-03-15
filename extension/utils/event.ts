import config from "config";
import { ServerResponse } from "@/interfaces/response";
import { fetchBackground } from "./fetch";
import { getDeviceToken } from "./user";
import { EventType } from "@/enums/event";

/**
 * Sends an event to the server.
 *
 * @param type The type of event.
 * @param value The value associated with the event.
 */
export const event = async (
  type: EventType,
  value: number | string | null = null,
) => {
  if (config.debug) return;
  try {
    const deviceToken = await getDeviceToken();
    await fetchBackground<ServerResponse>(`${config.baseUrl}/api/v2/events`, {
      method: "POST",
      body: JSON.stringify({
        device_token: deviceToken,
        type,
        platform: "extension",
        ...(value !== null ? { value: value.toString() } : {}),
      }),
    });
  } catch (err) {}
};
