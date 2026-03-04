import { ServerResponse } from "./response";

export interface MovieSearchResponse extends ServerResponse {
  id: number;
  items: MovieSearchItem[] | null;
}

export interface MovieSearchItem {
  id?: number | null;
  tmdb_id: number;
  timecode_id?: number | null;
  release_year: number | null;
  title: string | null;
  original_title: string;
  poster_url: string | null;
}

export interface MovieCheckResponse extends ServerResponse {
  id: number;
  tmdb_id: number;
  release: {
    hazard: boolean;
    release_date: string;
  } | null;
  productions: MovieCheckCompany[] | null;
  distributors: MovieCheckCompany[] | null;
  segments_count: number | null;
  ban_count: number | null;
  sіtrike_count: number | null;
  recommendation: {
    color: string;
    message: string;
  } | null;
  imdb: {
    id: string;
    content_ratings: ImdbContentRating[] | null;
  } | null;
}

export interface MovieCheckCompany {
  id: number;
  hazard_level: number;
  name: string;
}

export interface ImdbContentRating {
  content_id: number;
  level: number;
}

export interface MovieSearchTimecodesResponse extends ServerResponse {
  id: number;
  release_year: number | null;
  title: string | null;
  original_title: string;
  poster_url: string | null;
}
