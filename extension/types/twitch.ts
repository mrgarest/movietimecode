import { ServerResponse } from "./response";

export interface TwitchTokenResponse extends ServerResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
}

export interface StreamStatusResponse extends ServerResponse {
  is_live: boolean;
}
