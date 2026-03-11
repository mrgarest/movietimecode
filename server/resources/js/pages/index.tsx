import AccordionFaqContent from "@/components/AccordionFaqContent";
import ChromeWebStoreBadge from "@/components/ChromeWebStoreBadge";
import MovieLatestCarousel from "@/components/movies/MovieLatestCarousel";
import MovieSearch from "@/components/movies/MovieSearch";
import { Accordion, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSeo } from "@/hooks/useSeo";
import { FaqItem } from "@/interfaces/faq";
import { MovieLatestResponse, MovieSearchItem } from "@/interfaces/movie";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

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

    const faqItems: FaqItem[] = [
        {
            value: "why-is-this-extension-needed",
            title: t('faqItems.whyIsThisExtensionNeeded.title'),
            content: [
                { type: "text", value: t('faqItems.whyIsThisExtensionNeeded.content.0') },
                { type: "text", value: t('faqItems.whyIsThisExtensionNeeded.content.1') }
            ]
        },
        {
            value: "how-to-add-timecodes",
            title: t('faqItems.howToAddTimecodes.title'),
            content: [
                { type: "text", value: t('faqItems.howToAddTimecodes.content') },
                { type: "image", src: "images/faq/add-timecodes.webp" }
            ]
        },
        {
            value: "can-i-connect-obs-or-streamlabs",
            title: t('faqItems.canConnectObsOrStreamlabs.title'),
            content: [
                { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.0') },
                { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.1') },
                { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.2') },
                { type: "image", src: "images/faq/ws-obsstudio.webp", alt: "OBS" },
                { type: "image", src: "images/faq/ws-streamlabs.webp", alt: "Streamlabs" }
            ]
        },
        {
            value: "can-i-stream-movies-on-twitch",
            title: t('faqItems.canStreamMoviesOnTwitch.title'),
            content: [
                { type: "text", value: t('faqItems.canStreamMoviesOnTwitch.content.0') },
                { type: "text", value: t('faqItems.canStreamMoviesOnTwitch.content.1') }
            ]
        },
        {
            value: "which-studios-to-avoid",
            title: t('faqItems.whichStudiosAvoid.title'),
            content: [
                { type: "text", value: t('faqItems.whichStudiosAvoid.content.0') },
                { type: "text", value: t('faqItems.whichStudiosAvoid.content.1') }
            ]
        },
        {
            value: "how-to-protect-yourself-from-ban",
            title: t('faqItems.howToProtectYourselfFromBan.title'),
            content: [
                { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.0') },
                { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.1') },
                { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.2') },
                { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.3') }
            ]
        }
    ];

    return (<>
        <div className="pt-6 sm:pt-15 pb-20 px-4 mx-auto">
            <div className="size-24 relative mx-auto select-none pointer-events-none">
                <img src="/images/icon.gif" className="size-full rounded-full absolute z-1" />
                <div className="size-18 bg-[#598e3f] blur-xl rounded-full absolute z-0 -left-1 -bottom-2 opacity-45" />
            </div>
            <h1 className="text-5xl min-[370px]:text-6xl min-[420px]:text-7xl text-center font-nunito font-extrabold mt-6 mb-3 text-shadow-lg/40 text-shadow-white/30 flex flex-col sm:flex-row sm:gap-4"><span>Movie</span><span>Timecode</span></h1>
            <p className="max-w-lg mx-auto text-center text-xs sm:text-sm font-normal text-white/70 text-shadow-lg/20  text-shadow-white/20">{t('seoDescription')}</p>
            <MovieSearch
                inputSize="lg"
                className="max-w-md mx-auto my-5"
                onSelected={handleMovieSelected}
                placeholder={t('enterMovieTitleToCheckIt')} />
            <div className="mt-5 flex justify-center"><ChromeWebStoreBadge /></div>
        </div>
        <div className="space-y-10 md:space-y-16 overflow-hidden pb-6">
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
        <div className="pt-4 sm:py-5">
            <div className="mb-2 sm:mb-4 text-xl sm:text-3xl font-bold sm:text-center px-4">{t('frequentlAskedQuestion')}</div>
            <Accordion
                type="single"
                collapsible
                className="w-full max-w-2xl mx-auto">
                {faqItems.map((item) => <AccordionItem
                    id={item.value}
                    key={item.value}
                    value={item.value}
                    className="border-b px-4 last:border-b-0">
                    <AccordionTrigger className="sm:text-base">{item.title}</AccordionTrigger>
                    <AccordionFaqContent item={item} />
                </AccordionItem>)}
            </Accordion>
            <div className="flex justify-center">
                <Link
                    to="/faq"
                    className="group relative flex items-center gap-1 py-1 text-sm font-medium tracking-tight text-muted-foreground transition-colors hover:text-foreground uppercase">
                    <span>{t('otherFaq')}</span>
                    <ChevronRight
                        strokeWidth={2.5}
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            </div>
        </div>
    </>);
};