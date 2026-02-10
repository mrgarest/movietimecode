import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner, SpinnerFullScreen } from "@/components/ui/spinner";
import { ErrorCode } from "@/enums/error-code";
import { PostCommand } from "@/enums/post-command";
import { useSeo } from "@/hooks/useSeo";
import { ServerResponse } from "@/interfaces/response";
import { useUserStore } from "@/store/useUserStore";
import { ApiError, fetchApi } from "@/utils/fetch";
import { isExtensionReadyForMessages, postCommand } from "@/utils/post-command";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ellipsis, Trash2 } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";

interface TimecodeResponse extends ServerResponse {
    timecodes: {
        id: number;
        is_deleted?: boolean;
        user: {
            id: number;
            username: string;
        };
        movie: {
            id: number;
            release_year: number;
            title: string;
            poster_url: string | null;
        };
        segments_count: number;
        used_count: number;
        created_at: number;
        updated_at: number | null;
    }[]
}

type TSort = 'latest' | 'segments' | 'usage';
export default function TimecodePage() {
    const { i18n, t } = useTranslation();
    const { ref, inView } = useInView();
    const { logout } = useUserStore();
    const [isReadyForMessages, setReadyForMessages] = useState<boolean | undefined>(undefined);
    const [isSpinnerFullScreen, setSpinnerFullScreen] = useState<boolean>(false);
    const [isDeletedOpen, setDeletedOpen] = useState<boolean>(false);
    const [isExtensionNotReadyDialogOpen, setExtensionNotReadyDialogOpen] = useState<boolean>(false);
    const [deleteData, setDeleteData] = useState<{ id: number, force: boolean } | undefined>(undefined);
    const [sort, setSort] = useState<TSort>('latest');
    const { setSeo } = useSeo();
    setSeo({ title: t('timecodes') });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ['dashboard.timecodes.infinite', sort],
        queryFn: ({ pageParam = 1 }) =>
            fetchApi<TimecodeResponse>(`/api/dashboard/timecodes?page=${pageParam}&sort=${sort}`),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.timecodes.length > 0
                ? allPages.length + 1
                : undefined;
        }
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    /**
     * Format date time.
     * @param timestamp 
     * @returns 
     */
    const formatDate = (timestamp: number | null) => {
        if (!timestamp) return "N/A";

        return DateTime.fromSeconds(timestamp)
            .setLocale(i18n.language)
            .toLocaleString(DateTime.DATETIME_SHORT);
    };

    /**
     * If the extension is available, it allows you to go to the timecode editor.
     * @param id timecode id
     */
    const handleOpenInEditor = async (id: number) => {
        if (isReadyForMessages === false) {
            setExtensionNotReadyDialogOpen(true);
            return;
        }
        setSpinnerFullScreen(true);
        if (isReadyForMessages === undefined) {
            const isReady = await isExtensionReadyForMessages();
            setReadyForMessages(isReady);
            if (!isReady) {
                setSpinnerFullScreen(false);
                setExtensionNotReadyDialogOpen(true);
                return;
            }
        }

        postCommand({ command: PostCommand.OPEN_TIMECODE_EDITOR, payload: { id } });

        setSpinnerFullScreen(false);
    };

    /**
     * Trigger to call a confirmation message about deletion.
     * @param id timecode id
     * @param force force delete
     */
    const triggerDelete = async (id: number, force: boolean = false) => {
        setDeleteData({ id, force });
        setDeletedOpen(true);
    };

    /**
     * Handling the deletion of the timecode.
     */
    const handleDeleted = async () => {
        if (!deleteData) return;
        setSpinnerFullScreen(true);

        try {
            const response = await fetchApi<ServerResponse>(`/api/v2/timecodes/${deleteData.id}?force=${deleteData.force}`, { method: "DELETE" });

            if (response.success) return;

        } catch (e) {
            if (e instanceof ApiError) {
                switch (e.error?.code) {
                    case ErrorCode.ACCESS_TOKEN_INVALID:
                    case ErrorCode.PERMISSION_DENIED:
                    case ErrorCode.USER_DEACTIVATED:
                        logout();
                        break;
                }
            }
            console.error(e);
        } finally {
            setDeleteData(undefined);
            setSpinnerFullScreen(false);
        }
    };

    return (
        <>
            {isSpinnerFullScreen && <SpinnerFullScreen />}
            <div className="flex items-center">
                <Select
                    onValueChange={(v) => setSort(v as TSort)}
                    defaultValue={sort}>
                    <SelectTrigger className="w-34">
                        <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='latest'>{t("latest")}</SelectItem>
                        <SelectItem value='segments'>{t("segments")}</SelectItem>
                        <SelectItem value='usage'>{t("usage")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-0">
                {data?.pages.map((page) => page.timecodes.map((item) => (
                    <div
                        key={item.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 border-b border-border">
                        <div className="relative rounded-md overflow-hidden">
                            <img
                                className="w-20 pointer-events-none"
                                src={item.movie.poster_url || '/images/not_found_poster.webp'} />
                            {item.is_deleted && <div className="absolute top-0 left-0 right-0 bottom-0 z-[1px] flex items-center justify-center bg-black/80" >
                                <Trash2 size={48} className="text-red-500" />
                            </div>}
                        </div>

                        <div className="space-y-2">
                            <div>
                                <span className="text-base text-foreground font-semibold">{item.movie.title}</span> <span className="text-xs text-muted">({item.movie.release_year})</span>
                            </div>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted font-medium">
                                <div>{t('author')}</div>
                                <div>{item.user.username}</div>
                                <div>{t('timecodes')}</div>
                                <div>{item.segments_count}</div>
                                <div>{t('used')}</div>
                                <div>{item.used_count}</div>
                                <div>{t('created')}</div>
                                <div>{formatDate(item.created_at)}</div>
                                <div>{t('updated')}</div>
                                <div>{formatDate(item.updated_at)}</div>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Ellipsis className="cursor-pointer" /></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleOpenInEditor(item.id)}>{t('openInEditor')}</DropdownMenuItem>
                                {item.is_deleted && <DropdownMenuItem
                                    className="text-red-500"
                                    onSelect={() => triggerDelete(item.id, true)}>{t('forceDelete')}
                                </DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>
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

            <AlertDialog open={isDeletedOpen} onOpenChange={setDeletedOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('alertDelete')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('no')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleted}>{t('yes')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isExtensionNotReadyDialogOpen} onOpenChange={setExtensionNotReadyDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('extensionNotAvailable')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('extensionNotAvailableDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('close')}</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};