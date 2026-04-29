import { ServerResponse } from "@/types/response";
import { fetchApi } from "./fetch";
import { EventType } from "@/enums/event";
import { getDeviceToken } from "./cookies";

/**
 * Sends an event to the server.
 *
 * @param type The type of event.
 * @param value The value associated with the event.
 */
export const event = async (type: EventType, value: number | string) => {
    try {
        await fetchApi<ServerResponse>("/api/v2/events", {
            method: "POST",
            body: {
                device_token: getDeviceToken(),
                type,
                platform: "web",
                value: value.toString(),
            },
        });
    } catch (err) {}
};
