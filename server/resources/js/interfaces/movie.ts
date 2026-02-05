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

export interface MovieDetailResponse extends ServerResponse {
    id: number;
    tmdb_id: number;
    rating_imdb: string | null;
    title: string | null;
    original_title: string;
    release: {
        hazard: boolean;
        release_date: string;
    } | null;
    productions: MovieCheckCompany[] | null;
    distributors: MovieCheckCompany[] | null;
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
    poster_url: string | null;
    backdrop_url: string | null;
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

export interface MovieLatestResponse extends ServerResponse {
    checked: MovieCard[] | null;
    timecodes: MovieCard[] | null;
}

export interface MovieCard {
    tmdb_id: number;
    rating_imdb: number | null;
    release_year: number | null;
    title: string;
    poster_url: string | null;
}

export interface MovieListResponse extends ServerResponse {
    current_page: number;
    last_page: number;
    items: MovieCard[] | null;
}
