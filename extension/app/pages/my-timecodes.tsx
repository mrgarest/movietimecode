import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Navigate } from "react-router-dom";
import { DateTime } from "luxon";
import { ExternalLink, Pencil } from "lucide-react";
import config from "config";
import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";
import { ErrorCode } from "@/enums/error-code";
import { UserTimecodesResponse } from "@/types/timecode";
import { fetchBackground } from "@/utils/fetch";
import { goToTab } from "@/utils/navigation";
import { settings } from "@/utils/settings";
import { getUser, logout } from "@/utils/user";
import i18n from "@/lib/i18n";

const PAGE_SIZE = 20;

/**
 * Timecodes the current user has added. Available only while logged in.
 */
export default function MyTimecodesPage() {
    // undefined while checking, null when logged out
    const [userId, setUserId] = useState<number | null | undefined>(undefined);
    const { ref, inView } = useInView();

    // Leave the page as soon as the user logs out (here or in another tab)
    useEffect(() => {
        const refresh = () => getUser().then((user) => setUserId(user?.id ?? null));
        refresh();
        return settings.onChange("user", refresh);
    }, []);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        // The user id keeps one account's list from showing up after logging in with another
        queryKey: ["user.timecodes.infinite", userId],
        queryFn: async ({ pageParam }) => {
            const url = new URL("/api/v2/user/timecodes", config.baseUrl);
            url.searchParams.set("page", String(pageParam));
            const response = await fetchBackground<UserTimecodesResponse>(url.toString());

            if (!response?.success) {
                if (response?.error?.code === ErrorCode.ACCESS_TOKEN_INVALID) await logout();
                throw new Error(response?.error?.message ?? "Failed to load timecodes");
            }
            return response.timecodes ?? [];
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => lastPage.length >= PAGE_SIZE ? allPages.length + 1 : undefined,
        enabled: typeof userId === "number",
    });

    const timecodes = data?.pages.flat() ?? [];

    // Loads the next page when the end of the list scrolls into view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const formatDate = (timestamp: number | null) => timestamp
        ? DateTime.fromSeconds(timestamp).setLocale(i18n.language || "uk").toLocaleString(DateTime.DATETIME_SHORT)
        : "N/A";

    if (userId === null) return <Navigate to="/user" replace />;

    return (
        <div className="space-y-4">
            <h1 className="text-h1">{i18n.t("myTimecodes")}</h1>

            <div className="flex flex-col">
                {timecodes.map((timecode) => {
                    const title = timecode.movie.title ?? "—";
                    return (
                        <div key={timecode.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 border-b border-border">
                            <img
                                src={timecode.movie.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")}
                                alt={title}
                                className="w-14 aspect-2/3 object-cover rounded-md bg-secondary select-none" />
                            <div className="min-w-0 space-y-2">
                                <div className="truncate" title={title}>
                                    <span className="text-base text-foreground font-semibold">{title}</span>
                                    {timecode.movie.release_year && <span className="text-xs text-muted-foreground"> ({timecode.movie.release_year})</span>}
                                </div>
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground font-medium">
                                    <div>{i18n.t("segments")}</div>
                                    <div>{timecode.segments_count}</div>
                                    <div>{i18n.t("timecodeUsedCount")}</div>
                                    <div>{timecode.used_count}</div>
                                    <div>{i18n.t("timecodeAddedAt")}</div>
                                    <div>{formatDate(timecode.created_at)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="size-8" title={i18n.t("openOnSite")}
                                    onClick={() => goToTab({ url: `${config.baseUrl}/movies/${timecode.movie.tmdb_id}` })}>
                                    <ExternalLink />
                                </Button>
                                <Button size="icon" variant="ghost" className="size-8" title={i18n.t("edit")}
                                    onClick={() => goToTab({ to: `/timecode?id=${timecode.id}` })}>
                                    <Pencil />
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {data && timecodes.length === 0 && (
                    <p className="text-sm text-muted-foreground">{i18n.t("noUserTimecodes")}</p>
                )}

                {isError && (
                    <p className="text-sm text-red-500 py-4">{i18n.t("failedLoadTimecodes")}</p>
                )}

                <div ref={ref} className="py-8 flex justify-center">
                    {(isLoading || isFetchingNextPage || userId === undefined) && <Spinner className="size-10 mx-auto" />}
                </div>
            </div>
        </div>
    );
}
