import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SanctionReason, SanctionType } from "@/enums/sanction";
import { DatePicker } from "../ui/date-picker";
import { useEffect, useState } from "react";
import { MovieSearchItem } from "@/interfaces/movie";
import { ApiError, fetchApi } from "@/utils/fetch";
import MovieSearch from "./MovieSearch";
import { X } from "lucide-react";
import { ServerResponse } from "@/interfaces/response";
import { ErrorCode } from "@/enums/error-code";
import { useUserStore } from "@/store/useUserStore";
import { getDeviceToken } from "@/utils/cookies";
import { DateTime } from "luxon";
import toast from "react-hot-toast";

interface RootProps {
    onSuccess: () => void;
    onLoading: (b: boolean) => void;
}

export default function MovieSanctionAddForm({ onSuccess, onLoading }: RootProps) {
    const { t } = useTranslation();
    const { logout } = useUserStore();
    const [selectedMovieError, setSelectedMovieError] = useState<boolean>(false);
    const [selectedMovie, setSelectedMovie] = useState<{
        id?: number | null;
        tmdb_id: number;
        release_year: number | null;
        title: string | null;
        original_title: string;
        poster_url: string | null;
    } | undefined>(undefined);

    const formSchema = z.object({
        username: z.string()
            .min(2, t("textMustBeLongerValue", { value: 2 }))
            .max(60, t("maximumLengthTextShouldNotExceedValue", { value: 256 }))
            .regex(/^[a-zA-Z0-9_]+$/, t("usernameInvalidFormat")),
        type: z.string().min(1, t("selectType")),
        reason: z.string().min(1, t("selectReason")),
        comment: z.string()
            .min(2, t("textMustBeLongerValue", { value: 2 }))
            .max(256, t("maximumLengthTextShouldNotExceedValue", { value: 256 }))
            .optional()
            .or(z.literal('')),
        occurred_at: z.string(t('selectDate')),
        image: z.any().optional(),
    });

    // Maximum date for the calendar
    const maxDate = new Date();
    maxDate.setHours(23, 59, 59, 999);

    // Minimum date for the calendar
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 7);
    minDate.setHours(0, 0, 0, 0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            comment: "",
            type: "",
            reason: ""
        },
    });

    /**
     * Handling the movie selection.
     * @param movie 
     */
    const handleMovieSelected = (movie: MovieSearchItem) => {
        setSelectedMovie(movie);
        setSelectedMovieError(false);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!selectedMovie) {
            setSelectedMovieError(true);
            return;
        }
        onLoading(true);
        const formData = new FormData();

        selectedMovie.id && formData.append('movie_id', selectedMovie.id.toString());
        formData.append('tmdb_id', selectedMovie.tmdb_id.toString());
        formData.append('device_token', getDeviceToken());

        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        try {
            const response = await fetchApi<ServerResponse>('/api/v2/movies/sanctions', {
                method: "POST",
                body: formData
            });

            if (response.success) {
                onLoading(false);
                onSuccess();
                return;
            }

        } catch (e) {
            if (e instanceof ApiError) {
                switch (e.error?.code) {
                    case ErrorCode.ACCESS_TOKEN_INVALID:
                    case ErrorCode.PERMISSION_DENIED:
                    case ErrorCode.USER_DEACTIVATED:
                        logout();
                        break;
                    case ErrorCode.NOT_FOUND:
                        toast.error(t("movieNotFound"));
                        break;
                    case ErrorCode.DUPLICATE_ENTRY:
                        toast.error(t("haveAlreadyReceivedReportAboutUser"), { duration: 5000 });
                        break;
                }
            }
            onLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormItem>
                    <FormLabel>{t("selectMovie")}</FormLabel>
                    <FormControl>
                        {selectedMovie ? <div
                            className="flex items-center gap-4 border border-border rounded-md bg-input/30 overflow-hidden relative">
                            {selectedMovie.poster_url != null && <img
                                className="w-12 select-none pointer-events-none"
                                src={selectedMovie.poster_url} />}
                            <div className="space-y-0.5">
                                <div>
                                    <span className="text-lg font-bold">{selectedMovie.title || selectedMovie.original_title}</span><span className="text-xs text-muted-foreground pt-1.5 pl-2">({selectedMovie.release_year})</span>
                                </div>
                                {selectedMovie.title != null && <div className="text-xs text-muted-foreground font-medium">{selectedMovie.original_title}</div>}
                            </div>
                            <X onClick={() => { setSelectedMovie(undefined) }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 size-7 p-1 text-muted-foreground z-2 cursor-pointer duration-300 hover:text-red-500" />
                        </div> : <MovieSearch withMovieId onSelected={handleMovieSelected} />}
                    </FormControl>
                    {selectedMovieError && <FormMessage>{t('youNeedSelectMovie')}</FormMessage>}
                </FormItem>

                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("usernameOnWhichTheSanctionIsImposed")}</FormLabel>
                            <FormControl>
                                <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="occurred_at"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>{t("dateOfImpositionOfTheSanction")}</FormLabel>
                            <FormControl>
                                <DatePicker
                                    value={field.value ? new Date(field.value) : undefined}
                                    // minDate={minDate}
                                    maxDate={maxDate}
                                    onChange={(date) => field.onChange(date ? DateTime.fromJSDate(date).toISODate() : undefined)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("typeOfSanction")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl className="w-full">
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectType")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={String(SanctionType.BANNED)}>{t('ban')}</SelectItem>
                                        <SelectItem value={String(SanctionType.STRIKE)}>{t('strike')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("reason")}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl className="w-full">
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("selectReason")} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={String(SanctionReason.COPYRIGHT)}>{t('copyright')}</SelectItem>
                                        <SelectItem value={String(SanctionReason.SEXUAL_CONTENT)}>{t('sexualContent')}</SelectItem>
                                        <SelectItem value={String(SanctionReason.OTHER)}>{t('other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("comment")}</FormLabel>
                            <FormControl>
                                <Textarea {...field} maxLength={256} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* <FormField
                    control={form.control}
                    name="image"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                            <FormLabel>{t("proofImage")}</FormLabel>
                            <FormControl>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => onChange(e.target.files?.[0])}
                                    {...fieldProps}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                /> */}

                <Button type="submit">{t("send")}</Button>
            </form>
        </Form>
    );
}