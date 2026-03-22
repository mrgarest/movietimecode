import { BlurPower, TimecodeAction, TimecodeTag } from "@/enums/timecode";
import { render } from "preact";
import config from "config";
import { ControlBar } from "./components/control-bar";
import { Settings, SettingsOBSClientNull } from "@/interfaces/settings";
import { setHeaderFonts, waitForDOMContentLoaded, waitForElement } from "@/utils/page";
import OBSClient, { OBSType, Scene } from "@/lib/obs-client";
import { renderQuestionDialog } from "./components/question-dialog";
import i18n from "@/lib/i18n";
import { playAlertSound } from "@/utils/alert";
import { censorshipActionLog } from "@/utils/log";
import ChatClient, { ChatMessage } from "@/lib/chat-client";
import { User } from "@/interfaces/user";
import { getUser } from "@/utils/user";
import { ChatbotCommand } from "@/interfaces/chatbot";
import { ChatbotAccess, ChatbotAction } from "@/enums/chatbot";
import { secondsToTime } from "@/utils/format";
import { isPlayerVisible, playerInvisible, playerMute, playerPause, playerPlay, playerSeek, playerUnmute, playerVisible } from "@/utils/player";
import { TimecodeSegment } from "@/interfaces/timecode";
import { isStreamLive, isTwitchTokenExpires, refreshTwitchToken } from "@/utils/twitch";
import { getSettings, onSettingsChanged, SettingsDefault } from "@/utils/settings";

let isHotkeyPressed: boolean = false;
let isCensorshipEnabled: boolean = false;
let isChatConnected: boolean = false;
let user: User | undefined = undefined;
let settings: Settings;
let chatClient: ChatClient | undefined = undefined;
let movie: {
    title?: string
    originalTitle?: string
    year?: number
} | undefined = undefined;

let neededOBSClient: boolean = false;
let obsClient: OBSClient | null = null;
let mainSceneOBS: Scene | null;
let obsCensorScene: Scene | null;

type Thtml = HTMLIFrameElement | undefined;
let player: Thtml = undefined;

let timecodeSegments: TimecodeSegment[] = [];

// Store all active segments for each action
const currentActionsState = new Map<TimecodeAction, TimecodeSegment | null>();

let currentMovieTime: number = 0;

// chatbot
let hasStreamLive: boolean | undefined = undefined;
let isTryRefreshTwitchToken: boolean = false;
let isChatbotCommandStoped: boolean = false;

const playerContentCensorshipEnabled: { blur: boolean; hide: boolean; obsSceneChange: boolean } = {
    blur: false,
    hide: false,
    obsSceneChange: false,
};

/**
 * Processes settings received from storage and updates corresponding variables.
 * @param settings Settings object received from storage.
 * @returns Updated settings object.
 */
const handleSettings = (s: Settings) => {
    settings = s;

    // obs
    neededOBSClient = [
        s.nudity,
        s.sexualContentWithoutNudity,
        s.eroticSounds,
        s.violence,
        s.sensitiveExpressions,
        s.useDrugsAlcoholTobacco,
        s.prohibitedSymbols
    ].includes(TimecodeAction.obsSceneChange);

    if (!neededOBSClient && obsClient) {
        obsClient.disconnect();
        obsClient = null;
    } else if (isCensorshipEnabled && neededOBSClient && !obsClient) {
        connectOBS();
    }

    // chatbot
    if (!s.chatbotEnabled && isChatConnected && chatClient) {
        chatClient.disconnect();
    }
    return settings;
};

onSettingsChanged(handleSettings);

/**
 * Determines the player and movie title based on the site domain.
 */
