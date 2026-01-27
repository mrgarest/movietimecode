import { TimecodeAuthor, TimecodeAuthorsResponse, TimecodeResponse, TimecodeSegment } from "@/interfaces/timecode";
import { Button } from "./ui/button";
import { useEffect, useState } from 'preact/hooks';
import { Check, Circle, CircleCheck } from "lucide-react";
import { removeDialog, renderDialog } from "@/utils/dialog";
import { secondsToTime } from "@/utils/format";
import i18n from "@/lib/i18n";
import config from "@/config.json";
import { fetchBackground } from "@/utils/fetch";
import { MovieSearchTimecodesResponse } from "@/interfaces/movie";
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
            } finally {
                setLoading(false);
                return;
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
        <div className="mt-dialog-container mt-dialog-movie">
            <img className={cn('mt-poster', step == 1 ? 'mt-w-0' : 'mt-w-14')} src={data.poster_url || chrome.runtime.getURL("images/not_found_poster.webp")} />
            <div className="mt-content">
                <div className="mt-pr">
                    <div className="mt-title">{data.title || data.original_title}</div>
                    <div className="mt-origin-title">{data.title != null ? data.original_title + " " : ""}({data.release_year})</div>
                </div>
                <div className={cn('mt-maim', step == 0 ? "mt-no-scroll" : "mt-scrollbar mt-pr")}>
                    {step == 0 && <>
                        <div className="mt-label mt-pr">{i18n.t('selectTimecodes')}</div>
                        <div className="mt-select mt-scrollbar mt-pr">
                            {authors?.map((item, index) =>
                                <div
                                    key={index}
                                    className="mt-select-itmes"
                                    onClick={() => handleItemSelected(index, item)}>
                                    <div className="mt-select-itme-left">
                                        {selectedIndex == index
                                            ? <CircleCheck size={13} strokeWidth={3} color="var(--mt-grean)" />
                                            : <Circle size={13} strokeWidth={3} color="oklch(0.76 0 0)" />
                                        }
                                        <span className="mt-select-itme-name">{item.user?.username || 'Невідомий'}</span>
                                    </div>
                                    <div className="mt-select-itme-right">
                                        <span>{item.timecode.segment_count}</span>
                                        <span className="mt-select-itme-separator">|</span>
                                        <span>{secondsToTime(item.timecode.duration)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>}
                    {step == 1 && author && timecode && <>
                        <div className="mt-info-grid">
                            <div>{i18n.t('author')}</div>
                            <div>{author.user.username}</div>
                            <div>{i18n.t('timecodes')}</div>
                            <div>{author.timecode.segment_count}</div>
                            <div>{i18n.t('duration')}</div>
                            <div>{secondsToTime(author.timecode.duration)}</div>
                        </div>

                        {timecode?.segments && timecode?.segments.length > 0 && <>
                            <div className="mt-info-title mt-border-t">{i18n.t('timecodes')}</div>
                            <div className="mt-segments">{timecode.segments.map((segment, index) => <SegmentItem key={index} segment={segment} />)}</div>
                        </>}

                        {timecode.content_classifications && timecode.content_classifications.length > 0 && <>
                            <div className="mt-info-title mt-border-t">{i18n.t('twitchContentClassification')}</div>
                            <div className="mt-info-grid">
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
                <div className="mt-buttons mt-pr">
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
            <Check size={9} strokeWidth={8} className="mt-check" />
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
            <div className="mt-px-xs">-</div>
            <div className="mt-font-roboto">{secondsToTime(segment.end_time)}</div>
            <div className="mt-px-sm">—</div>
            <div
                onClick={handleReveal}
                className={cn(showSpoiler && 'mt-spoiler')}>{segment.description ?? 'N/A'}</div>
        </>
    )
}


let container: HTMLDivElement;
export const renderMovieDialog = (props: RootProps) => renderDialog("movie", <MovieDialog {...props} />, (e) => container = e);

const remove = () => {
    if (!container) return;
    removeDialog(container);
};