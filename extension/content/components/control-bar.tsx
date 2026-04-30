import { useState } from 'preact/hooks';
import { LucideProps, Search, Settings, BadgePlus, ShieldBan, CopyCheck } from "lucide-react";
import { ESearchButtonAction, StatusIndicator } from "@/enums/control-bar";
import { renderMovieDialog, TimecodeSelect } from "./movie-dialog";
import { renderQuestionDialog } from "./question-dialog";
import { fetchBackground } from "@/utils/fetch";
import config from "@/config.json";
import { User } from "@/types/user";
import { goToTab, login } from "@/utils/navigation";
import { getUser } from "@/utils/user";
import { renderMovieCheckDialog } from "./movie-check/dialog";
import i18n from "@/lib/i18n";
import { MovieSearchTimecodesResponse } from '@/types/movie';
import { ErrorCode } from '@/enums/error-code';
import { TimecodeSegment } from '@/types/timecode';
import { updateTwitchContentClassification } from '@/utils/twitch';
import { cn } from '@/lib/utils';

interface RootProps {
    player: HTMLIFrameElement;
    movie: MovieProps;
    onTurnOffCensorship: () => void
    onCensorship: (segments: TimecodeSegment[]) => void
};

interface MovieProps {
    title: string;
    year?: number | null;
};

export const ControlBar = ({ player, movie, onTurnOffCensorship, onCensorship }: RootProps) => {
    type TLucideIcon = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
    const [isSearchButtonDisabled, setSearchButtonDisabled] = useState<boolean>(false);
    const [contentClassifications, setContentClassifications] = useState<number[]>([]);
    const [statusIndicator, setStatusIndicator] = useState<StatusIndicator>(StatusIndicator.inactive);

    const [searchButton, setSearchButton] = useState<{
        action: string
        title: string
        icon: TLucideIcon
    }>({
        action: ESearchButtonAction.searchTimecode,
        title: i18n.t('searchTimecode'),
        icon: Search
    });

    /**
     * handles the click event for the search button.
     */
    const handleClickSearch = () => {
        if (isSearchButtonDisabled) return;
        switch (searchButton.action) {
            case ESearchButtonAction.searchTimecode:
                handleSearchTimecode(movie.title);
                break;
            case ESearchButtonAction.turnOffCensorship:
                setStatusIndicator(StatusIndicator.inactive);
                setButtonAction(ESearchButtonAction.searchTimecode);
                onTurnOffCensorship();

                // Handles the removal of content classification
                if (contentClassifications.length > 0) {
                    updateTwitchContentClassification({
                        ids: contentClassifications,
                        enabled: false
                    });
                    setContentClassifications([]);
                }
                break;
            default:
                break;
        }
    };

    /**
     * handles searching for timecodes for a movie.
     * @param title Movie title.
     */
    async function handleSearchTimecode(
        title: string
    ) {
        setSearchButtonDisabled(true);
        setStatusIndicator(StatusIndicator.loader);

        const params = new URLSearchParams();
        params.set("q", encodeURIComponent(title.trim()));
        if (movie.year != null) {
            params.set("year", String(movie.year));
        }

        try {
            const data = await fetchBackground<MovieSearchTimecodesResponse>(
                `${config.baseUrl}/api/v2/movies/timecodes/search?${params.toString()}`
            );
            if (data.success) {
                renderMovieDialog({
                    data: data,
                    onSelected: handleSelectedSegment
                });
                return;
            }

            if (data?.error?.code == ErrorCode.NOT_FOUND) renderQuestionDialog({
                title: i18n.t("notFound"),
                description: i18n.t("notFoundTimecodeDescription"),
                buttons: [
                    { text: i18n.t("addTimecodes"), style: "outline", onClick: handleTimecodeEditor },
                    { text: i18n.t("close"), style: "primary" }
                ]
            });
        } catch (e) {
            if (config.debug) {
                console.error(e);
            }
        } finally {
            setStatusIndicator(StatusIndicator.inactive);
            setSearchButtonDisabled(false);
        }
    }


    /**
    * Handles selected timecodes and activates censorship.
    * @param data Selected data
    */
    async function handleSelectedSegment(data: TimecodeSelect | undefined) {
        if (!data || !player) {
            setButtonAction(ESearchButtonAction.searchTimecode);
            setStatusIndicator(StatusIndicator.inactive);
            return;
        }
        setButtonAction(ESearchButtonAction.turnOffCensorship);
        setStatusIndicator(StatusIndicator.active);
        onCensorship(data.segments);

        // Handles the addition of content classification
        if (data.contentClassifications.length == 0) return;
        const result = await updateTwitchContentClassification({
            ids: data.contentClassifications,
            enabled: true
        });

        setContentClassifications(result ? data.contentClassifications : []);
    }

    /**
     * Changes the button action and updates its text and icon.
     * @param action New action for the button.
     */
    function setButtonAction(action: ESearchButtonAction) {
        let textKey: string, icon: TLucideIcon;
        switch (action) {
            case ESearchButtonAction.searchTimecode:
                textKey = "searchTimecode";
                icon = Search;
                break;
            case ESearchButtonAction.turnOffCensorship:
                textKey = "turnOffCensorship";
                icon = ShieldBan;
                break;

            default:
                return;
        }
        setSearchButton({
            action: action,
            title: i18n.t(textKey),
            icon: icon
        })
    }

    /**
     * Opens the timecode editor if the user is authorized.
     * If the user is not authorized, a dialog window appears with a suggestion to log in.
     */
    const handleTimecodeEditor = async () => {
        const user: User | undefined = await getUser();

        if (user?.accessToken) {
            const params = new URLSearchParams();
            params.set("q", movie.title);
            if (movie.year != null) {
                params.set("y", String(movie.year));
            }
            goToTab({ to: `/timecode?${params.toString()}` });
            return;
        }
        renderQuestionDialog({
            title: i18n.t("authorizationRequired"),
            description: i18n.t("authorizationRequiredDescription"),
            buttons: [
                {
                    text: i18n.t("close"),
                    style: "outline",
                },
                {
                    text: i18n.t("login"),
                    style: "primary",
                    onClick: () => login()
                }
            ]
        });
    };

    /**
    * Opens the movie check dialog for the current movie.
    */
    const handleMovieCheck = () => renderMovieCheckDialog({
        title: movie.title,
        year: movie.year
    });

    const iconSize: number = 48;
    return (
        <div data-movietimecode="control-bar" className="mt-control-bar">
            <div className="mt-container">
                <div className={`mt-status mt-${statusIndicator}`}></div>
                <div
                    className={cn(
                        "mt-button mt-primary",
                        isSearchButtonDisabled && "mt-disabled"
                    )}
                    onClick={handleClickSearch}>
                    <searchButton.icon size={iconSize} />
                    <span>{searchButton.title}</span>
                </div>
                <div
                    data-mt-tooltip={i18n.t("movieCheck")}
                    className="mt-button mt-icon"
                    onClick={handleMovieCheck}>
                    <CopyCheck size={iconSize} />
                </div>
                <div
                    data-mt-tooltip={i18n.t("addTimecodes")}
                    className="mt-button mt-icon"
                    onClick={handleTimecodeEditor}>
                    <BadgePlus size={iconSize} />
                </div>
                <div
                    data-mt-tooltip={i18n.t("settings")}
                    className="mt-button mt-icon"
                    onClick={() => goToTab({ to: "/settings" })}>
                    <Settings size={iconSize} />
                </div>
            </div>
        </div>
    );
}
