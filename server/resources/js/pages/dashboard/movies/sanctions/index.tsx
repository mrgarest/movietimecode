import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner, SpinnerFullScreen } from "@/components/ui/spinner";
import { ErrorCode } from "@/enums/error-code";
import { ServerResponse } from "@/interfaces/response";
import { useUserStore } from "@/store/useUserStore";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Link } from "react-router-dom";
import { SanctionReason, SanctionType } from "@/enums/sanction";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSeo } from "@/hooks/useSeo";

interface SanctionResponse extends ServerResponse {
    sanctions: {
        username: string;
        reports: Reports[];
        movie: {
            id: number;
            release_year: number;
            title: string;
            poster_url: string | null;
        };
        approved_by: {
            id: number;
            username: string;
        } | null;
        approved_at: number | null;
        last_report_at: number | null;
    }[]
}

interface Reports {
    id: number;
    type: number;
    reason: number | null;
    comment: string | null;
    occurred_at: string | null;
    created_at: number;
}

type TFilter = 'all' | 'approved' | 'unapproved';
type ReportAction = 'delete' | 'approved';
export default function MovieSanctionPage() {
    const { i18n, t } = useTranslation();
    const { ref, inView } = useInView();
    const { logout } = useUserStore();
    const { setSeo } = useSeo();
    const queryClient = useQueryClient();
    const [isSpinnerFullScreen, setSpinnerFullScreen] = useState<boolean>(false);
    const [isReportsOpenOld, setReportsOpenOld] = useState<boolean>(false);
    const [isReportsOpen, setReportsOpen] = useState<boolean>(false);
    const [reportDialog, setReportDialog] = useState<{ id: number; action: ReportAction } | null>(null);
    const [isReportDialogOpen, setReportDialogOpen] = useState<boolean>(false);
    const [selectedReports, setSelectedReports] = useState<Reports[]>([]);
    const [filter, setFilter] = useState<TFilter>('all');
    setSeo({ title: t('sanctions') });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ['dashboard.movies.sanctions.infinite', filter],
        queryFn: ({ pageParam = 1 }) =>
            fetchApi<SanctionResponse>(`/api/dashboard/movies/sanctions?page=${pageParam}&filter=${filter}`),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.sanctions.length > 0
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
    * Handles model openings with reports.
    * @param reports 
    */
    const handleOpenReports = async (reports: Reports[]) => {
        setReportsOpen(true);
        setReportsOpenOld(true);
        setSelectedReports(reports);
    }

    /**
     * Handles button actions from report model.
     * @param id 
     * @param action 
     */
    const handleReportAction = async (id: number, action: ReportAction) => {
        setReportDialog({
            id: id,
            action: action,
        });
        setReportsOpen(false);
        setReportDialogOpen(true);
    }

    /**
     * Handling deletion and approval.
     */
    const handleReportDialog = async () => {
        if (!reportDialog) return;
        setSpinnerFullScreen(true);

        try {
            const response = await fetchApi<ServerResponse>(`/api/dashboard/movies/sanctions/${reportDialog.id}`, {
                method: reportDialog.action === "delete" ? "DELETE" : "POST"
            });

            if (response.success) {
                if (reportDialog.action === 'delete') {
                    // Updating the local list of reports for the mod
                    const updatedSelected = selectedReports.filter(r => r.id !== reportDialog.id);
                    setSelectedReports(updatedSelected);

                    // Refreshing the InfiniteQuery cache
                    queryClient.setQueryData(['dashboard.movies.sanctions.infinite', filter], (oldData: any) => {
                        if (!oldData) return oldData;

                        return {
                            ...oldData,
                            pages: oldData.pages.map((page: SanctionResponse) => ({
                                ...page,
                                // First, delete the report, then delete the sanction if it is empty.
                                sanctions: page.sanctions
                                    .map(sanction => ({
                                        ...sanction,
                                        reports: sanction.reports.filter(r => r.id !== reportDialog.id)
                                    }))
                                    .filter(sanction => sanction.reports.length > 0)
                            }))
                        };
                    });

                    if (updatedSelected.length === 0) setReportsOpen(false);
                    else setReportsOpen(isReportsOpenOld);
                    setReportsOpenOld(false);
                } else {
                    // Clear the cache for this filter and reload the data
                    await queryClient.invalidateQueries({
                        queryKey: ['dashboard.movies.sanctions.infinite', filter]
                    });
                    setReportsOpen(false);
                    setReportsOpenOld(false);
                }
            }

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
            setReportDialogOpen(false);
            setReportDialog(null);
            setSpinnerFullScreen(false);
        }
    };

    /**
     * Type-to-text conversion.
     * @param id 
     * @returns 
     */
    const getTypeText = (id: number) => {
        switch (id) {
            case SanctionType.BANNED:
                return t('ban');
            case SanctionType.STRIKE:
                return t('strike');
            default:
                return 'N/A';
        }
    };

    /**
    * Reason-to-text conversion.
    * @param id 
    * @returns 
    */
    const getReasonText = (id: number) => {
        switch (id) {
            case SanctionReason.COPYRIGHT:
                return t('copyright');
            case SanctionReason.SEXUAL_CONTENT:
                return t('sexualContent');
            case SanctionReason.OTHER:
                return t('other');
            default:
                return 'N/A';
        }
    };

    return (
        <>
            {isSpinnerFullScreen && <SpinnerFullScreen />}
            <div className="flex justify-between items-center">
                <Link to='/dashboard/movies/sanctions/add'><Button size="sm">{t("add")}</Button></Link>
                <Select
                    onValueChange={(v) => setFilter(v as TFilter)}
                    defaultValue={filter}>
                    <SelectTrigger className="w-38">
                        <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='all'>{t("all")}</SelectItem>
                        <SelectItem value='approved'>{t("approved")}</SelectItem>
                        <SelectItem value='unapproved'>{t("unapproved")}</SelectItem>
                    </SelectContent>
                </Select>
            </div >
            <div className="flex flex-col gap-0">
                {data?.pages.map((page, pageIndex) => page.sanctions.map((item, index) => (
                    <div
                        key={`${pageIndex}-${index}`}
                        className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4",
                            (index !== 0 || pageIndex !== 0) && "border-t border-border"
                        )}>
                        <img
                            className="w-20 pointer-events-none rounded-md"
                            src={item.movie.poster_url || '/images/not_found_poster.webp'} />

                        <div className="space-y-2">
                            <div>
                                <span className="text-base text-foreground font-semibold">{item.movie.title}</span> <span className="text-xs text-muted">({item.movie.release_year})</span>
                            </div>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted font-medium">
                                <div>Username</div>
                                <div>{item.username}</div>

                                {item.approved_by && <>
                                    <div>{t('typeOfSanction')}</div>
                                    <div>{getTypeText(item.reports[0].type)}</div>
                                    {item.reports[0].reason && <>
                                        <div>{t('reason')}</div>
                                        <div>{getReasonText(item.reports[0].reason)}</div>
                                    </>}
                                </>}

                                <div>{t('approvedBy')}</div>
                                {item.approved_by ? <div>{item.approved_by.username}</div>
                                    : <div className="text-red-500">{t('notYetApproved')}</div>}
                                {item.approved_by ? <>
                                    <div>{t('approvedAt')}</div>
                                    <div>{formatDate(item.approved_at)}</div>
                                </> : <>
                                    <div>{t('lastReport')}</div>
                                    <div>{formatDate(item.last_report_at)}</div>
                                </>}

                                {item.reports[0].occurred_at && <>
                                    <div>{t('sanction')}</div>
                                    <div>{DateTime.fromISO(item.reports[0].occurred_at as unknown as string)
                                        .setLocale(i18n.language)
                                        .toLocaleString(DateTime.DATE_SHORT)}</div>
                                </>}
                            </div>
                        </div>
                        {item.approved_by && <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReportAction(item.reports[0].id, "delete")}>{t('delete')}</Button>}
                        {!item.approved_by && item.reports.length > 0 && <Button
                            size="sm"
                            onClick={() => handleOpenReports(item.reports)}>{t('open')}</Button>}
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

            <Dialog open={isReportsOpen} onOpenChange={setReportsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('reports')}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-hidden -mb-6 -mr-6">
                        <ScrollArea className="w-full h-66 pr-6">
                            <div className="space-y-3 pb-6">{selectedReports.map((item, index) => <div key={index} className={cn(
                                "space-y-1",
                                index > 0 && "border-t border-border pt-3")}>
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm text-foreground font-medium">
                                    <div>{t('typeOfSanction')}</div>
                                    <div>{getTypeText(item.type)}</div>

                                    {item.reason && <>
                                        <div>{t('reason')}</div>
                                        <div>{getReasonText(item.reason)}</div>
                                    </>}

                                    {item.occurred_at && <>
                                        <div>{t('sanction')}</div>
                                        <div>{DateTime.fromISO(item.occurred_at as unknown as string)
                                            .setLocale(i18n.language)
                                            .toLocaleString(DateTime.DATE_SHORT)}</div>
                                    </>}
                                    <div>{t('created')}</div>
                                    <div>{formatDate(item.created_at)}</div>
                                </div>
                                {item.comment &&
                                    <div className="text-sm">
                                        <div className="text-foreground">{t('comment')}</div>
                                        <div className="text-muted">{item.comment}</div>
                                    </div>}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReportAction(item.id, "delete")}>{t('delete')}</Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleReportAction(item.id, "approved")}>{t('confirm')}</Button>
                                </div>
                            </div>)}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isReportDialogOpen} onOpenChange={setReportDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>{t(reportDialog?.action == 'delete' ? 'alertDelete' : 'sanctionsReportApproveAlert')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setReportsOpen(isReportsOpenOld)}>{t('no')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReportDialog}>{t('yes')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};