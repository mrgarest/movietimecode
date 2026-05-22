import { TimecodeAuthor, TimecodeAuthorsResponse, TimecodeResponse, TimecodeSegment } from "@/types/timecode";
import { Button } from "./ui/button";
import { useEffect, useState } from 'preact/hooks';
import { Check, Circle, CircleCheck } from "lucide-react";
import { removeDialog, renderDialog } from "@/utils/dialog";
import { secondsToTime } from "@/utils/format";
import i18n from "@/lib/i18n";
import config from "@/config.json";
import { fetchBackground } from "@/utils/fetch";
import { MovieSearchTimecodesResponse } from "@/types/movie";
import { LoadingSpinner } from "./ui/loading";
import { event } from "@/utils/event";
import { EventType } from "@/enums/event";
import { cn } from "@/lib/utils";
import { TimecodeTag } from "@/enums/timecode";
import { TwitchContentClassification } from "@/enums/twitch";

export interface TimecodeSelect {
    contentClassifications: number[];
    segments: TimecodeSegment[];
}

interface RootProps {
    data: MovieSearchTimecodesResponse;
    onSelected: (data: TimecodeSelect | undefined) => void
};

const MovieDialog = ({ data, onSelected }: RootProps) => {
    const [isLoading, setLoading] = useState<boolean>(false);
    const [step, setStep] = useState<number>(0);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [author, setAuthor] = useState<TimecodeAuthor | null>(null);
    const [authors, setAuthors] = useState<TimecodeAuthor[] | null>([]);
    const [timecode, setTimecode] = useState<TimecodeResponse | null>(null);

    useEffect(() => {
        // Fetch authors when the component is mounted
        const getAuthors = async () => {
            setLoading(true);
            try {
                const response = await fetchBackground<TimecodeAuthorsResponse>(
                    `${config.baseUrl}/api/v2/movies/${data.id}/timecodes/authors`
                );
                if (response.success) {
                    setAuthors(response.authors || []);

                    // Set the first author as selected by default
                    if (!author && response.authors && response.authors.length > 0) {
                        setAuthor(response.authors[0]);
                        setSelectedIndex(0);
                    }
                }
            } catch (e) {
                if (config.debug) {
                    console.error(e);
                }
            } finally {
                setLoading(false);
            }
        };
        getAuthors();
    }, []);

    /**
    * Selects a timecode item and updates the selected index.
    * @param index - index of selected item
    * @param author - selected timecode author
    */
    const handleItemSelected = (index: number, author: TimecodeAuthor) => {
        setSelectedIndex(index);
        setAuthor(author);
    };

    /**
     * Handles pressing the back action button.
     */
    async function handleBack() {
        if (step == 1) {
            setStep(0);
            return;
        }
        remove();
    }

    /**
     * Handles pressing the next action button.
     */
    async function handleNext() {
        if (!author) {
            return;
        }
        setLoading(true);
        if (step == 0) {
            try {
                if (author.timecode.id === timecode?.id) {
                    setStep(1);
                    return;
                }
                const data = await fetchBackground<TimecodeResponse>(
                    `${config.baseUrl}/api/v2/timecodes/${author.timecode.id}`
                );
                if (data.success) {
                    setTimecode(data);
                    setStep(1);
                    return;
                }
            } catch (e) {
                if (config.debug) {
                    console.error(e);
                }
                return;
            } finally {
                setLoading(false);
            }
        }

        if (step == 1 && timecode) {
            onSelected({
                contentClassifications: timecode.content_classifications ?? [],
                segments: timecode.segments ?? []
            });
            event(EventType.TIMECODE_USED, author.timecode.id);
            setLoading(false);
            remove();
            return;
        }
        onSelected(undefined);
    };


    return (
        <div className="mt-items-start mt-w-xl mt-h-96 mt-grid mt-grid-cols-auto-1fr mt-relative mt-m-4 mt-h-calc_100vh_2rem mt-rounded-2xl mt-bg-background mt-border mt-border-border mt-overflow-hidden">
            <img className={cn(
                'mt-size-full mt-object-cover mt-object-center mt-border-border mt-pointer-events-none mt-select-none mt-duration-300',
                step == 1 ? 'mt-max-w-0' : 'mt-max-w-56 mt-border-r'
            )} src={data.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
            <div className="mt-overflow-hidden mt-grid mt-grid-rows-auto-1fr-auto mt-pt-6 mt-pl-6 mt-pb-4 mt-size-full mt-gap-4">
                <div className="mt-pr-6">
                    <div className="mt-text-xl mt-text-foreground mt-font-bold">{data.title || data.original_title}</div>
                    <div className="mt-text-xs mt-text-muted mt-font-medium mt-mt-1">{data.title != null ? data.original_title + " " : ""}({data.release_year})</div>
                </div>
                <div className={cn(
                    'mt-flex mt-flex-col mt-gap-2',
                    step == 0 ? "mt-overflow-hidden" : " mt-overflow-auto mt-pr-6"
                )}>
                    {step == 0 && <>
                        <div className="mt-text-xs mt-text-foreground mt-font-semibold mt-pr-6">{i18n.t('selectTimecodes')}</div>
                        <div className="mt-flex mt-flex-col mt-flex-nowrap mt-gap-2 mt-overflow-auto mt-pr-6">
                            {authors?.map((item, index) =>
                                <div
                                    key={index}
                                    className="mt-select-itmes mt-flex mt-items-center mt-duration-300 mt-bg-secondary mt-text-foreground mt-border mt-border-border mt-rounded-lg mt-h-8 mt-gap-4 mt-px-2 mt-text-xs mt-font-medium mt-justify-between mt-select-none mt-cursor-pointer mt-hover:opacity-60"
                                    onClick={() => handleItemSelected(index, item)}>
                                    <div className="mt-flex mt-items-center mt-justify-start mt-gap-2">
                                        {selectedIndex == index
                                            ? <CircleCheck size={13} strokeWidth={3} className="mt-text-green" />
                                            : <Circle size={13} strokeWidth={3} className="mt-text-foreground" />
                                        }
                                        <div className="mt-select-itme-name">{item.user?.username || 'Невідомий'}</div>
                                    </div>
                                    <div className="mt-flex mt-items-center mt-justify-right mt-gap-1 mt-text-10 mt-font-bold">
                                        <div>{item.timecode.segment_count}</div>
                                        <div className="mt-w-0.2 mt-h-2.5 mt-rounded-full mt-bg-muted" />
                                        <div>{secondsToTime(item.timecode.duration)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>}
                    {step == 1 && author && timecode && <>
                        <div className="mt-info-grid mt-grid mt-grid mt-grid-cols-auto-1fr mt-gap-x-3 mt-gap-y-2 mt-text-sm mt-text-foreground">
                            <div>{i18n.t('author')}</div>
                            <div>{author.user.username}</div>
                            <div>{i18n.t(author.timecode.segment_count > 0 ? 'timecodes_many' : 'timecodes')}</div>
                            <div>{author.timecode.segment_count}</div>
                            <div>{i18n.t('duration')}</div>
                            <div>{secondsToTime(author.timecode.duration)}</div>
                        </div>

                        {timecode?.segments && timecode?.segments.length > 0 && <>
                            <div className="mt-text-base mt-font-bold mt-text-foreground mt-border-t mt-border-border mt-mt-2 mt-mb-1 mt-pt-2">{i18n.t('timecodes')}</div>
                            <div className="mt-grid mt-grid-cols-4auto-1fr mt-gap-y-2 mt-text-sm">{timecode.segments.map((segment, index) => <SegmentItem key={index} segment={segment} />)}</div>
                        </>}

                        {timecode.content_classifications && timecode.content_classifications.length > 0 && <>
                            <div className="mt-text-base mt-font-bold mt-text-foreground mt-border-t mt-border-border mt-mt-2 mt-mb-1 mt-pt-2">{i18n.t('twitchContentClassification')}</div>
                            <div className="mt-info-grid mt-grid mt-grid mt-grid-cols-auto-1fr mt-gap-2 mt-text-sm mt-text-foreground">
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.POLITICS_AND_SENSITIVE_SOCIAL_ISSUES}
                                    localeKey='politicsAndSensitiveSocialIssues'
                                />
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.DRUGS_INTOXICATION_TOBACCO}
                                    localeKey='drugsIntoxicationTobacco'
                                />
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.GAMBLING}
                                    localeKey='gambling'
                                />
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.PROFANITY_VULGARITY}
                                    localeKey='profanityVulgarity'
                                />
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.SEXUAL_THEMES}
                                    localeKey='sexualThemes'
                                />
                                <ContentClassificationItem
                                    contentClassifications={timecode.content_classifications}
                                    type={TwitchContentClassification.VIOLENT_GRAPHIC}
                                    localeKey='violentGraphic'
                                />
                            </div>
                        </>}
                    </>}
                </div>
                <div className="mt-flex mt-justify-right mt-gap-2 mt-pr-6">
                    <Button
                        style="outline"
                        text={i18n.t(step == 1 ? 'back' : 'cancel')}
                        onClick={handleBack}
                    />
                    <Button
                        text={i18n.t(step == 1 ? 'apply' : 'next')}
                        onClick={handleNext}
                    />
                </div>
            </div>
            <LoadingSpinner isLoading={isLoading} dark={true} />
        </div>
    )
};

