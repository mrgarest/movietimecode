import { ServerResponse } from "./response";

export interface MovieSearchResponse extends ServerResponse {
    id: number;
    items: MovieSearchItem[] | null;
}
export interface MovieImportResponse extends ServerResponse {
    id: number;
    tmdb_id: number;
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
    overview: string | null;
    release: {
        hazard: boolean;
        release_date: string;
    } | null;
    productions: MovieCheckCompany[] | null;
    distributors: MovieCheckCompany[] | null;
    genres: MovieGenre[] | null;
    ban_count: number | null;
    sitrike_count: number | null;
    recommendation: {
        color: string;
        message: string;
    } | null;
    imdb: {
        id: string;
        content_ratings: ImdbContentRating[] | null;
    } | null;
    aznude: {
        is_nude: boolean;
        url: string;
    } | null;
    poster_url: string | null;
    backdrop_url: string | null;
    trailer: string | null;
}

export interface MovieGenre {
    slug: string;
    name: string;
}

export type MovieRecommendationColor = 'green' | 'yellow' | 'red';

/**
 * Allowed release years in the filters (config movie.list_filters on the server).
 */
export interface MovieYearRange {
    min: number;
    max: number;
}

export type MovieListSort = 'added' | 'release_desc' | 'release_asc';

/**
 * Filters of the movie list with timecodes (the same as MovieListFilterData on the server).
 */
export interface MovieListFilters {
    genres: string[];
    recommendations: MovieRecommendationColor[];
    year_from: number | null;
    year_to: number | null;
    rating: number | null;
    sort: MovieListSort;
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
    trailer: string | null;
}

export interface MovieListResponse extends ServerResponse {
    current_page: number;
    last_page: number;
    items: MovieCard[] | null;
}
