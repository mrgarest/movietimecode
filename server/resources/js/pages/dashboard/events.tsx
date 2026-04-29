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
            <div className="flex flex-col gap-0">
                {data?.pages.map((page) => page.events.map((event) => (
                    <div
                        key={event.id}
                        className="grid grid-cols-[auto_1fr] items-center gap-4 py-4 border-b border-border">

                        <div className="flex flex-col items-start gap-1">
                            <EventTypeBadge type={event.type} />

                            <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                                {formatDate(event.created_at)}
                            </span>
                        </div>

                        <div className="flex flex-col items-start gap-1">
                            {event.description && <p className="text-sm font-medium text-foreground">{event.description}</p>}
                            <p className="text-xs font-medium text-muted-foreground">{event.device_token}</p>
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
            className: "bg-lime-500/10 text-lime-500",
        },
        CHECK_MOVIE: {
            label: t('check'),
            className: "bg-blue-500/10 text-blue-500",
        },
        TIMECODE_USED: {
            label: t('timecodes'),
            className: "bg-amber-500/10 text-amber-500",
        },
    };

    const { label, className } = eventTypeConfig[type as EventType] ?? {
        label: type,
        className: "bg-neutral-500/10 text-neutral-500",
    };

    return (
        <span className={cn(
            "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
            className
        )}>
            {label}
        </span>
    );
}