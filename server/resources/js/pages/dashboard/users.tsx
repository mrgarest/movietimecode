import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ServerResponse } from "@/types/response";
import { fetchApi } from "@/utils/fetch";
import { formatDate } from "@/utils/format";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Ellipsis, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";

interface UserListItem {
    id: number;
    is_deleted: boolean;
    username: string;
    picture: string | null;
    created_at: number;
    last_login_at: number | null;
}

interface UsersPaginatedResponse extends ServerResponse {
    current_page: number;
    last_page: number;
    users: UserListItem[];
}

export default function UsersPage() {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const { ref, inView } = useInView();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        status,
    } = useInfiniteQuery<UsersPaginatedResponse>({
        queryKey: ["users", searchTerm],
        queryFn: ({ pageParam = 1 }) => fetchApi<UsersPaginatedResponse>(`/api/dashboard/users?page=${pageParam}${searchTerm.length > 2 ? '&q=' + searchTerm : ''}`),
        getNextPageParam: (pagination) => {
            return pagination.current_page < pagination.last_page
                ? pagination.current_page + 1
                : undefined;
        },
        initialPageParam: 1,
        enabled: searchTerm.length === 0 || searchTerm.length >= 2
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage, hasNextPage]);


    return (
        <>
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    placeholder={t('search')}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background"
                />
            </div>
            <div className="flex flex-col gap-0">
                {data?.pages.map((page) => page.users.map((user) => (
                    <div
                        key={user.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 border-b border-border">
                        <div className="relative rounded-md overflow-hidden">
                            <img
                                className="size-14 select-none"
                                src={user.picture || '/images/not_found_poster.webp'} />
                            {user.is_deleted && <div className="absolute top-0 left-0 right-0 bottom-0 z-[1px] flex items-center justify-center bg-black/80"><Trash2 size={48} className="text-red-500" /></div>}
                        </div>

                        <div className="space-y-1">
                            <div className="text-sm text-foreground font-semibold">{user.username}</div>
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground font-medium">
                                <div>ID</div>
                                <div>{user.id}</div>
                                <div>{t('created')}</div>
                                <div>{formatDate(user.created_at)}</div>
                                <div>{t('lastLogin')}</div>
                                <div>{formatDate(user.last_login_at)}</div>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Ellipsis className="cursor-pointer text-muted-foreground hover:text-foreground duration-300" /></DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem><a href={`https://www.twitch.tv/${user.username}`} target="_blank" rel="noopener noreferrer">{t('openOnTwitch')}</a></DropdownMenuItem>
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
        </>
    );
};