const uakino = {
    getPlayer: async (): Promise<HTMLIFrameElement | undefined> => {
        if (document.querySelector<HTMLDivElement>(".movie-right .players-section .playlists-ajax") == undefined) {
            return document.querySelector<HTMLIFrameElement>('.movie-right .players-section iframe#pre') ?? undefined;
        }
        try {
            return await waitForElement<HTMLIFrameElement>('.movie-right .players-section .playlists-ajax iframe#playerfr');
        } catch (e) {
            return undefined;
        }
    },
    getContainerForControlBar: (): HTMLDivElement | undefined =>
        document.querySelector<HTMLDivElement>(".movie-right .players-section .box.full-text.visible") ?? undefined,
    getTitle: (): string | null =>
        document.querySelector(".alltitle .solototle")?.textContent?.trim() ?? null,
    getOriginalTitle: (): string | null =>
        document.querySelector(".alltitle .origintitle i")?.textContent?.trim() ?? null,
    getYear: (): number | null => {
        const match = document.body.innerHTML.match(/:\/\/[a-z0-9.-]+\.[a-z0-9]+\/find\/year\/(\d+)\//i);
        const year = match?.[1] ? parseInt(match[1], 10) : null;
        return Number.isNaN(year) ? null : year;
    }
};

const playerMap: Record<
    string,
    {
        getPlayer: () => Promise<Thtml>;
        getContainerForControlBar: () => HTMLDivElement | undefined;
        getTitle: () => string | null;
        getOriginalTitle: () => string | null;
        getYear: () => number | null;
    }
> = {
    "uakino.best": uakino
};

(async () => {
    await waitForDOMContentLoaded();
    user = await getUser();
    const hostname = window.location.hostname;
    const site = playerMap[hostname];
    if (!site) {
        if (config.debug) {
            console.warn(`The website ${hostname} is not supported.`);
        }
        return;
    }

    player = await site.getPlayer();
    if (!player && config.debug) {
        console.error("Could not find player");
    }
    const containerForControlBar = site.getContainerForControlBar();

    movie = {
        title: site.getTitle() ?? undefined,
        originalTitle: site.getOriginalTitle() ?? undefined,
        year: site.getYear() ?? undefined
    }

    if (!player || !movie?.originalTitle || !containerForControlBar) return;

    handleSettings(await getSettings());

    setHeaderFonts();

    const rootControlBar = document.createElement("div");
    containerForControlBar.after(rootControlBar);

    render(<ControlBar
        player={player}
        movie={{
            title: movie.originalTitle,
            year: movie.year
        }}
        onCensorship={handleCensorship}
        onTurnOffCensorship={handleTurnOffCensorship}
    />, rootControlBar);

    window.addEventListener("message", handleMessage);
})();


/**
 * Handles the censorship logic by setting up the player listener and updating the timecode segments.
 *
 * @param segments
 */
function handleCensorship(segments: TimecodeSegment[]) {
    timecodeSegments = segments;
    isCensorshipEnabled = true;

    if (neededOBSClient) {
        connectOBS();
    }
}

/**
 * Handles turning off censorship by removing the player listener and resetting the timecode segments and active censorship actions.
 */
function handleTurnOffCensorship() {
    currentActionsState.forEach((segment, action) => {
        if (segment) {
            setPlayerCensorshipAction({
                isCensored: false,
                time: currentMovieTime,
                action: action,
                segment: segment
            });
        }
    });
    currentActionsState.clear();
    isCensorshipEnabled = false;
    timecodeSegments = [];

    obsClient?.disconnect();
}

/**
 * Handles chatbot work
 */
async function handleChatbot() {
    if (!settings.chatbotEnabled
        || isChatbotCommandStoped
        || (settings.checkStreamLive && hasStreamLive == false)
        || !player
        || isChatConnected
        || !user
        || !user.twitch?.accessToken
        || !user.twitch?.refreshToken
    ) return;

    // if necessary, we update the token
    if (isTwitchTokenExpires(user)) {
        if (isTryRefreshTwitchToken) {
            return;
        }
        isTryRefreshTwitchToken = true;
        const token = await refreshTwitchToken(user);
        if (!token) {
            if (config.debug) {
                console.error('Failed to refresh token');
            }
            return;
        };
        user.twitch = token;
        // In 1 hours, it will allow you to refresh the token again
        setTimeout(() => {
            isTryRefreshTwitchToken = false;
        }, 1 * 60 * 60 * 1000);
    }

    // If necessary, check whether the streamer is live
    if (settings.checkStreamLive) {
        hasStreamLive = await isStreamLive(user);
        if (!hasStreamLive) {
            if (config.debug) {
                console.log('Stream not started');
            }
            return;
        }
    }

    chatClient = new ChatClient({
        username: user.username,
        accessToken: user.twitch.accessToken!,
    });
    const isConnect = await chatClient.connect()

    if (!isConnect) return;
    isChatConnected = true;

    chatClient.onMessage((msg: ChatMessage) => {
        if (!player || !chatClient || !msg.message) return;
        const message = msg.message.trim().toLocaleLowerCase();

        // Search for the desired command
        const command: ChatbotCommand | undefined = settings.chatbotCommands.find((cmd) => {
            if (!cmd.enabled) return false;
            return cmd.command.startsWith("!") ? message.startsWith(cmd.command) : message.includes(cmd.command);
        });
        if (!command) return;

        // Checking permissions to execute commands
        const isOwner = user && msg.user.username.toLocaleLowerCase() === user.username.toLocaleLowerCase();
        switch (command.access) {
            case ChatbotAccess.onlyMe:
                if (!isOwner) return;
                break;

            case ChatbotAccess.moderators:
                if (!isOwner && !msg.user.mod) return;
                break;

            case ChatbotAccess.vip:
                if (!isOwner && !msg.user.vip) return;
                break;
        }

        // Command processing
        switch (command.action) {
            case ChatbotAction.stop:
                chatClient.disconnect();
                isChatbotCommandStoped = true;
                return;
            case ChatbotAction.play:
                playerPlay(player);
                return;
            case ChatbotAction.pause:
                playerPause(player);
                return;
            case ChatbotAction.mute:
                playerMute(player);
                return;
            case ChatbotAction.unmute:
                playerUnmute(player);
                return;
            case ChatbotAction.blur:
                setPlayerBlur(true);
                return;
            case ChatbotAction.unblur:
                setPlayerBlur(false);
                return;
            case ChatbotAction.hidePlayer:
                console.log("hidePlayer");
                playerInvisible(player);
                return;
            case ChatbotAction.showPlayer:
                playerVisible(player);
                return;
            case ChatbotAction.fastForwardRewind:
                const regex = new RegExp(`${command.command}\\s+(-?\\d+)`);
                const match = message.match(regex);
                if (!match) return;
                playerSeek(player, currentMovieTime + (Number(match[1]) || 0));
                return;
            case ChatbotAction.currentMovieTime:
                if (currentMovieTime == 0) return;
                chatClient.sendTagging(msg.user.username, i18n.t('movieIsPlayingValue', { value: secondsToTime(currentMovieTime) }));
                return;
            case ChatbotAction.movieTitle:
                let title: string;
                if (movie?.title) title = movie.title;
                else if (movie?.originalTitle) title = movie.originalTitle;
                else return;
                chatClient.sendTagging(msg.user.username, title + (movie.year ? ` (${movie.year})` : ''));
                return;
        }
    });
    chatClient.onClose(() => {
        isChatConnected = false;
    });
    chatClient.onError((msg: any) => {
        isChatConnected = false;
    });
}

/**
 * Handles messages from the window.
 * @param e Message event object (MessageEvent).
 */
function handleMessage(e: MessageEvent) {
    if (e.data.event === undefined) return;
    switch (e.data.event) {
        case "time":
            currentMovieTime = parseInt(e.data.time || "0");
            handleTimePlayer(currentMovieTime);
            break;
        case "fullscreen":
            break;
        case "exitfullscreen":
            break;
        case "play":
            handleChatbot();
            break;
        case "volume":
            break;
        default:
            break;
    }
}

/**
 * Handles player time.
 */
function handleTimePlayer(time: number) {
    if (!player || !isCensorshipEnabled || timecodeSegments.length == 0) return;

    const timeBuffer: number = (settings.timeBuffer as number) || SettingsDefault.timeBuffer;

    // Find all segments for the current time
    const currentSegments = timecodeSegments.filter(
        (segment) =>
            time >= segment.start_time - timeBuffer &&
            time < segment.end_time + timeBuffer
    );

    //  Determine which types of actions MUST be active now
    const nextActionsMap = new Map<TimecodeAction, TimecodeSegment>();
    currentSegments.forEach(segment => {
        const action = getActionForTag(segment.tag_id);
        if (action !== null) {
            if (!nextActionsMap.has(action)) {
                nextActionsMap.set(action, segment);
            }
        }
    });

    // 3. Checking all possible actions
    const allPossibleActions = Object.values(TimecodeAction).filter(v => typeof v === 'number') as TimecodeAction[];

    allPossibleActions.forEach(action => {
        const activeSegmentInState = currentActionsState.get(action) || null;
        const targetSegment = nextActionsMap.get(action) || null;

        // If the action is to begin: In a null state, but with a segment in the plans
        if (activeSegmentInState === null && targetSegment !== null) {
            currentActionsState.set(action, targetSegment);
            setPlayerCensorshipAction({
                isCensored: true,
                time: time,
                action: action,
                segment: targetSegment
            });
        }

        // if the action is to end. There was a segment in the state, but it is not in the plans
        else if (activeSegmentInState !== null && targetSegment === null) {
            setPlayerCensorshipAction({
                isCensored: false,
                time: time,
                action: action,
                segment: activeSegmentInState
            });
            currentActionsState.set(action, null);
        }

        // If the action continues but the segment has changed (e.g., one Skip has ended and another has begun)
        else if (activeSegmentInState !== null && targetSegment !== null && activeSegmentInState.id !== targetSegment.id) {
            currentActionsState.set(action, targetSegment);
        }
    });
}

/**
 * Determines the censorship action based on the provided timecode tag.
 * @param tag Timecode tag (of type TimecodeTag).
 * @returns Corresponding censorship action (of type TimecodeAction) or null if the tag is not supported.
 */
const getActionForTag = (tag: TimecodeTag): TimecodeAction | null => {
    switch (tag) {
        case TimecodeTag.NUDITY:
            return settings.nudity;
        case TimecodeTag.SEXUAL_CONTENT_WITHOUT_NUDITY:
            return settings.sexualContentWithoutNudity;
        case TimecodeTag.VIOLENCE:
            return settings.violence;
        case TimecodeTag.SENSITIVE_EXPRESSIONS:
            return settings.sensitiveExpressions;
        case TimecodeTag.USE_DRUGS_ALCOHOL_TOBACCO:
            return settings.useDrugsAlcoholTobacco;
        case TimecodeTag.PROHIBITED_SYMBOLS:
            return settings.prohibitedSymbols;
        case TimecodeTag.EROTIC_SOUNDS:
            return settings.eroticSounds;
        default:
            return null;
    }
};

/**
 * Establishes a connection to the OBS client, if possible
 */
async function connectOBS() {
    const obsClientSettings: SettingsOBSClientNull = (settings.obsClient as SettingsOBSClientNull) || SettingsDefault.obsClient;
    const obsCensorSceneName: string | null = (settings.obsCensorScene as string | null) || SettingsDefault.obsCensorScene;

    try {
        if (!obsCensorSceneName) {
            throw new Error("Scene not specified");
        }

        if (!obsClientSettings?.type
            || !obsClientSettings?.host
            || !obsClientSettings?.port
            || !obsClientSettings?.auth) {
            throw new Error("Missing connection data");
        }

        obsClient?.disconnect();
        obsClient = new OBSClient({
            type: obsClientSettings.type,
            host: obsClientSettings.host,
            port: obsClientSettings.port,
            auth: obsClientSettings.auth
        });
        const isConnectedObsClient = await obsClient.connect();
        if (!isConnectedObsClient) {
            throw new Error("Failed to connect to OBS Client");
        }
        const scene = await obsClient.findScene(obsCensorSceneName);
        if (!scene) {
            throw new Error("Could not find the scene");
        }
        obsCensorScene = scene;
    } catch (e) {
        obsClient?.disconnect();
        obsClient = null;
        obsCensorScene = null;
        handleObsClientError();
        if (config.debug) {
            console.error(e);
        }
    }
};

/**
 * Handles OBS client connection errors by displaying a dialog.
 */
function handleObsClientError() {
    const obsCensorSceneName: string | null = (settings.obsCensorScene as string | null) || SettingsDefault.obsCensorScene;

    let obsName: string;
    switch (obsCensorSceneName) {
        case OBSType.obsstudio:
            obsName = "OBS Studio";
            break;
        case OBSType.streamlabs:
            obsName = "Streamlabs OBS";
            break;
        default:
            obsName = "OBS";
            break;
    }
    renderQuestionDialog({
        sound: true,
        id: "obs-connection-error",
        title: i18n.t("connectionError"),
        description: i18n.t("unableConnectObsOrConnectionLost", { obs: obsName }),
        buttons: [
            {
                text: i18n.t("close"),
                style: "primary",
            },
        ],
    });
};

/**
 * Performs a censorship action for the player depending on the action type.
 * @param isCensored Indicates whether to apply censorship.
 * @param time Current time in the player.
 * @param action Action type.
 * @param segment Timecode segment to which the action is applied.
 */
async function setPlayerCensorshipAction({
    isCensored,
    time,
    action,
    segment,
}: {
    isCensored: boolean;
    time: number,
    action: TimecodeAction | null;
    segment: TimecodeSegment;
}) {
    if (!player) return;

    switch (action) {
        case TimecodeAction.blur:
            if (playerContentCensorshipEnabled.blur) return;
            setPlayerBlur(isCensored);
            break;
        case TimecodeAction.hide:
            if (playerContentCensorshipEnabled.hide) return;
            isCensored ? playerInvisible(player) : playerVisible(player);
            break;
        case TimecodeAction.mute:
            isCensored ? playerMute(player) : playerUnmute(player);
            break;
        case TimecodeAction.pause:
            if (!isCensored) break;
            playerPause(player);
            playAlertSound();
            break;
        case TimecodeAction.skip:
            if (isCensored && segment.end_time) playerSeek(player, segment.end_time + 1);
            break;
        case TimecodeAction.obsSceneChange:
            if (playerContentCensorshipEnabled.obsSceneChange) return;
            try {
                if (obsClient && isCensored) {
                    mainSceneOBS = await obsClient.getActiveScene();
                }

                if (
                    !obsClient ||
                    !obsCensorScene ||
                    (!isCensored && !mainSceneOBS?.id)
                ) {
                    censorshipActionLog({
                        error: true,
                        isCensored,
                        time,
                        segment,
                        action,
                    });
                    setPlayerCensorshipAction({
                        isCensored: isCensored,
                        time: time,
                        action: TimecodeAction.pause,
                        segment: segment,
                    });
                    handleObsClientError();
                    return;
                }

                let isSetScene = await obsClient.setActiveScene(
                    isCensored ? obsCensorScene : mainSceneOBS!
                );

                if (isCensored && !isSetScene) {
                    censorshipActionLog({
                        error: true,
                        isCensored,
                        time,
                        segment,
                        action,
                    });
                    setPlayerCensorshipAction({
                        isCensored: isCensored,
                        time: time,
                        action: TimecodeAction.pause,
                        segment: segment,
                    });
                    handleObsClientError();
                    return;
                }
            } catch (error) {
                if (config.debug) {
                    console.error(`catch ${action}: `, error);
                }
                handleObsClientError();
                if (isCensored) {
                    censorshipActionLog({
                        error: true,
                        isCensored,
                        time,
                        segment,
                        action,
                    });
                    setPlayerCensorshipAction({
                        isCensored: isCensored,
                        time: time,
                        action: TimecodeAction.pause,
                        segment: segment,
                    });
                    return;
                }
            }
            break;
        default:
            break;
    }

    censorshipActionLog({
        isCensored,
        time,
        segment,
        action,
    });
};

/**
 * Sets blur on the player
 * @param enabled enable or disable blur
 */
function setPlayerBlur(
    enabled: boolean
) {
    if (!player) return;
    const blurPower: BlurPower = (settings.blurPower as BlurPower) || SettingsDefault.blurPower;

    const blurClasses: Record<BlurPower, string> = {
        [BlurPower.light]: "mt-player-blur-light",
        [BlurPower.strong]: "mt-player-blur-strong",
        [BlurPower.max]: "mt-player-blur-max",
        [BlurPower.base]: "mt-player-blur-base",
    };
    const cn =
        blurPower != null ? blurClasses[blurPower] : blurClasses[BlurPower.base];

    player.classList.toggle(cn, enabled);
};

/**
 * Gets a message from the background.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "command") return;
    heandleHotkey(message.command);
});

/**
 * Handling hotkeys.
 */
async function heandleHotkey(command: string) {
    if (!player || command !== "censoring-player-content" || isHotkeyPressed) return;
    const playerContentCensorshipCommand = (settings.playerContentCensorshipCommand as TimecodeAction) || SettingsDefault.playerContentCensorshipCommand;
    isHotkeyPressed = true;
    switch (playerContentCensorshipCommand) {
        case TimecodeAction.blur:
            playerContentCensorshipEnabled.blur = [
                "light",
                "strong",
                "max",
                "base"
            ].some(cls => player!.classList.contains("mt-player-blur-" + cls)) ? false : !playerContentCensorshipEnabled.blur;
            setPlayerBlur(playerContentCensorshipEnabled.blur);
            break;
        case TimecodeAction.hide:
            playerContentCensorshipEnabled.hide = !isPlayerVisible(player) ? false : !playerContentCensorshipEnabled.hide;
            playerContentCensorshipEnabled.hide ? playerInvisible(player) : playerVisible(player);
            break;
        case TimecodeAction.obsSceneChange:
            try {
                if (!obsClient) {
                    await connectOBS();
                }

                if (!obsClient || !obsCensorScene) {
                    playerPause(player);
                    playerContentCensorshipEnabled.obsSceneChange = false;
                    break;
                }

                const scene = await obsClient.getActiveScene();
                if (!scene) {
                    playerContentCensorshipEnabled.obsSceneChange = false;
                    break;
                }

                if (scene.id !== obsCensorScene.id) {
                    mainSceneOBS = scene;
                    playerContentCensorshipEnabled.obsSceneChange = true;
                    await obsClient.setActiveScene(obsCensorScene);
                    break;
                }

                if (mainSceneOBS && mainSceneOBS.id !== obsCensorScene.id) {
                    await obsClient.setActiveScene(mainSceneOBS);
                    playerContentCensorshipEnabled.obsSceneChange = false;
                    break;
                }
            } catch (error) {
                if (config.debug) {
                    console.error("Hotkey obs error:", error);
                }
            }
            break;
        default:
            break;
    }
    isHotkeyPressed = false;
}