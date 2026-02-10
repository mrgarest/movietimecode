import { cn } from "@/lib/utils";
import { ApiError, fetchApi } from "@/utils/fetch";
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TimecodeAuthor, TimecodeAuthorsResponse, TimecodeResponse, TimecodeSegment } from "@/interfaces/timecode";
import { TimecodeTag } from "@/enums/timecode";
import { secondsToTime } from "@/utils/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TwitchContentClassification } from "@/enums/twitch";
import { Check } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface RootProps {
    movieId: number;
};

export default function MovieTimecode({ movieId }: RootProps) {
    const { t } = useTranslation();
    const [selectedAuthor, setSelectedAuthor] = useState<TimecodeAuthor | null>(null);

    // Timecode authors
    const { data: authorsData, isLoading: isAuthorsLoading } = useQuery<TimecodeAuthorsResponse, ApiError>({
        queryKey: ['movie-authors', movieId],
        queryFn: () => fetchApi<TimecodeAuthorsResponse>(`/api/v2/movies/${movieId}/timecodes/authors`),
        enabled: !!movieId
    });
    const authors = authorsData?.authors ?? [];

    // Effect for selecting the first author after loading the list of authors
    useEffect(() => {
        if (authors.length > 0 && selectedAuthor === null) {
            setSelectedAuthor(authors[0]);
        }
    }, [authors, selectedAuthor]);

    // Timecodes
    const { data: timecodeData, isLoading: isTimecodesLoading } = useQuery<TimecodeResponse, ApiError>({
        queryKey: ['timecodes', selectedAuthor?.timecode.id],
        queryFn: () => fetchApi<TimecodeResponse>(`/api/v2/timecodes/${selectedAuthor?.timecode.id}`),
        enabled: !!selectedAuthor?.timecode.id
    });
    const segments = timecodeData?.segments ?? [];

    return (<>
        <div className="md:hidden border-t border-border" />
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="text-lg md:text-xl text-foreground font-bold">{t('timecodes')}</div>
                {isAuthorsLoading && <Skeleton className="h-9 w-34" />}
                {!isAuthorsLoading && authors.length > 0 && <Select
                    value={selectedAuthor ? String(selectedAuthor.timecode.id) : ""}
                    onValueChange={v => setSelectedAuthor(authors.find(author => String(author.timecode.id) == v) ?? null)}
                    disabled={authors.length <= 1}>
                    <SelectTrigger className="w-34">
                        <SelectValue placeholder={t('selectAuthor')} />
                    </SelectTrigger>
                    <SelectContent>{authors.map((itme, index) => <SelectItem key={index} value={String(itme.timecode.id)}>{itme.user.username}</SelectItem>)}</SelectContent>
                </Select>}
            </div>
            {(isAuthorsLoading || isTimecodesLoading) && <Skeleton className="h-24 w-full" />}

            {!isTimecodesLoading && segments.length > 0 && <>
                <div className="grid grid-cols-[repeat(4,auto)_1fr] gap-y-1.5 text-sm select-none">{segments.map((segment, index) => <SegmentItem key={index} segment={segment} />)}</div>
                {selectedAuthor && <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-sm pt-2">
                    <div>{t('movieDuration')}</div>
                    <div>{secondsToTime(selectedAuthor?.timecode.duration)}</div>
                </div>}
            </>}

            {!isAuthorsLoading && !isTimecodesLoading && (segments.length == 0 || authors.length == 0) && <p className="text-sm text-foreground">{t(authors.length == 0 ? 'noOneHasAddedTimecodes' : 'authorNotedTimecodesNotRequired')}</p>}
        </div>

        {(isAuthorsLoading || isTimecodesLoading) && <div className="space-y-2">
            <Skeleton className="h-9 w-34" />
            <Skeleton className="h-24" />
        </div>}
        {!isTimecodesLoading && timecodeData && timecodeData.content_classifications && timecodeData.content_classifications.length > 0 && <>
            <div className="border-t border-border" />
            <div className="space-y-2">
                <div className="text-lg md:text-xl text-foreground font-bold">{t('twitchContentClassification')}</div>
                <div className="text-sm grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5">
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.POLITICS_AND_SENSITIVE_SOCIAL_ISSUES}
                        localeKey='politicsAndSensitiveSocialIssues'
                    />
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.DRUGS_INTOXICATION_TOBACCO}
                        localeKey='drugsIntoxicationTobacco'
                    />
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.GAMBLING}
                        localeKey='gambling'
                    />
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.PROFANITY_VULGARITY}
                        localeKey='profanityVulgarity'
                    />
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.SEXUAL_THEMES}
                        localeKey='sexualThemes'
                    />
                    <ContentClassificationItem
                        contentClassifications={timecodeData.content_classifications}
                        type={TwitchContentClassification.VIOLENT_GRAPHIC}
                        localeKey='violentGraphic'
                    />
                </div>
            </div>
        </>}
    </>);
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
            <div className="font-roboto">{secondsToTime(segment.start_time)}</div>
            <div className="px-1">-</div>
            <div className="font-roboto">{secondsToTime(segment.end_time)}</div>
            <div className="px-2">—</div>
            <div
                onClick={handleReveal}
                className={cn(showSpoiler && 'bg-foreground text-foreground animate-pulse rounded-sm cursor-pointer w-max')}>{segment.description ?? 'N/A'}</div>
        </>
    )
}


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
    const { t } = useTranslation();
    if (!contentClassifications.includes(type)) return null;

    return (
        <>
            <div>
                <Check size={13} strokeWidth={8} className="text-background bg-foreground rounded-xs p-0.5" />
            </div>
            <div>{t('twitchContentClassificationOptions.' + localeKey)}</div>
        </>
    );
};
