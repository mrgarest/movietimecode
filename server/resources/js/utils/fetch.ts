import { ServerResponseError } from "@/types/response";
import Cookies from "js-cookie";

interface FetchOptions {
    method?: "GET" | "POST" | "DELETE";
    body?: any | undefined;
    headers?: Record<string, string>;
}

export class ApiError extends Error {
    status: number;
    error: ServerResponseError | null;

    constructor(
        message: string,
        status: number,
        error: ServerResponseError | null,
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.error = error;
    }
}

export const fetchApi = async <T>(
    url: string,
    options: FetchOptions = {
        method: "GET",
    },
): Promise<T> => {
    const isGet = options.method === "GET";
    const isFormData = options.body instanceof FormData;
    let queryString = "";

    if (isGet && options.body && typeof options.body === "object") {
        const params = Object.fromEntries(
            Object.entries(options?.body as Record<string, any>)
                .filter(([_, value]) => value != null)
                .map(([key, value]) => [key, String(value)]),
        );

        const searchParams = new URLSearchParams(params).toString();
        queryString = searchParams ? `?${searchParams}` : "";
    }

    const headers: Record<string, string> = {
        Accept: "application/json",
        ...options.headers,
    };

    if (!isGet && !isFormData) {
        headers["Content-Type"] = "application/json";
    }

    const accessToken = Cookies.get("uat");

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const xsrfToken = Cookies.get("XSRF-TOKEN");
    if (xsrfToken && !isGet) {
        headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
    }

    let requestBody: BodyInit | undefined = undefined;
    if (!isGet && options.body) {
        requestBody = isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body);
    }

    const response = await fetch(`${url}${queryString}`, {
        method: options.method,
        credentials: "include",
        headers: headers,
        body: requestBody,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(
            data?.error?.message ?? "Response not ok",
            response.status,
            data?.error as ServerResponseError,
        );
    }

    return data as T;
};
