import { Spinner } from "@/components/ui/spinner";
import { EventType } from "@/enums/event";
import { ServerResponse } from "@/types/response";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/utils/fetch";
import { formatDate } from "@/utils/format";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import { MetaTag } from "@/components/MetaTag";

interface EventItem {
    id: number;
    type: string;
    platform: string | null;
    device_token: string | null;
    value: number | string | null;
    description: string | null;
    created_at: number;
}

interface EventLogResponse extends ServerResponse {
    current_page: number;
    last_page: number;
    events: EventItem[];
}

export default function EventsPage() {
    const { ref, inView } = useInView();
    const { t } = useTranslation();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        status,
    } = useInfiniteQuery<EventLogResponse>({
        queryKey: ["events"],
        queryFn: ({ pageParam = 1 }) => fetchApi<EventLogResponse>(`/api/dashboard/events?page=${pageParam}`),
        getNextPageParam: (pagination) => {
            return pagination.current_page < pagination.last_page
                ? pagination.current_page + 1
                : undefined;
        },
        initialPageParam: 1
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage, hasNextPage]);

    return (
        <>
            <MetaTag title={t("events")} />
            <div className="flex flex-col gap-0">
                {data?.pages.map((page) => page.events.map((event) => (
                    <div
                        key={event.id}
                        className="flex flex-col gap-2 py-3.5 border-b border-border last:border-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground/80 font-medium">{formatDate(event.created_at)}</span>
                            <EventTypeBadge type={event.type} />
                            <EventPlatformBadge platform={event.platform} />
                        </div>

                        <div className="flex flex-col gap-1 pl-0">
                            {event.description && <div className="text-sm font-medium text-foreground tracking-tight leading-relaxed">{event.description}</div>}
                            {event.device_token && <span className="text-xs font-medium text-muted-foreground/70 truncate max-w-lg" title={event.device_token}>{event.device_token}</span>}
                        </div>
                    </div>
                )))}
                <div ref={ref} className="py-8 flex justify-center">
                    {isFetchingNextPage || isLoading ? (
                        <Spinner className="mx-auto" />
                    ) : hasNextPage && (
                        <div className="h-4" /> // Empty indent for trigger
                    )}
                </div>
            </div>
        </>
    );
};



function EventTypeBadge({ type }: { type: string }) {
    const { t } = useTranslation();

    const eventTypeConfig: Partial<Record<EventType, { label: string; className: string }>> = {
        INSTALLED: {
            label: t('installed'),
            className: "bg-lime-500/10 text-lime-500 border-lime-500/20",
        },
        CHECK_MOVIE: {
            label: t('check'),
            className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        },
        TIMECODE_USED: {
            label: t('timecodes'),
            className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        },
    };

    const { label, className } = eventTypeConfig[type as EventType] ?? {
        label: type,
        className: "bg-neutral-500/10 text-neutral-500",
    };

    return (
        <span className={cn(
            "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider border select-none",
            className
        )}>
            {label}
        </span>
    );
}

function EventPlatformBadge({ platform }: { platform: string | null }) {
    if (!platform) return null;

    const config: Record<string, { label: string; className: string }> = {
        web: {
            label: 'Web',
            className: "bg-green-300/10 text-green-300 border-green-300/20",
        },
        extension: {
            label: 'Extension',
            className: "bg-lime-500/10 text-lime-500 border-lime-500/20",
        },
    };

    const { label, className } = config[platform] ?? {
        label: platform,
        className: "bg-neutral-500/10 text-neutral-500",
    };

    return (
        <span className={cn(
            "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider border select-none",
            className
        )}>
            {label}
        </span>
    );
}