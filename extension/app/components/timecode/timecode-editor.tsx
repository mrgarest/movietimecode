import { fetchBackground } from "@/utils/fetch";
import config from "config";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { CirclePlus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/app/components/ui/alert-dialog";
import { z } from "zod"
import { TimecodeTag } from "@/enums/timecode";
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import toast from "react-hot-toast";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/app/components/ui/textarea";
import { secondsToTimeHMS, timeToseconds } from "@/utils/format";
import { MovieSearchItem } from "@/interfaces/movie";
import { ServerResponse } from "@/interfaces/response";
import { logout } from "@/utils/user";
import i18n from "@/lib/i18n";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/app/components/ui/accordion"
import { ErrorCode } from "@/enums/error-code";
import { TimecodeEditor } from "@/interfaces/timecode";
import { TwitchContentClassification } from "@/enums/twitch";

/**
 * Form validation scheme
 */
const formSchema = z.object({
    content_classifications: z.array(z.number()),
    duration: z.object({
        hours: z.string().min(1).max(2),
        minutes: z.string().min(1).max(2),
        seconds: z.string().min(1).max(2)
    }),
    segments: z.array(
        z.object({
            id: z.number().nullable(),
            start_time: z.object({
                hours: z.string().min(1).max(2),
                minutes: z.string().min(1).max(2),
                seconds: z.string().min(1).max(2)
            }),
            end_time: z.object({
                hours: z.string().min(1).max(2),
                minutes: z.string().min(1).max(2),
                seconds: z.string().min(1).max(2)
            }),
            tag_id: z.string().min(1, {
                message: i18n.t("selectContentTag")
            }),
            description: z.string().max(200, {
                message: i18n.t("maximumLengthTimecodeDescription")
            }),
        })
    ),
})

interface RootProps {
    id: number | null;
    movieSearch: MovieSearchItem | null;
    onMessage: (b: string) => void;
    onLoading: (b: boolean) => void;
};

export default function TimecodeEditorPage({ id = null, movieSearch = null, onMessage, onLoading }: RootProps) {
    const [noTimecodes, setNoTimecodes] = useState<boolean>(false);
    const [timecodeId, setTimecodeId] = useState<number | null>(null);
    const [tmdbId, setTmdbId] = useState<number | null>(null);
    const [movie, setMovie] = useState<{
        releaseYear: number | null;
        title: string | null;
        originalTitle: string;
        posterUrl: string | null;
    } | null>(null);
    const [disabledCctIds, setDisabledCctIds] = useState<number[]>([]);

    // Default value for the data field
    const segmentValueFields = {
        id: null,
        start_time: secondsToTimeHMS(0),
        end_time: secondsToTimeHMS(0),
        tag_id: '',
        description: ''
    }

    // Form initialization
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content_classifications: [],
            duration: secondsToTimeHMS(0),
            segments: [segmentValueFields]
        },
    });

    // Array of fields for timecodes
    const { fields: segmentFields, append: appendSegment, remove: removeSegment } = useFieldArray({
        control: form.control,
        name: "segments",
    });

    // Content classification for Twitch
    const contentClassification: { id: number, label: string, disabled?: boolean }[] = [
        {
            id: TwitchContentClassification.POLITICS_AND_SENSITIVE_SOCIAL_ISSUES,
            label: "politicsAndSensitiveSocialIssues"
        },
        {
            id: TwitchContentClassification.DRUGS_INTOXICATION_TOBACCO,
            label: "drugsIntoxicationTobacco"
        },
        {
            id: TwitchContentClassification.GAMBLING,
            label: "gambling"
        },
        {
            id: TwitchContentClassification.PROFANITY_VULGARITY,
            label: "profanityVulgarity"
        },
        {
            id: TwitchContentClassification.SEXUAL_THEMES,
            label: "sexualThemes"
        },
        {
            id: TwitchContentClassification.VIOLENT_GRAPHIC,
            label: "violentGraphic"
        }
    ];

    /**
     * Get content classification for Twitch based on timecode tags.
     * @param tagId 
     */
    const getCctBasedOnTimecodeTags = (tagId: TimecodeTag): TwitchContentClassification | null => {
        switch (tagId) {
            case TimecodeTag.NUDITY:
            case TimecodeTag.SEXUAL_CONTENT_WITHOUT_NUDITY:
                return TwitchContentClassification.SEXUAL_THEMES;
            case TimecodeTag.VIOLENCE:
                return TwitchContentClassification.VIOLENT_GRAPHIC;
            case TimecodeTag.SENSITIVE_EXPRESSIONS:
                return TwitchContentClassification.PROFANITY_VULGARITY;
            case TimecodeTag.USE_DRUGS_ALCOHOL_TOBACCO:
                return TwitchContentClassification.DRUGS_INTOXICATION_TOBACCO;
            default:
                return null;
        }
    };

    const visualClassification = useMemo(() => {
        return contentClassification.map(item => ({
            ...item,
            disabled: disabledCctIds.includes(item.id)
        }));
    }, [disabledCctIds]);

    /**
     * Deletes a specific timecode segment from the form and synchronizes classifications accordingly.
     * @param index
     */
    const handleRemoveSegment = async (index: number) => {
        removeSegment(index);
        syncClassifications();
    };

    /**
     * Deletes timecodes from the database
     */
    const handleDelete = async () => {
        let success: boolean = false;
        if (timecodeId) {
            onLoading(true);
            try {
                const response = await fetchBackground<ServerResponse>(`${config.baseUrl}/api/v2/timecodes/${timecodeId}`, {
                    method: "DELETE"
                });

                if (response.success) {
                    success = true;
                } else switch (response.error?.code) {
                    case ErrorCode.ACCESS_TOKEN_INVALID:
                    case ErrorCode.PERMISSION_DENIED:
                        await logout();
                        onMessage(i18n.t("accessErrorPleaseTryAgain"));
                        break;
                    case ErrorCode.USER_DEACTIVATED:
                        onMessage(i18n.t("userDeactivated"));
                        break;
                }

            } catch (e) {
                if (config.debug) {
                    console.error(e);
                }
            }
            onLoading(false);
        }
        if (!success) {
            toast.error(i18n.t("unableToDeleteTimecode"));
            return;
        }
        onMessage(i18n.t("timecodeHasBeenDeleted"));
    };

    /**
    * Receives data from the form and sends it to the server
    */
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        let isError: boolean = false;
        let isDurationError: boolean = false;

        // Checking the length of the movie
        const duration = timeToseconds(values.duration.hours, values.duration.minutes, values.duration.seconds);
        if (1800 > duration && !isDurationError) {
            isDurationError = isError = true;
            form.setError('duration', {
                type: "manual",
                message: i18n.t("movieDurationIsTooShort"),
            });
            return;
        }

        // Checking for conflicts in time
        const currentSegmentsData = values.segments.map(s => ({
            start: timeToseconds(s.start_time.hours, s.start_time.minutes, s.start_time.seconds),
            end: timeToseconds(s.end_time.hours, s.end_time.minutes, s.end_time.seconds),
            tag_id: s.tag_id === '' ? null : Number(s.tag_id)
        }));


        const modifiedValues = {
            ...values,
            content_classifications: values.content_classifications.length > 0 ? values.content_classifications : null,
            duration: duration,
            segments: values.segments.length > 0 ? values.segments.map((tc, index) => {
                const startsecondss = timeToseconds(tc.start_time.hours, tc.start_time.minutes, tc.start_time.seconds);
                const endsecondss = timeToseconds(tc.end_time.hours, tc.end_time.minutes, tc.end_time.seconds);

                // Time validation
                if (startsecondss >= endsecondss) {
                    isError = true;
                    form.setError(`segments.${index}.start_time`, {
                        type: "manual",
                        message: i18n.t("endTimeStartTimeError"),
                    });
                }
                if (endsecondss > duration && !isDurationError) {
                    isDurationError = isError = true;
                    form.setError('duration', {
                        type: "manual",
                        message: i18n.t("durationMovieCannotExceedTimecodes"),
                    });
                }

                // Checking for conflicts with other timecodes
                for (let i = 0; i < currentSegmentsData.length; i++) {
                    if (i === index) continue;

                    const other = currentSegmentsData[i];
                    const currentTag = tc.tag_id === '' ? null : Number(tc.tag_id);

                    // Time intersection condition 
                    const isTimeOverlap = startsecondss <= other.end && endsecondss >= other.start;

                    // A conflict arises ONLY if the time overlaps AND the tags are the same.
                    const isSameAction = currentTag === other.tag_id;

                    if (isTimeOverlap && isSameAction) {
                        isError = true;
                        form.setError(`segments.${index}.start_time`, {
                            type: "manual",
                            message: i18n.t("timeCoincidesWithTimecodeIndex", { index: i + 1 }),
                        });
                        break;
                    }
                }

                const description = tc.description.trim();

                return {
                    ...tc,
                    start_time: startsecondss,
                    end_time: endsecondss,
                    tag_id: tc.tag_id == '' ? null : Number(tc.tag_id),
                    description: description == '' ? null : description
                };
            }) : null,
        };

        if (isError) return;
        onLoading(true);
        let success: boolean = false;

        try {
            const url = timecodeId ? `timecodes/${timecodeId}/editor` : `movies/${tmdbId}/timecodes/editor/new`;

            const response = await fetchBackground<ServerResponse>(`${config.baseUrl}/api/v2/${url}`, {
                method: "POST",
                body: JSON.stringify(modifiedValues)
            });

            if (response.success) {
                success = true;
            } else switch (response.error?.code) {
                case ErrorCode.ACCESS_TOKEN_INVALID:
                case ErrorCode.PERMISSION_DENIED:
                    await logout();
                    onMessage(i18n.t("accessErrorPleaseTryAgain"));
                    break;
                case ErrorCode.USER_DEACTIVATED:
                    onMessage(i18n.t("userDeactivated"));
                    break;
            }

        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
        }
        onLoading(false);

        if (!success) {
            toast.error(i18n.t("unableAddTimecode"));
            return;
        }
        onMessage(i18n.t(timecodeId ? "timecodeHasEdited" : "timecodeAdded"));
    };

    /**
     * Processor for checkbox indicating the presence of timecodes
     */
    const handleNoTimecodes = (checked: CheckedState) => {
        const b: boolean = checked === true;
        setNoTimecodes(b);
        if (b) {
            removeSegment();
            setDisabledCctIds([]);
            syncClassifications();
        } else handleAppendFields();
    };

    /**
    * Adds a new empty data form
    */
    const handleAppendFields = () => appendSegment(segmentValueFields);

    /**
    * Retrieves data about timecodes previously added by the user, if any exist.
    */
    const initEditor = async (id: number | null, movie: MovieSearchItem | null) => {
        let timecodeId = undefined;
        if (movie?.timecode_id) {
            timecodeId = movie?.timecode_id;
        } else if (id) {
            timecodeId = id;
        }

        if (!timecodeId) {
            setTmdbId(movie?.tmdb_id ?? null);
            setMovie(movie ? {
                releaseYear: movie.release_year,
                title: movie.title,
                originalTitle: movie.original_title,
                posterUrl: movie.poster_url,
            } : null);
            return;
        }
        onLoading(true);
        try {
            const response = await fetchBackground<TimecodeEditor>(`${config.baseUrl}/api/v2/timecodes/${timecodeId}/editor`);

            if (response.success) {
                setTimecodeId(response.id);
                setMovie({
                    releaseYear: response.release_year,
                    title: response.title,
                    originalTitle: response.original_title,
                    posterUrl: response.poster_url,
                });
                setNoTimecodes(response.segments?.length == 0);

                let defaultSegment: {
                    id: number | null;
                    description: string,
                    start_time: {},
                    end_time: {},
                    tag_id: string,
                }[] = [];

                const detectedCctIds: TwitchContentClassification[] = [];
                if (response?.segments) {

                    const collectId = (tagId: TimecodeTag) => {
                        const idToAdd: TwitchContentClassification | null = getCctBasedOnTimecodeTags(tagId);

                        if (idToAdd && !detectedCctIds.includes(idToAdd)) {
                            detectedCctIds.push(idToAdd);
                        }
                    };

                    response.segments.forEach(segment => {
                        collectId(segment.tag_id);

                        defaultSegment.push({
                            id: segment.id,
                            start_time: secondsToTimeHMS(segment.start_time || 0),
                            end_time: secondsToTimeHMS(segment.end_time || 0),
                            tag_id: segment.tag_id != null ? segment.tag_id + "" : '',
                            description: segment.description != null ? segment.description : ''
                        })
                    });
                }
                setDisabledCctIds(detectedCctIds);

                form.reset({
                    content_classifications: [
                        ...new Set([
                            ...(detectedCctIds || []),
                            ...(response.content_classifications || [])
                        ])
                    ],
                    duration: secondsToTimeHMS(response.duration || 0),
                    segments: defaultSegment,
                });
            } else switch (response.error?.code) {
                case ErrorCode.ACCESS_TOKEN_INVALID:
                case ErrorCode.PERMISSION_DENIED:
                    await logout();
                    onMessage(i18n.t("accessErrorPleaseTryAgain"));
                    break;
                case ErrorCode.USER_DEACTIVATED:
                    onMessage(i18n.t("userDeactivated"));
                    break;
                default:
                    onMessage(i18n.t("unknownError"));
                    break;
            }

        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
        }
        onLoading(false);
    };

    useEffect(() => {
        initEditor(id, movieSearch);
    }, [movieSearch, id]);

    /**
     * Synchronization of content classification.
     * @param segments 
     */
    const syncClassifications = (segments: any[] = form.getValues("segments")) => {
        // 1. Gather all categories that MUST be blocked (based on tags)
        const requiredIds = new Set<number>();
        segments.forEach(s => {
            const twitchId = getCctBasedOnTimecodeTags(Number(s.tag_id));
            if (twitchId !== null) {
                requiredIds.add(twitchId);
            }
        });

        const newDisabledArray = Array.from(requiredIds);

        // Update the disabled status for the UI (to lock/unlock checkboxes)
        setDisabledCctIds(newDisabledArray);

        // 3. Updating values in the form
        const currentValues = form.getValues("content_classifications") || [];

        const updatedValues = currentValues.filter(id => {
            // If this ID is still on the list of required items, leave it.
            if (newDisabledArray.includes(id)) return true;

            // If this ID was in the disabledCctIds list and is no longer there, we REMOVE it (uncheck it).
            if (disabledCctIds.includes(id)) return false;

            // Leave all others (manual user selection)
            return true;
        });

        // Combine with new mandatory items and remove duplicates
        const finalValues = Array.from(new Set([...updatedValues, ...newDisabledArray]));

        form.setValue("content_classifications", finalValues);
    };

    return (
        <>
            <Form {...form}>
                {movie && <>
                    <div
                        className="flex items-center gap-4">
                        {movie.posterUrl != null && <img
                            className="w-16 rounded-md select-none pointer-events-none border border-input"
                            src={movie.posterUrl} />}
                        <div className="space-y-1">
                            <div>
                                <span className="text-2xl font-bold">{movie.title || movie.originalTitle}</span><span className="text-xs text-muted pt-1.5 pl-2">({movie.releaseYear})</span>
                            </div>
                            {movie.title != null && <div className="text-xs text-muted font-medium">{movie.originalTitle}</div>}
                        </div>
                    </div>
                    <hr />
                </>}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <div className="space-y-2">
                        <div className="flex items-start gap-4 rounded-md">
                            {timeField(`duration`, form.control)}
                            <div className="space-y-1 leading-none">
                                <Label>{i18n.t("movieDuration")}</Label>
                                <FormDescription>{i18n.t("movieDurationDescription")}</FormDescription>
                            </div>
                        </div>
                        {form.formState.errors.duration && <FormMessage>{form.formState.errors.duration.message}</FormMessage>}
                    </div>

                    <hr />
                    <div className="flex flex-row items-start gap-3 space-y-0">
                        <Checkbox
                            id="noTimecodes"
                            checked={noTimecodes}
                            onCheckedChange={(checked) => handleNoTimecodes(checked)} />
                        <div className="space-y-1 leading-none">
                            <Label htmlFor="noTimecodes" className="cursor-pointer">{i18n.t("noTimecodesFound")}</Label>
                            <div className="text-muted-foreground text-sm">{i18n.t("noTimecodesFoundDescription")}</div>
                        </div>
                    </div>
                    {!noTimecodes && (<>
                        <hr />
                        {segmentFields.map((field, index) => (
                            <div key={field.id} className="space-y-6">
                                <div className="space-y-3">
                                    <FormLabel htmlFor={`segments.${index}`}>{i18n.t("timecodeIndex", { index: index + 1 })}</FormLabel>
                                    <div className="space-y-2">
                                        <div className={cn('grid grid-rows-2 sm:grid-rows-1 items-start gap-2', segmentFields.length > 1 ? 'grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr_auto]' : ' grid-cols-1 sm:grid-cols-[auto_1fr]')}>
                                            <div className="flex items-center gap-2 mr-2 order-1">
                                                {timeField(`segments.${index}.start_time`, form.control)}
                                                <span className="select-none">—</span>
                                                {timeField(`segments.${index}.end_time`, form.control)}
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name={`segments.${index}.tag_id`}
                                                render={({ field }) => (
                                                    <Select
                                                        onValueChange={(val) => {
                                                            // Updating a specific field
                                                            field.onChange(val);

                                                            // Get the current status of all segments
                                                            const allSegments = form.getValues("segments");

                                                            // Since only one segment has been changed, let's replace it in the array for instant recalculation.
                                                            const updatedSegments = [...allSegments];
                                                            updatedSegments[index] = { ...updatedSegments[index], tag_id: val };

                                                            syncClassifications(updatedSegments);
                                                        }}
                                                        defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full order-3 sm:order-2 max-sm:col-span-2">
                                                                <SelectValue placeholder={i18n.t("selectContentTag")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value={String(TimecodeTag.NUDITY)}>{i18n.t("nudity")}</SelectItem>
                                                            <SelectItem value={String(TimecodeTag.SEXUAL_CONTENT_WITHOUT_NUDITY)}>{i18n.t("sexualContentWithoutNudity")}</SelectItem>
                                                            <SelectItem value={String(TimecodeTag.VIOLENCE)}>{i18n.t("violence")}</SelectItem>
                                                            <SelectItem value={String(TimecodeTag.SENSITIVE_EXPRESSIONS)}>{i18n.t("sensitiveExpressions")}</SelectItem>
                                                            <SelectItem value={String(TimecodeTag.USE_DRUGS_ALCOHOL_TOBACCO)}>{i18n.t("useDrugsAlcoholTobacco")}</SelectItem>
                                                            <SelectItem value={String(TimecodeTag.PROHIBITED_SYMBOLS)}>{i18n.t("prohibitedSymbols")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />

                                            {segmentFields.length > 1 && <div className="order-2 sm:order-3"><Trash2
                                                size={36}
                                                strokeWidth={1.5}
                                                onClick={() => handleRemoveSegment(index)}
                                                className="p-2 hover:bg-red-500/15 rounded-lg duration-300 cursor-pointer text-red-500" /></div>}

                                        </div>
                                        {form.formState.errors.segments?.[index]?.start_time && <FormMessage>{form.formState.errors.segments[index].start_time.message}</FormMessage>}
                                        {form.formState.errors.segments?.[index]?.tag_id && <FormMessage>{form.formState.errors.segments[index].tag_id.message}</FormMessage>}
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name={`segments.${index}.description`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={i18n.t("descriptionOptional")}
                                                        className="resize-none"
                                                        maxLength={255}
                                                        {...field}
                                                        onChange={(e) => {
                                                            const sanitizedValue = e.target.value.replace(/[\n\rЫыЪъЁёЭэ]/g, '');
                                                            field.onChange(sanitizedValue);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {segmentFields.length - 1 > index && <hr />}
                            </div>
                        ))}
                        <div className="text-center">
                            <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => handleAppendFields()}>
                                <CirclePlus strokeWidth={2} />{i18n.t("addTimecode")}</Button>
                        </div>
                    </>)}

                    <hr />
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <FormLabel htmlFor="content_classifications">{i18n.t('twitchContentClassification')}</FormLabel>
                            <FormDescription>{i18n.t('twitchContentClassificationDescription')}</FormDescription>
                        </div>
                        <div className="space-y-3">
                            {visualClassification.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="content_classifications"
                                    render={({ field }) => (
                                        <FormItem
                                            key={item.id}
                                            className="flex flex-row items-start gap-3 space-y-0" >
                                            <FormControl>
                                                <Checkbox
                                                    disabled={item.disabled}
                                                    checked={field.value?.includes(item.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...field.value, item.id])
                                                            : field.onChange(
                                                                field.value?.filter(
                                                                    (value) => value !== item.id
                                                                )
                                                            )
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal cursor-pointer">{i18n.t('twitchContentClassificationOptions.' + item.label)}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button asChild><span>{i18n.t(timecodeId ? 'save' : 'send')}</span></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{i18n.t("confirmAction")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {i18n.t(timecodeId ? 'alertSaveChangeTimecodes' : 'alertSendTimecodes')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{i18n.t("no")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => {
                                        form.handleSubmit(onSubmit, (errors) => {
                                            if (config.debug) console.error(errors);
                                        })();
                                    }}>{i18n.t("yes")}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {timecodeId && <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant='destructive' asChild><span>{i18n.t("delete")}</span></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{i18n.t("areYouSure")}</AlertDialogTitle>
                                    <AlertDialogDescription>{i18n.t("alertDeleteTimecodes")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{i18n.t("no")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>{i18n.t("yes")}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>}
                    </div>
                </form>
            </Form>
            <div className="space-y-2 border-t mt-12 pt-6">
                <h4 className="text-2xl font-bold">FAQ</h4>
                <Accordion
                    type="single"
                    collapsible
                    className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>{i18n.t("contentTags")}</AccordionTrigger>
                        <AccordionContent className="space-y-3 text-balance">
                            <div>
                                <p><b>{i18n.t("nudity")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("nudityDescription")}</p>
                            </div>
                            <div>
                                <p><b>{i18n.t("sexualContentWithoutNudity")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("sexualContentWithoutNudityDescription")}</p>
                            </div>
                            <div>
                                <p><b>{i18n.t("violence")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("violenceDescription")}</p>
                            </div>
                            <div>
                                <p><b>{i18n.t("sensitiveExpressions")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("sensitiveExpressionsDescription")}</p>
                            </div>
                            <div>
                                <p><b>{i18n.t("useDrugsAlcoholTobacco")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("useDrugsAlcoholTobaccoDescription")}</p>
                            </div>
                            <div>
                                <p><b>{i18n.t("prohibitedSymbols")}</b></p>
                                <p className="text-muted font-medium">{i18n.t("prohibitedSymbolsDescription")}</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </>
    );
}

/**
 * Component for displaying time fields in a form
 * @param name 
 * @param control
 */
function timeField(name: string, control: any) {
    const times = ['hours', 'minutes', 'seconds'];

    /**
     * Formats a time value with a leading zero.
     */
    const formatValue = (value: string) => {
        if (!value || value == "0") return "00";
        return value.length === 1 && !value.startsWith("0") ? "0" + value : value;
    };

    /**
     * Handler for changing the input value for time.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: any, ishours: boolean) => {
        const value = e.target.value.replace(/\D/g, '');

        const limit = ishours ? 23 : 59;
        if (value && parseInt(value) > limit) {
            field.onChange(limit);
        } else {
            field.onChange(value);
        }
    };
    return (
        <div className="flex rounded-md px-1 border border-input bg-background text-base ring-offset-background md:text-sm">
            {times.map((itmeField, indexField) => (
                <div key={indexField} className="flex items-center">
                    <FormField
                        control={control}
                        name={`${name}.${itmeField}`}
                        render={({ field }) => (
                            <FormItem className="space-y-0">
                                <FormControl>
                                    <input
                                        type="text"
                                        {...field}
                                        maxLength={2}
                                        className="h-10 w-6 py-2 text-center bg-transparent outline-none"
                                        onBlur={() => field.onChange(formatValue(field.value))}
                                        onChange={(e) => handleInputChange(e, field, itmeField === 'hours')}
                                        value={field.value} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    {indexField < times.length - 1 && <span className="select-none">:</span>}
                </div>
            ))}
        </div>
    )
}