import { ImdbContentRating, MovieCheckCompany, MovieDetailResponse } from "@/interfaces/movie";
import { cn } from "@/lib/utils";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from "react-i18next";
import { SpinnerFullScreen } from "@/components/ui/spinner";
import { useLocation, useParams } from "react-router-dom";
import { ImdbContentRatingId } from "@/enums/imdb";
import { DateTime } from "luxon";
import NotFoundPage from "../not-found";
import MovieTimecode from "@/components/movies/MovieTimecode";
import { useEffect, useRef } from "react";
import { event } from "@/utils/event";
import { EventType } from "@/enums/event";

export default function MovieDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { i18n, t } = useTranslation();
    const location = useLocation();
    const hasSentEvent = useRef<boolean>(false);
    const fromSearch = location.state?.fromSearch;

    // Get info about the movie
    const { data: movie, isLoading: isMovieLoading } = useQuery<MovieDetailResponse, ApiError>({
        queryKey: ['movie', id],
        queryFn: () => fetchApi<MovieDetailResponse>(`/api/v2/movies/${id}`),
        enabled: !!id
    });

    useEffect(() => {
        // If the user came to this page from a search, send an event to the server
        if (movie && fromSearch && !hasSentEvent.current) {
            event(EventType.CHECK_MOVIE, movie.id);
            hasSentEvent.current = true;

            // Clear state
            window.history.replaceState({}, document.title);
        }
    }, [movie, fromSearch]);

    if (isMovieLoading) return <div><SpinnerFullScreen /></div>;

    if (!movie) return <NotFoundPage />;

    return (<>
        <title>{`${movie.title ? movie.title : movie.original_title}${movie.release?.release_date ? ` (${DateTime.fromISO(movie.release.release_date).year})` : ''} | Movie Timecode`}</title>
        <meta name="description" content={t('homePage.description')} />
        <div className="space-y-6">
            <div className="w-full max-w-4xl mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-6">
                    <img
                        className="max-md:hidden max-w-76 min-w-76 object-cover rounded-xl border border-border/50 bg-secondary"
                        src={movie.poster_url || "/images/not_found_poster.webp"}
                        alt={movie.title || "poster"}
                    />
                    <div className="md:hidden relative rounded-xl border border-border/50 overflow-hidden">
                        <img
                            className="w-full h-44 sm:h-64 object-cover"
                            src={movie.backdrop_url || "/images/not_found_poster.webp"}
                            alt={movie.title || "poster"}
                        />
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/60 z-1" />
                        <div className="absolute left-0 right-0 bottom-0 p-4 z-2">
                            <h1 className="text-lg sm:text-2xl text-white font-bold leading-snug">{movie.title ? movie.title : movie.original_title}</h1>
                            {movie.title != null && <h2 className="text-xs sm:text-sm text-white/70 font-bold leading-snug">{movie.original_title}</h2>}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="py-1 max-md:hidden">
                            <h1 className="text-2xl text-foreground font-bold">{movie.title ? movie.title : movie.original_title}</h1>
                            {movie.title != null && <h2 className="text-sm text-muted font-medium">{movie.original_title}</h2>}
                        </div>

                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            {movie.rating_imdb && <>
                                <div>IMDB</div>
                                <div>{movie.rating_imdb}</div>
                            </>}

                            <div>{t("releaseDate")}</div>
                            <div className={cn(movie.release?.hazard == true && "text-destructive")}>
                                {movie.release?.release_date
                                    ? DateTime.fromISO(movie.release.release_date)
                                        .setLocale(i18n.language)
                                        .toFormat('d MMMM yyyy')
                                    : 'N/A'}
                            </div>

                            <MovieCompany text={t("production")} companies={movie.productions} />
                            <MovieCompany text={t("distributors")} companies={movie.distributors} />

                            {movie.ban_count != null && movie.ban_count > 0 && <>
                                <div>{t('banCount')}</div>
                                <div className="text-destructive font-medium">{movie.ban_count}</div>
                            </>}
                            
                            {movie.sіtrike_count != null && movie.sіtrike_count > 0 && <>
                                <div>{t('sіtrikeCount')}</div>
                                <div className="text-destructive font-medium">{movie.sіtrike_count}</div>
                            </>}
                        </div>

                        {movie.recommendation && <>
                            <div className="border-t border-border" />
                            <div className="space-y-1.5">
                                <div className="text-lg font-bold">{t('recommendation')}</div>
                                <div className={cn("text-sm",
                                    movie.recommendation.color == 'red' && "text-destructive",
                                    movie.recommendation.color == 'yellow' && "text-yellow-500",
                                )}>{movie.recommendation.message}</div>
                            </div>
                        </>}

                        {movie.imdb?.content_ratings && <>
                            <div className="border-t border-border" />
                            <div className="space-y-1.5">
                                <div className="text-lg font-bold">{t('imdbContentRating')}</div>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                                    <ContentRating
                                        id={movie.imdb.id}
                                        contentId={ImdbContentRatingId.nudity}
                                        contentRatings={movie.imdb.content_ratings} />
                                    <ContentRating
                                        id={movie.imdb.id}
                                        contentId={ImdbContentRatingId.violence}
                                        contentRatings={movie.imdb.content_ratings} />
                                    <ContentRating
                                        id={movie.imdb.id}
                                        contentId={ImdbContentRatingId.profanity}
                                        contentRatings={movie.imdb.content_ratings} />
                                    <ContentRating
                                        id={movie.imdb.id}
                                        contentId={ImdbContentRatingId.alcohol}
                                        contentRatings={movie.imdb.content_ratings} />
                                </div>
                            </div>
                        </>}
                    </div>
                </div>
            </div>
            <div className="w-full md:max-w-2xl mx-auto px-4 space-y-4">
                <MovieTimecode movieId={movie.id} />
            </div>
        </div>
    </>);
};

