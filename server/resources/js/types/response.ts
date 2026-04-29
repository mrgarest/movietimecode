export interface ServerResponse {
  success: boolean;
  error?: ServerResponseError;
}

export interface ServerResponseError {
  code: string | number;
  status: number;
  message: string | null;
  details?: any | null;
}
