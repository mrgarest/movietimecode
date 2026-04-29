import { Input } from "@/components/ui/input";
import { MovieSearchItem, MovieSearchResponse } from "@/types/movie";
import { cn } from "@/lib/utils";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Search, X } from "lucide-react";

interface RootProps {
    withMovieId?: boolean
    inputSize?: "default" | "lg"
    placeholder?: string,
    className?: string,
    onSelected: (movie: MovieSearchItem) => void,
}

export default function MovieSearch({ withMovieId = false, inputSize = "default", placeholder, className, onSelected }: RootProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');
    const [debouncedQuery] = useDebounce(query, 1000);

    const { data, isLoading, error, isError, isFetching } = useQuery<MovieSearchResponse, ApiError>({
        queryKey: ['search-users', debouncedQuery],
        queryFn: () => fetchApi<MovieSearchResponse>('/api/v2/movies/search', {
            method: 'GET',
            body: {
                q: debouncedQuery,
                limit: 20,
                with: withMovieId ? "movieId" : undefined
            },
        }),
        enabled: debouncedQuery.length >= 2,
        placeholderData: keepPreviousData,
    });

    const handleSelect = (movie: MovieSearchItem) => {
        setQuery(movie.title || movie.original_title);
        setIsOpen(false);
        onSelected(movie);
    };

    const isActuallyLoading = query.length > 0 && (query !== debouncedQuery || isLoading || isFetching);

    const movies = (query === debouncedQuery) ? (data?.items ?? []) : [];

    const showResults = isOpen && query.length >= 2 && (isActuallyLoading || movies.length > 0);

    return (
        <div className={cn("relative z-1 w-full", className)}>
            {query.length > 0 ?
                <X onClick={() => { setQuery(''); setIsOpen(false); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-10 p-3 text-muted-foreground z-2 cursor-pointer" /> : <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-2" />}
            <Input
                className={cn(
                    "pr-11 w-full duration-300 z-0 relative",
                    inputSize == "lg" && "h-12",
                    showResults && inputSize == "lg" && "rounded-t-2xl",
                    !showResults && inputSize == "lg" && "rounded-2xl",
                    showResults && "rounded-b-none"
                )}
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                }}
                placeholder={placeholder}
            />

            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute left-0 right-0 w-full bg-secondary border border-border rounded-b-2xl overflow-hidden z-20 shadow-xl">
                        <div>
                            {isActuallyLoading ? <Spinner className="mx-auto my-4" /> : <ScrollArea className="h-74">{movies.map((item, index) => <div
                                key={index}
                                onClick={() => handleSelect(item)}
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-input duration-200 select-none text-left"
                            >
                                <img
                                    className="w-10 h-14 object-cover rounded-md"
                                    src={item.poster_url || "/images/not_found_poster.webp"}
                                    alt={item.title || "poster"}
                                />
                                <div className="flex flex-col overflow-hidden">
                                    <div>
                                        <span className="text-sm font-semibold">{item.title || item.original_title}</span>
                                        <span className="text-xs text-muted-foreground ml-1">{item.release_year}</span>
                                    </div>
                                    {item.title && <span className="text-xs text-muted-foreground italic">{item.original_title}</span>}
                                </div>
                            </div>)}</ScrollArea>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};