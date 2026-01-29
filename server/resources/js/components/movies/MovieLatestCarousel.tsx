import { MovieCard } from "@/interfaces/movie";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from 'embla-carousel-autoplay'
import MovieCardItem from "./MovieCardItem"
import { ChevronRight } from "lucide-react";
import { Link, To } from "react-router-dom";

interface RootProps {
    isLoading?: boolean
    loop?: boolean
    autoplay?: boolean
    title: string
    movies: MovieCard[]
    seeMoreUrl?: To
};

export default function MovieLatestCarousel({ isLoading = false, loop = false, autoplay = false, title, movies, seeMoreUrl = undefined }: RootProps) {
    const { t } = useTranslation();
    const [emblaRef] = useEmblaCarousel(
        {
            loop: loop,
            align: 'start',
            dragFree: false
        },
        autoplay ? [Autoplay({ delay: 3000, stopOnInteraction: false })] : []
    );

    return (
        <div className="w-full mx-auto max-w-6xl">
            <div className="text-xl sm:text-3xl font-bold mb-6 px-4">{title}</div>

            <div className="relative w-full z-0">
                <div className="absolute left-0 top-0 bottom-0 w-4 z-1 pointer-events-none bg-gradient-to-r from-background to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-4 z-1 pointer-events-none bg-gradient-to-l from-background to-transparent" />
                <div className="overflow-hidden relative" ref={emblaRef}>
                    <div className="flex touch-pan-y">
                        {isLoading && Array.from({ length: 10 }).map((_, index) => <MovieCardItem isLoading key={index} className="pl-4" />)}
                        {!isLoading && movies.map((movie, index) => <MovieCardItem key={index} movie={movie} className="pl-4" />)}
                        {(isLoading || movies.length > 0) && seeMoreUrl && <div className="flex-[0_0_200px] min-w-0 pl-4">
                            <Link to={seeMoreUrl} className="group block space-y-3 cursor-pointer">
                                <div className="aspect-2/3 w-full rounded-xl bg-input/30 border border-border flex items-center justify-center">
                                    <ChevronRight className="size-32 text-muted duration-300 group-hover:scale-120 group-hover:text-foreground" />
                                </div>
                                <div className="text-sm text-foreground font-medium leading-tight truncate group-hover:text-foreground/70 transition-colors">{t('seeMore')}</div>
                            </Link>
                        </div>}

                        {movies.length === 0 && <div className="w-full text-center py-10 text-muted-foreground">{t('moviesNotFound')}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};