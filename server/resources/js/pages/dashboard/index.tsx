import { Tile } from "@/components/ui/tile";
import { useSeo } from "@/hooks/useSeo";
import { ServerResponse } from "@/interfaces/response";
import { fetchApi } from "@/utils/fetch";
import { useQuery } from "@tanstack/react-query";
import { ClockFading, Film, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DashboardStats extends ServerResponse {
    movie_count: number;
    timecode_count: number;
    user_count: number;
}

export default function DashboardPage() {
    const { t } = useTranslation();
    const { setSeo } = useSeo();
    setSeo({ title: 'Dashboard' });

    const { data: stats, isLoading, isError, error } = useQuery({
        queryKey: ['dashboard.statistics'],
        queryFn: () => fetchApi<DashboardStats>('/api/dashboard/statistics'),
        staleTime: 1000 * 60 * 5
    });

    return (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 gap-4">
            <Tile isSkeleton={isLoading} ico={Film} title={t('movies')} value={stats?.movie_count?.toString() ?? "N/A"} />
            <Tile isSkeleton={isLoading} ico={ClockFading} title={t('timecodes')} value={stats?.timecode_count?.toString() ?? "N/A"} />
            <Tile isSkeleton={isLoading} ico={UsersRound} title={t('users')} value={stats?.user_count?.toString() ?? "N/A"} />
        </div>
    );
};