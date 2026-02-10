import MovieLatestCarousel from "@/components/movies/MovieLatestCarousel";
import MovieSearch from "@/components/movies/MovieSearch";
import { useSeo } from "@/hooks/useSeo";
import { MovieLatestResponse, MovieSearchItem } from "@/interfaces/movie";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setSeo } = useSeo();
    setSeo({
        title: t('seoTitle'),
        description: t('seoDescription')
    });

    // Request for the latest movies
    const { data, isLoading, isError, error } = useQuery<MovieLatestResponse, ApiError>({
        queryKey: ['movies-latest'],
        queryFn: () => fetchApi<MovieLatestResponse>('/api/movies/latest'),
        staleTime: 1000 * 60 * 5,
    });

    /**
     * Opening the movie page.
     * @param movie 
     */
    const handleMovieSelected = (movie: MovieSearchItem) => navigate(`/movies/${movie.tmdb_id}`, {
        state: { fromSearch: true }
    });

    return (<>
        <div className="pt-15 pb-20 px-4 mx-auto">
            <div className="size-24 relative mx-auto select-none pointer-events-none">
                <img src="/images/icon.gif" className="size-full rounded-full absolute z-1" />
                <div className="size-18 bg-[#598e3f] blur-xl rounded-full absolute z-0 -left-1 -bottom-2 opacity-45" />
            </div>
            <h1 className="text-5xl min-[370px]:text-6xl min-[420px]:text-7xl text-center font-nunito font-extrabold mt-6 mb-3 text-shadow-lg/40  text-shadow-white/30 flex flex-col sm:flex-row sm:gap-4"><span>Movie</span><span>Timecode</span></h1>
            <p className="max-w-lg mx-auto text-center text-xs sm:text-sm font-normal text-white/70 text-shadow-lg/20  text-shadow-white/20">{t('seoDescription')}</p>
            <MovieSearch
                inputSize="lg"
                className="max-w-md mx-auto my-5"
                onSelected={handleMovieSelected}
                placeholder={t('enterMovieTitleToCheckIt')} />
            <div className="mt-5 flex justify-center">
                <a href="https://chromewebstore.google.com/detail/oicfghfgplgplodmidellkbfoachacjb?utm_source=movietimecod" target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 items-center bg-white shadow-xl/20 shadow-foreground/50 px-3 py-1.5 rounded-lg hover:opacity-80 duration-300 select-none">
                    <img
                        className="size-8 pointer-events-none"
                        src="/images/google-chrome-web-store_icon.svg" />
                    <div className="pointer-events-none">
                        <div className="text-sm text-black/80 font-bold">{t("download")}</div>
                        <div className="text-xs text-black/60 font-medium">Chrome Web Store</div>
                    </div>
                </a>
            </div>
        </div>
        <div className="space-y-10 md:space-y-16 overflow-hidden">
            <MovieLatestCarousel
                loop
                autoplay
                isLoading={isLoading}
                title={t('latestCheckedMovies')}
                movies={data?.checked ?? []} />
            <MovieLatestCarousel
                seeMoreUrl="/movies/timecodes"
                isLoading={isLoading}
                title={t('latestAddedTimecodes')}
                movies={data?.timecodes ?? []} />
        </div>
    </>);
};