import { MovieSearchItem } from "@/types/movie";
import { useEffect, useState } from "preact/hooks";
import config from "config";
import { fetchSearchMovie } from "@/utils/fetch";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
            <div className="mt-text-xl mt-text-foreground mt-font-bold mt-pt-6 mt-pb-4 mt-px-6">{i18n.t("movieCheck")}</div>
            <div className={cn("mt-flex mt-flex-col mt-gap-1 mt-pt-1 mt-pl-4 mt-pb-6 mt-overflow-auto", isLoading && "mt-hidden")}>
                {movies.map((item, index) => <div
                    key={index}
                    onClick={() => onSelected(item)}
                    className="mt-relative mt-flex mt-items-center mt-gap-3 mt-rounded-md mt-p-2 mt-cursor-pointer mt-select-none mt-hover:bg-secondary mt-duration-300 mt-gap-4">
                    <img
                        className="mt-w-12 mt-h-16 mt-pointer-none mt-rounded-md"
                        src={item.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
                    <div className="mt-flex mt-flex-col mt-gap-1">
                        <div>
                            <span className="mt-text-sm mt-text-foreground mt-font-semibold">{item.title ? item.title : item.original_title}</span>
                            &#32;
                            <span className="mt-text-xs mt-text-muted">({item.release_year})</span>
                        </div>
                        {item.title != null && <h2 className="mt-text-sm mt-text-muted mt-font-medium">{item.original_title}</h2>}
                    </div>
                </div>)}
            </div>
        </>
    )
};
