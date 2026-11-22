import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DateTime } from "luxon";
import { X } from "lucide-react";
import config from "config";
import { MovieSearchItem } from "@/types/movie";
import { ServerResponse } from "@/types/response";
import { SanctionReason, SanctionType } from "@/enums/sanction";
import { ErrorCode } from "@/enums/error-code";
import { fetchBackground } from "@/utils/fetch";
import { getDeviceToken } from "@/utils/user";
import i18n from "@/lib/i18n";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface RootProps {
    movie: MovieSearchItem;
    onChangeMovie: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
    onLoading: (b: boolean) => void;
}

export default function SanctionReportForm({ movie, onChangeMovie, onSuccess, onError, onLoading }: RootProps) {
    const [isSubmitting, setSubmitting] = useState<boolean>(false);
    const today = DateTime.now().toISODate() ?? undefined;

    const formSchema = z.object({
        username: z.string()
            .min(2, i18n.t("textMustBeLongerValue", { value: 2 }))
            .max(60, i18n.t("maximumLengthTextShouldNotExceedValue", { value: 60 }))
            .regex(/^[a-zA-Z0-9_]+$/, i18n.t("usernameInvalidFormat")),
        type: z.string().min(1, i18n.t("selectType")),
        reason: z.string().min(1, i18n.t("selectReason")),
        comment: z.string()
            .min(2, i18n.t("textMustBeLongerValue", { value: 2 }))
            .max(256, i18n.t("maximumLengthTextShouldNotExceedValue", { value: 256 }))
            .optional()
            .or(z.literal("")),
        occurred_at: z.string().min(1, i18n.t("selectDate")),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            comment: "",
            type: "",
            reason: "",
            occurred_at: today ?? "",
        },
    });

    /**
     * Sends the report to the server.
     * @param values - validated form values
     */
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (isSubmitting) return;
        setSubmitting(true);
        onLoading(true);
        try {
            const comment = values.comment?.trim();
            const response = await fetchBackground<ServerResponse>(`${config.baseUrl}/api/v2/movies/sanctions`, {
                method: "POST",
                body: JSON.stringify({
                    ...(movie.id ? { movie_id: movie.id } : {}),
                    tmdb_id: movie.tmdb_id,
                    device_token: await getDeviceToken(),
                    username: values.username.trim(),
                    occurred_at: values.occurred_at,
                    type: Number(values.type),
                    reason: Number(values.reason),
                    ...(comment ? { comment } : {}),
                }),
            });

            if (response?.success) {
                onSuccess();
                return;
            }

            switch (response?.error?.code) {
                case ErrorCode.DUPLICATE_ENTRY:
                    onError(i18n.t("haveAlreadyReceivedReportAboutUser"));
                    break;
                case ErrorCode.NOT_FOUND:
                    onError(i18n.t("filmNotFound"));
                    break;
                default:
                    onError(i18n.t("unknownError"));
                    break;
            }
        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
            onError(i18n.t("unknownError"));
        } finally {
            setSubmitting(false);
            onLoading(false);
        }
    }

    return (
        <>
            <div className="mt-text-xl mt-text-foreground mt-font-bold mt-pt-6 mt-pb-4 mt-px-6">{i18n.t("reportSanction")}</div>

            <Form {...form}>
                <form
                    noValidate
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-flex mt-flex-col mt-gap-4 mt-px-6 mt-pb-6 mt-overflow-auto mt-scrollbar">
                    <div className="mt-form-item">
                        <label className="mt-form-label">{i18n.t("selectMovie")}</label>
                        <div className="mt-movie-select">
                            <img
                                className="mt-movie-select-poster"
                                src={movie.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
                            <div className="mt-movie-select-info">
                                <div>
                                    <span className="mt-movie-select-title">{movie.title || movie.original_title}</span>
                                    {movie.release_year != null && <span className="mt-movie-select-year">({movie.release_year})</span>}
                                </div>
                                {movie.title != null && <div className="mt-movie-select-original">{movie.original_title}</div>}
                            </div>
                            <X onClick={onChangeMovie} className="mt-movie-select-clear" />
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{i18n.t("usernameOnWhichTheSanctionIsImposed")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="username" maxLength={60} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="occurred_at"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{i18n.t("dateOfImpositionOfTheSanction")}</FormLabel>
                                <FormControl>
                                    <Input type="date" max={today} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="mt-grid mt-grid-cols-2 mt-gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{i18n.t("typeOfSanction")}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="mt-w-full">
                                                <SelectValue placeholder={i18n.t("selectType")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={String(SanctionType.BANNED)}>{i18n.t("ban")}</SelectItem>
                                            <SelectItem value={String(SanctionType.STRIKE)}>{i18n.t("strike")}</SelectItem>
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
                                    <FormLabel>{i18n.t("reason")}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="mt-w-full">
                                                <SelectValue placeholder={i18n.t("selectReason")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={String(SanctionReason.COPYRIGHT)}>{i18n.t("copyright")}</SelectItem>
                                            <SelectItem value={String(SanctionReason.SEXUAL_CONTENT)}>{i18n.t("sexualContent")}</SelectItem>
                                            <SelectItem value={String(SanctionReason.OTHER)}>{i18n.t("other")}</SelectItem>
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
                                <FormLabel>{i18n.t("comment")}</FormLabel>
                                <FormControl>
                                    <Textarea maxLength={256} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="mt-text-xs mt-text-muted mt-leading-normal">{i18n.t("sanctionReportModerationNote")}</div>

                    <div className="mt-flex mt-justify-right">
                        <Button disabled={isSubmitting} onClick={form.handleSubmit(onSubmit)}>
                            <span>{i18n.t("send")}</span>
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
}