/**
 * MovieCompany component
 * Renders a list of companies with hazard coloring.
 * @param text - label for companies
 * @param companies - array of companies
 */
const MovieCompany = ({
    text,
    companies = null
}: {
    text: string,
    companies: MovieCheckCompany[] | null
}) => {
    return (
        <>
            <div>{text}</div>
            <div>
                {companies != null && companies.length > 0 ? (
                    companies.map((item, index) => {
                        let color: string | undefined;
                        switch (item.hazard_level) {
                            case 1:
                                color = 'text-purple-500';
                                break;
                            case 2:
                                color = 'text-destructive';
                                break;
                            case 3:
                                color = 'text-yellow-500';
                                break;
                            default:
                                color = undefined
                                break;
                        }
                        return (
                            <span key={index}>
                                {index > 0 && <>, </>}
                                {color ? (
                                    <span className={color}>{item.name}</span>
                                ) : (
                                    item.name
                                )}
                            </span>
                        );
                    })
                ) : (
                    'N/A'
                )}
            </div>
        </>
    );
};

/**
 * Displays a movie content rating with optional IMDb link and color.
 *
 * @param id IMDb movie ID
 * @param contentId Type of rating
 * @param contentRatings Array of ratings from backend
 * @param isLink Whether to link to IMDb guide
 */
const ContentRating = ({
    id,
    contentId,
    contentRatings,
    isLink = true,
}: {
    id: string
    contentId: ImdbContentRatingId
    contentRatings: ImdbContentRating[]
    isLink?: boolean
}) => {
    const { t } = useTranslation();
    let title: string;
    let hash: string;
    switch (contentId) {
        case ImdbContentRatingId.nudity:
            hash = "nudity";
            title = "sexNudity";
            break;
        case ImdbContentRatingId.violence:
            hash = "violence";
            title = "violence";
            break;
        case ImdbContentRatingId.profanity:
            hash = "profanity";
            title = "profanity";
            break;
        case ImdbContentRatingId.alcohol:
            hash = "alcohol";
            title = "alcoholDrugsSmoking";
            break;
        default:
            return <></>;
    }

    let url: string | undefined = isLink ? `https://www.imdb.com/title/${id}/parentalguide/#${hash}` : undefined;
    let color: string | undefined = undefined;
    let level: string | undefined;

    const contentRating: ImdbContentRating | undefined = contentRatings.find(item => contentId == item.content_id);

    if (contentRating != null) {
        switch (contentRating.level) {
            case 0:
                url = undefined;
                level = 'none';
                break;
            case 1:
                level = 'mild';
                color = 'text-lime-500';
                break;
            case 2:
                level = 'moderate';
                color = 'text-yellow-500';
                break;
            case 3:
                level = 'severe';
                color = 'text-destructive';
                break;
        }
    }

    return (
        <>
            <div>{t(title)}</div>
            <div>
                {!level && <>N/A</>}
                {level && !url && t(level)}
                {level && url && <a href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(color, color && "duration-300 hover:opacity-60")}>{t(level)}</a>}
            </div>
        </>
    );
};