/**
 * Content classification component.
 */
const ContentClassificationItem = ({
    contentClassifications,
    type,
    localeKey
}: {
    contentClassifications: number[],
    type: TwitchContentClassification,
    localeKey: string
}) => {
    if (!contentClassifications.includes(type)) return null;

    return (
        <>
            <Check size={13} strokeWidth={8} className="mt-bg-foreground mt-text-background mt-leading-normal mt-rounded-sm mt-p-0.5" />
            <div>{i18n.t('twitchContentClassificationOptions.' + localeKey)}</div>
        </>
    );
};

/**
 * Component with time and timecode description.
 */
const SegmentItem = ({ segment }: { segment: TimecodeSegment }) => {
    const [isRevealed, setIsRevealed] = useState<boolean>(false);

    const isSensitive = segment.description && Number(segment.tag_id) === TimecodeTag.SENSITIVE_EXPRESSIONS;

    // Determine whether to show the spoiler (must be sensitive and not yet opened)
    const showSpoiler = isSensitive && !isRevealed;

    /**
    * Handles hiding spoilers and displaying text.
    */
    const handleReveal = () => {
        if (isSensitive && !isRevealed) {
            setIsRevealed(true);
        }
    };

    return (
        <>
            <div className="mt-font-roboto">{secondsToTime(segment.start_time)}</div>
            <div className="mt-px-1">-</div>
            <div className="mt-font-roboto">{secondsToTime(segment.end_time)}</div>
            <div className="mt-px-1">—</div>
            <div
                onClick={handleReveal}
                className={cn(
                    "mt-text-foreground mt-leading-normal",
                    showSpoiler && 'mt-bg-foreground mt-animate-spoiler mt-rounded-sm mt-cursor-pointer')}>{segment.description ?? 'N/A'}</div>
        </>
    )
}


let container: HTMLDivElement;
export const renderMovieDialog = (props: RootProps) => renderDialog("movie", <MovieDialog {...props} />, (e) => container = e);

const remove = () => {
    if (!container) return;
    removeDialog(container);
};