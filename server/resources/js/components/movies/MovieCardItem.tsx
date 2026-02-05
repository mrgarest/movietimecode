import { MovieCard } from "@/interfaces/movie";
import { Link } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";

interface RootProps {
    className?: string;
    isLoading?: boolean
    movie?: MovieCard
};

export default function MovieCardItem({ className = undefined, isLoading = false, movie = undefined }: RootProps) {
    return (
        <div
            className={cn("flex-[0_0_200px] min-w-0 select-none", isLoading && "space-y-3", className)}>
            {!isLoading && movie ? <Link to={`/movies/${movie.tmdb_id}`} className="group block space-y-3 cursor-pointer">
                <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border">
                    <img
                        src={movie.poster_url || "/images/not_found_poster.webp"}
                        alt={movie.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 bg-accent"
                    />
                    <div className="absolute top-2 right-2 flex items-end gap-1">
                        {movie.rating_imdb && <Badge>{movie.rating_imdb}</Badge>}
                        {movie.release_year && <Badge>{movie.release_year}</Badge>}
                    </div>
                </div>
                <h3 className="text-sm text-foreground font-medium leading-tight truncate group-hover:text-foreground/70 transition-colors">{movie.title}</h3>
            </Link> : <>
                <Skeleton className="aspect-2/3 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
            </>}
        </div>
    )
};

const Badge = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-black/60 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">
        {children}
    </div>
);