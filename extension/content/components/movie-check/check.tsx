import { ImdbContentRating, MovieCheckResponse, MovieCheckCompany, MovieSearchItem } from "@/interfaces/movie";
import { useEffect, useState } from "preact/hooks";
import config from "config";
import { fetchBackground } from "@/utils/fetch";
import { ImdbContentRatingId } from "@/enums/imdb";
import i18n from "@/lib/i18n";
import { event } from "@/utils/event";
import { EventType } from "@/enums/event";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon"
import { Copy } from "lucide-react";
import { copy } from "@/utils/helpers";

interface RootProps {
    movie: MovieSearchItem;
    onLoading: (b: boolean) => void;
    onError: (msg: string) => void;
}

export default function Check({ movie, onLoading, onError }: RootProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [movieCheck, setMovieCheck] = useState<MovieCheckResponse | undefined>(undefined);

    /**
     * Initialize movie check data from API.
     * @param movie - movie object
     */
    const initCheck = async (movie: MovieSearchItem) => {
        if (isLoading) return;
        onLoading(true);
        setIsLoading(true);
        try {
            const response = await fetchBackground<MovieCheckResponse>(`${config.baseUrl}/api/v2/movies/${movie.tmdb_id}/check`);
            if (response.success) {
                setMovieCheck(response);
                event(EventType.CHECK_MOVIE, response.id);
            } else onError(i18n.t("checkFailed"));
        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
            onError(i18n.t("unknownError"));
        }

        setIsLoading(false);
        onLoading(false);
    };

    // Run initCheck when movie changes.
    useEffect(() => {
        initCheck(movie);
    }, [movie]);

    if (!movieCheck) return <></>;

    return (
        <>
            <div className="mt-movie-header mt-movie-item">
                <img
                    className="mt-poster"
                    src={movie.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
                <div className="mt-info">
                    <span className="mt-title">{movie.title ? movie.title : movie.original_title}</span>
                    {movie.title != null && <h2 className="mt-sub-title">{movie.original_title}</h2>}
                </div>
                <Copy onClick={() => copy(`${config.baseUrl}/movies/${movie.tmdb_id}`)} strokeWidth={2.5} className="mt-button-ico" />
            </div>
            <div className="mt-check mt-scrollbar">
                <div className="mt-info-grid">
                    <div>{i18n.t("releaseDate")}</div>
                    <div className={cn(movieCheck.release?.hazard == true && "mt-text-destructive")}>{movieCheck.release ?
                        DateTime.fromISO(movieCheck.release.release_date)
                            .setLocale(i18n.language)
                            .toFormat('d MMMM yyyy')
                        : 'N/A'
                    }</div>
                    <MovieCompany text={i18n.t("production")} companies={movieCheck.productions} />
                    <MovieCompany text={i18n.t("distributors")} companies={movieCheck.distributors} />
                    {movieCheck.ban_count != null && movieCheck.ban_count > 0 && <>
                        <div>{i18n.t('banCount')}</div>
                        <div className="mt-text-destructive mt-font-medium">{movieCheck.ban_count}</div>
                    </>}
                    {movieCheck.sіtrike_count != null && movieCheck.sіtrike_count > 0 && <>
                        <div>{i18n.t('sіtrikeCount')}</div>
                        <div className="mt-text-destructive mt-font-medium">{movieCheck.sіtrike_count}</div>
                    </>}
                </div>

                {movieCheck.recommendation && <div className="mt-border-t">
                    <div className="mt-info-title">{i18n.t('recommendation')}</div>
                    <div className={cn("mt-text-sm mt-font-medium",
                        movieCheck.recommendation.color == 'red' && "mt-text-destructive",
                        movieCheck.recommendation.color == 'yellow' && "mt-text-yellow",
                    )}>{movieCheck.recommendation.message}</div>
                </div>}

                {movieCheck.imdb?.content_ratings && <div className="mt-border-t">
                    <div className="mt-info-title">{i18n.t('imdbContentRating')}</div>
                    <div className="mt-info-grid">
                        <ContentRating
                            id={movieCheck.imdb.id}
                            contentId={ImdbContentRatingId.nudity}
                            contentRatings={movieCheck.imdb.content_ratings} />
                        <ContentRating
                            id={movieCheck.imdb.id}
                            contentId={ImdbContentRatingId.violence}
                            contentRatings={movieCheck.imdb.content_ratings} />
                        <ContentRating
                            id={movieCheck.imdb.id}
                            contentId={ImdbContentRatingId.profanity}
                            contentRatings={movieCheck.imdb.content_ratings} />
                        <ContentRating
                            id={movieCheck.imdb.id}
                            contentId={ImdbContentRatingId.alcohol}
                            contentRatings={movieCheck.imdb.content_ratings} />
                    </div>
                </div>}
            </div>
        </>
    )
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
                                color = 'purple';
                                break;
                            case 2:
                                color = 'destructive';
                                break;
                            case 3:
                                color = 'yellow';
                                break;
                            default:
                                color = undefined
                                break;
                        }
                        return (
                            <span key={index}>
                                {index > 0 && <>, </>}
                                {color ? (
                                    <span style={{ color: `var(--mt-${color})` }}>{item.name}</span>
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
                level = "none";
                break;
            case 1:
                level = "mild";
                color = 'grean';
                break;
            case 2:
                level = "moderate";
                color = 'yellow';
                break;
            case 3:
                level = "severe";
                color = 'destructive';
                break;
        }
    }

    const style = { style: { color: `var(--mt-${color})` } };

    return (
        <>
            <div>{i18n.t(title)}</div>
            <div {...(level && !url && color ? style : {})}>
                {!level && <>N/A</>}
                {level && !url && i18n.t(level)}
                {level && url && <a href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...(color ? style : {})}>{i18n.t(level)}</a>}
            </div>
        </>
    );
};