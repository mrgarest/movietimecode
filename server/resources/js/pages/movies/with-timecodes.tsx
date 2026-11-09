import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { fetchApi } from '@/utils/fetch';
import { MovieGenre, MovieListFilters, MovieListResponse, MovieYearRange } from '@/types/movie';
import MovieCardItem from '@/components/movies/MovieCardItem';
import { MetaTag } from '@/components/MetaTag';
import { router } from '@inertiajs/react';
import { filtersToQuery, MovieListActiveFilters, MovieListFilterSheet, MovieListSortMenu, normalizeFilters } from '@/components/movies/MovieListFilters';

interface RootProps {
    movies: MovieListResponse
    filters: MovieListFilters
    selectedGenres: MovieGenre[]
    genres: MovieGenre[]
    yearRange: MovieYearRange
}

export default function MovieWithTimecodesPage({ movies, filters, selectedGenres, genres, yearRange }: RootProps) {
    const { t } = useTranslation();
    const { ref, inView } = useInView();

    /**
     * Changes the filters without a server request:
     * updates the URL and props on the client, the movies are loaded via the API.
     */
    const changeFilters = (next: MovieListFilters) => {
        const normalized = normalizeFilters(next);
        const query = filtersToQuery(normalized);
        const nextSelectedGenres = normalized.genres
            .map(slug => genres.find(g => g.slug === slug) ?? selectedGenres.find(g => g.slug === slug))
            .filter((g): g is MovieGenre => !!g);

        router.push({
            url: query ? `/movies/timecodes?${query}` : '/movies/timecodes',
            props: (props) => ({ ...props, filters: normalized, selectedGenres: nextSelectedGenres }),
            preserveScroll: true,
            preserveState: true,
        });
    };

    const query = filtersToQuery(filters);

    // The server-rendered movies only match the filters from the first load
    const [initialQuery] = useState(query);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery<MovieListResponse>({
        queryKey: ['movies-with-timecodes', query],
        queryFn: ({ pageParam = 1 }) =>
            fetchApi<MovieListResponse>(`/api/movies/timecodes?page=${pageParam}${query ? `&${query}` : ''}`),
        getNextPageParam: (lastPage) =>
            lastPage.current_page < lastPage.last_page
                ? lastPage.current_page + 1
                : undefined,
        initialPageParam: 1,
        initialData: query === initialQuery
            ? { pages: [movies], pageParams: [1] }
            : undefined,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allMovies = data?.pages.flatMap(page => page.items ?? []) ?? [];
    const genreNames = selectedGenres.map(g => g.name).join(', ');

    return (
        <>
            <MetaTag
                title={genreNames
                    ? t('seoTitleMoviesWithTimecodesGenre', { genre: genreNames })
                    : t('seoTitleMoviesWithTimecodes')}
                description={genreNames
                    ? t('seoDescriptionMoviesWithTimecodesGenre', { genre: genreNames })
                    : t('seoDescriptionMoviesWithTimecodes')}
                noIndex={query !== ''}
                noFollow={false}
            />
            <div className="w-full max-w-6xl mx-auto px-4">
                <div className="flex items-start gap-4 mb-6">
                    <MovieListActiveFilters
                        filters={filters}
                        selectedGenres={selectedGenres}
                        onChange={changeFilters}
                    />
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3 ml-auto">
                        <MovieListSortMenu
                            sort={filters.sort}
                            onChange={(sort) => changeFilters({ ...filters, sort })}
                        />
                        <MovieListFilterSheet
                            filters={filters}
                            genres={genres}
                            yearRange={yearRange}
                            onApply={changeFilters}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {allMovies.map((movie) => <MovieCardItem key={movie.tmdb_id} movie={movie} />)}
                    {isLoading && Array.from({ length: 20 }).map((_, i) => <MovieCardItem isLoading key={i} />)}
                </div>

                {!isLoading && !allMovies.length && <div className="py-16 text-center text-sm text-muted-foreground">
                    {t('moviesNotFoundByFilters')}
                </div>}

                <div ref={ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                    {isFetchingNextPage && Array.from({ length: 5 }).map((_, i) => <MovieCardItem isLoading key={i} />)}
                </div>
            </div>
        </>
    );
}
