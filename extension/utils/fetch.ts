import config from "config";
import { MovieSearchResponse } from "@/types/movie";

/**
 * Sends a request to the background script.
 * @param url URL for the request.
 * @param options Request options (method, headers, etc.).
 * @returns The result of the request.
 */
export const fetchBackground = async <T>(
  url: string,
  options: RequestInit = {
    method: "GET",
  }
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "fetchData", url, options },
      (response) =>
        chrome.runtime.lastError
          ? reject(chrome.runtime.lastError)
          : resolve(response)
    );
  });
};

/**
 * Fetches movie search results from the background script.
 *
 * @param query The search query.
 * @param page The page number for paginated results.
 * @param year Optional release year filter.
 * @returns The result of the request.
 */
export const fetchSearchMovie = async (
  query: string,
  page: number,
  year: number | null
): Promise<MovieSearchResponse> => {
  const url = new URL("/api/v2/movies/search", config.baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("with", "timecodeId");
  if (year !== null) url.searchParams.set("year", String(year));

  return await fetchBackground<MovieSearchResponse>(url.toString());
};
