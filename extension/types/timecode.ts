import { ServerResponse } from "./response";

export interface TimecodeAuthorsResponse extends ServerResponse {
  authors: TimecodeAuthor[] | null;
}

export interface TimecodeAuthor {
  user: {
    id: number;
    username: string;
  };
  timecode: {
    id: number;
    duration: number;
    like_count?: number;
    dislike_count?: number;
    used_count?: number;
    segment_count: number;
  };
}

export interface TimecodeResponse extends ServerResponse {
  id: number;
  movie_id: number;
  content_classifications: number[] | null;
  segments: TimecodeSegment[] | null;
}

export interface TimecodeSegment {
  id: number;
  tag_id: number;
  action_id?: number | null;
  start_time: number;
  end_time: number;
  description?: string | null;
}

export interface TimecodeEditor extends ServerResponse {
  id: number;
  movie_id: number;
  duration: number;
  release_year: number | null;
  title: string | null;
  original_title: string;
  poster_url: string | null;
  content_classifications: number[] | null;
  segments: TimecodeSegment[] | null;
}
