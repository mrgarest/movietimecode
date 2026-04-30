export interface User {
  id: number;
  roleId: number;
  username: string;
  picture?: string | null;
  accessToken: string;
  expiresAt?: number | null;
  twitch?: UserTwitch | null;
}

export interface UserTwitch {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}
