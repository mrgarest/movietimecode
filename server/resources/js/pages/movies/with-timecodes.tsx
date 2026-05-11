import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { fetchApi } from '@/utils/fetch';
import { MovieListResponse } from '@/types/movie';
import MovieCardItem from '@/components/movies/MovieCardItem';
import { MetaTag } from '@/components/MetaTag';

interface RootProps {
    movies: MovieListResponse
}

export default function MovieWithTimecodesPage({ movies }: RootProps) {
    const { t } = useTranslation();
    const { ref, inView } = useInView();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery<MovieListResponse>({
        queryKey: ['movies-with-timecodes'],
        queryFn: ({ pageParam = 1 }) =>
            fetchApi<MovieListResponse>(`/api/movies/timecodes?page=${pageParam}`),
        getNextPageParam: (lastPage) =>
            lastPage.current_page < lastPage.last_page
                ? lastPage.current_page + 1
                : undefined,
        initialPageParam: 1,
        initialData: {
            pages: [movies],
            pageParams: [1],
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allMovies = data?.pages.flatMap(page => page.items ?? []) ?? [];

    return (
        <>
            <MetaTag
                title={t('seoTitleMoviesWithTimecodes')}
                description={t('seoDescriptionMoviesWithTimecodes')}
            />
            <div className="w-full max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {allMovies.map((movie) => <MovieCardItem key={movie.tmdb_id} movie={movie} />)}
                    {isLoading && Array.from({ length: 20 }).map((_, i) => <MovieCardItem isLoading key={i} />)}
                </div>

                <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                    {isFetchingNextPage && Array.from({ length: 5 }).map((_, i) => <MovieCardItem isLoading key={i} />)}
                </div>
            </div>
        </>
    );
}