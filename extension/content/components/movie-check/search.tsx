import { MovieSearchResponse, MovieSearchItem } from "@/types/movie";
import { useEffect, useState } from "preact/hooks";
import config from "config";
import { fetchSearchMovie } from "@/utils/fetch";
import i18n from "@/lib/i18n";

interface RootProps {
    title: string;
    year?: number | null;
    onSelected: (item: MovieSearchItem) => void;
    onError: (msg: string) => void;
    onLoading: (b: boolean) => void;
};

export default function SearchMovie({ title, year = null, onSelected, onError, onLoading }: RootProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [movies, setMovies] = useState<MovieSearchItem[]>([]);

    /**
     * Searches for movies by query and year.
     * @param query - search query
     * @param year - movie year
     */
    const searchMovie = async (query: string, year: number | null) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetchSearchMovie(query, 1, year);

            if (response.success) {
                if (response.items !== null && response.items.length > 0) {
                    if (response.items.length === 1) {
                        onSelected(response.items[0]);
                        return;
                    }
                    setMovies(prev => [...prev, ...response.items || []]);
                    setIsLoading(false);
                    return;
                } else onError(i18n.t("filmNotFound"));
            } else onError(i18n.t("unknownError"));
        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
            onError(i18n.t("unknownError"));
        }

        setIsLoading(false);
    };

    // Runs searchMovie on mount and when title changes.
    useEffect(() => {
        const init = async () => {
            onLoading(true);
            await searchMovie(title, year);
            onLoading(false);
        };
        setMovies([]);
        init();
    }, [title]);

    return (
        <>
            <div className="mt-dialog-title">{i18n.t("movieCheck")}</div>
            <div className={`mt-search-list mt-scrollbar` + (isLoading ? " mt-hidden" : "")}>
                {movies.map((item, index) => <div
                    key={index}
                    onClick={() => onSelected(item)}
                    className="mt-movie-item">
                    <img
                        className="mt-poster"
                        src={item.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
                    <div className="mt-info">
                        <div>
                            <span className="mt-title">{item.title ? item.title : item.original_title}</span>
                            &#32;
                            <span className="mt-year">({item.release_year})</span>
                        </div>
                        {item.title != null && <h2 className="mt-sub-title">{item.original_title}</h2>}
                    </div>
                </div>)}
            </div>
        </>
    )
};
