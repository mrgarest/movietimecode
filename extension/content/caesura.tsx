import { BlurPower, TimecodeAction, TimecodeTag } from "@/enums/timecode";
import { render } from "preact";
import config from "config";
import { ControlBar } from "./components/control-bar";
import { SettingsOBSClientNull } from "@/types/settings";
import { setHeaderFonts, waitForDOMContentLoaded } from "@/utils/page";
import { renderQuestionDialog } from "./components/question-dialog";
import i18n from "@/lib/i18n";
import { playAlertSound } from "@/utils/alert";
import { censorshipActionLog } from "@/utils/log";
import ChatClient, { ChatMessage } from "@/lib/chat-client";
import { User } from "@/types/user";
import { getUser } from "@/utils/user";
import { ChatbotCommand } from "@/types/chatbot";
import { ChatbotAccess, ChatbotAction } from "@/enums/chatbot";
import { secondsToTime } from "@/utils/format";
import { TimecodeSegment } from "@/types/timecode";
import { isStreamLive, isTwitchTokenExpires, refreshTwitchToken } from "@/utils/twitch";
import { getSiteDriver } from "./sites/driver";
import { settings } from "@/utils/settings";
import { OBSBackground } from "@/lib/obs/background";
import { OBSType, Scene } from "@/types/obs";
import { createPlayerController } from "@/utils/player-controller";

let isHotkeyPressed: boolean = false;
let isCensorshipEnabled: boolean = false;
let isChatConnected: boolean = false;
let user: User | undefined = undefined;
let chatClient: ChatClient | undefined = undefined;
let movie: {
    title?: string
    originalTitle?: string
    year?: number
} | undefined = undefined;

let obsClient: OBSBackground | null = null;
let obsConnecting: Promise<boolean> | null = null;
let mainSceneOBS: Scene | null;
let obsCensorScene: Scene | null;

type Thtml = HTMLIFrameElement | undefined;
let player: Thtml = undefined;
const playerController = createPlayerController();

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

const neededOBSClient = (): boolean => {
    // OBS client
    return [
        settings.get("nudity"),
        settings.get("sexualContentWithoutNudity"),
        settings.get("eroticSounds"),
        settings.get("violence"),
        settings.get("sensitiveExpressions"),
        settings.get("useDrugsAlcoholTobacco"),
        settings.get("prohibitedSymbols"),
    ].includes(TimecodeAction.obsSceneChange);
};

// Tracking changes to settings
settings.onChange([
    "nudity",
    "sexualContentWithoutNudity",
    "eroticSounds",
    "violence",
    "sensitiveExpressions",
    "useDrugsAlcoholTobacco",
    "prohibitedSymbols",
    "chatbotEnabled",
], (key, newValue) => {
    if (!neededOBSClient() && obsClient) {
        disconnectOBS();
    } else if (isCensorshipEnabled && neededOBSClient() && !obsClient) {
        connectOBS();
    }

    // chatbot
    if (!settings.get("chatbotEnabled") && isChatConnected && chatClient) {
        chatClient.disconnect();
    }
});

(async () => {
    await waitForDOMContentLoaded();
    await settings.waitReady();
    
    user = await getUser();
    const hostname = window.location.hostname;
    const site = getSiteDriver(hostname);
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

    setHeaderFonts();

    const rootControlBar = document.createElement("div");
    containerForControlBar.after(rootControlBar);

    playerController.set(player);

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

    if (neededOBSClient()) {
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

    disconnectOBS();
}

/**
 * Handles chatbot work
 */
async function handleChatbot() {
    const checkStreamLive: boolean = settings.get("checkStreamLive");
    if (!settings.get("chatbotEnabled")
        || isChatbotCommandStoped
        || (checkStreamLive && hasStreamLive == false)
        || !player
        || isChatConnected
        || !user?.twitch?.accessToken
        || !user?.twitch?.refreshToken
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
    if (checkStreamLive) {
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
    const isConnect = await chatClient.connect();

    if (!isConnect) return;
    isChatConnected = true;

    chatClient.onMessage((msg: ChatMessage) => {
        if (!player || !chatClient || !msg.message) return;
        const message = msg.message.trim().toLocaleLowerCase();

        // Search for the desired command
        const command: ChatbotCommand | undefined = settings.get("chatbotCommands").find((cmd) => {
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
                playerController.play();
                return;
            case ChatbotAction.pause:
                playerController.pause();
                return;
            case ChatbotAction.mute:
                playerController.mute();
                return;
            case ChatbotAction.unmute:
                playerController.unmute();
                return;
            case ChatbotAction.blur:
                playerController.setBlur(true, settings.get("blurPower"));
                return;
            case ChatbotAction.unblur:
                playerController.setBlur(false, settings.get("blurPower"));
                return;
            case ChatbotAction.hidePlayer:
                playerController.setVisible(false);
                return;
            case ChatbotAction.showPlayer:
                playerController.setVisible(true);
                return;
            case ChatbotAction.fastForwardRewind:
                const regex = new RegExp(`${command.command}\\s+(-?\\d+)`);
                const match = message.match(regex);
                if (!match) return;
                playerController.seek(currentMovieTime + (Number(match[1]) || 0));
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

    const timeBuffer: number = settings.get("timeBuffer");

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
            return settings.get("nudity");
        case TimecodeTag.SEXUAL_CONTENT_WITHOUT_NUDITY:
            return settings.get("sexualContentWithoutNudity");
        case TimecodeTag.VIOLENCE:
            return settings.get("violence");
        case TimecodeTag.SENSITIVE_EXPRESSIONS:
            return settings.get("sensitiveExpressions");
        case TimecodeTag.USE_DRUGS_ALCOHOL_TOBACCO:
            return settings.get("useDrugsAlcoholTobacco");
        case TimecodeTag.PROHIBITED_SYMBOLS:
            return settings.get("prohibitedSymbols");
        case TimecodeTag.EROTIC_SOUNDS:
            return settings.get("eroticSounds");
        default:
            return null;
    }
};

/**
 * Establishes a connection to the OBS client, if possible.
 * Concurrent calls share one connection attempt.
 *
 * @param showError Show the connection error dialog on failure.
 * @returns true if connected and the censor scene was found.
 */
function connectOBS(showError: boolean = true): Promise<boolean> {
    if (!obsConnecting) {
        obsConnecting = establishOBSConnection().finally(() => {
            obsConnecting = null;
        });
    }
    return obsConnecting.then((connected) => {
        if (!connected && showError) handleObsClientError();
        return connected;
    });
}

async function establishOBSConnection(): Promise<boolean> {
    const obsClientSettings: SettingsOBSClientNull = settings.get("obsClient");
    const obsCensorSceneName: string | null = settings.get("obsCensorScene");

    disconnectOBS();
    const client = new OBSBackground();

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

        const isConnectedObsClient = await client.connect();
        if (!isConnectedObsClient) {
            throw new Error("Failed to connect to OBS Client");
        }
        const scene = await client.findScene(obsCensorSceneName);
        if (!scene) {
            throw new Error("Could not find the scene");
        }

        // Connection lost (OBS closed, network error): forget the client so the next censorship action reconnects instead of failing.
        const dropClient = () => {
            if (obsClient !== client) return;
            if (config.debug) console.warn("[OBS] connection lost");
            disconnectOBS();
        };
        client.onClose(dropClient);
        client.onError(dropClient);

        obsClient = client;
        obsCensorScene = scene;
        return true;
    } catch (e) {
        client.disconnect();
        if (config.debug) {
            console.error(e);
        }
        return false;
    }
};

/**
 * Closes the OBS connection and forgets the client.
 */
function disconnectOBS() {
    obsClient?.disconnect();
    obsClient = null;
    obsCensorScene = null;
}

/**
 * Runs OBS requests, connecting first if needed. If the connection turns out to be lost, reconnects once and retries.
 *
 * @param fn Requests to run with a connected client and the censor scene.
 */
async function withOBS<T>(fn: (client: OBSBackground, censorScene: Scene) => Promise<T>): Promise<T> {
    if (!obsClient || !obsCensorScene) await connectOBS(false);
    if (!obsClient || !obsCensorScene) throw new Error("OBS is not connected");

    try {
        return await fn(obsClient, obsCensorScene);
    } catch (error) {
        // A timeout means OBS got the request but answered too slowly; repeating a scene switch could toggle it twice, so only retry lost connections.
        if (error instanceof Error && /timed out/.test(error.message)) throw error;
        if (config.debug) console.warn("[OBS] request failed, reconnecting", error);

        disconnectOBS();
        await connectOBS(false);
        if (!obsClient || !obsCensorScene) throw error;
        return await fn(obsClient, obsCensorScene);
    }
}

/**
 * Handles OBS client connection errors by displaying a dialog.
 */
function handleObsClientError() {
    const obsCensorSceneName: string | null = settings.get("obsCensorScene");

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
            playerController.setBlur(isCensored, settings.get("blurPower"));
            break;
        case TimecodeAction.hide:
            if (playerContentCensorshipEnabled.hide) return;
            playerController.setVisible(!isCensored);
            break;
        case TimecodeAction.mute:
            isCensored ? playerController.mute() : playerController.unmute();
            break;
        case TimecodeAction.pause:
            if (!isCensored) break;
            playerController.pause();
            playAlertSound();
            break;
        case TimecodeAction.skip:
            if (isCensored && segment.end_time) playerController.seek(segment.end_time + 1);
            break;
        case TimecodeAction.obsSceneChange:
            if (playerContentCensorshipEnabled.obsSceneChange) return;
            try {
                const isSetScene = await withOBS(async (client, censorScene) => {
                    if (isCensored) {
                        const activeScene = await client.getActiveScene();
                        // Keep the remembered main scene if the censor scene is already active
                        if (activeScene && activeScene.id !== censorScene.id) {
                            mainSceneOBS = activeScene;
                        }
                        return client.setActiveScene(censorScene);
                    }
                    if (!mainSceneOBS?.id) throw new Error("Main scene is unknown");
                    return client.setActiveScene(mainSceneOBS);
                });

                if (isCensored && !isSetScene) {
                    throw new Error("Failed to switch to the censor scene");
                }
            } catch (error) {
                if (config.debug) {
                    console.error(`catch ${action}: `, error);
                }
                censorshipActionLog({
                    error: true,
                    isCensored,
                    time,
                    segment,
                    action,
                });
                if (isCensored) {
                    // Fallback: the scene could not be switched, so stop the movie
                    setPlayerCensorshipAction({
                        isCensored: isCensored,
                        time: time,
                        action: TimecodeAction.pause,
                        segment: segment,
                    });
                }
                handleObsClientError();
                return;
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
 * Gets a message from the background.
 */
chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "command") return;
    heandleHotkey(message.command);
});

/**
 * Handling hotkeys.
 */
async function heandleHotkey(command: string) {
    if (!player || command !== "censoring-player-content" || isHotkeyPressed) return;
    const playerContentCensorshipCommand = settings.get("playerContentCensorshipCommand");
    isHotkeyPressed = true;
    switch (playerContentCensorshipCommand) {
        case TimecodeAction.blur:
            playerContentCensorshipEnabled.blur = [
                "light",
                "strong",
                "max",
                "base"
            ].some(cls => player!.classList.contains("mt-player-blur-" + cls)) ? false : !playerContentCensorshipEnabled.blur;
            playerController.setBlur(playerContentCensorshipEnabled.blur, settings.get("blurPower"));
            break;
        case TimecodeAction.hide:
            playerContentCensorshipEnabled.hide = !playerController.isVisible() ? false : !playerContentCensorshipEnabled.hide;
            playerController.setVisible(!playerContentCensorshipEnabled.hide);
            break;
        case TimecodeAction.obsSceneChange:
            try {
                await withOBS(async (client, censorScene) => {
                    const scene = await client.getActiveScene();
                    if (!scene) {
                        playerContentCensorshipEnabled.obsSceneChange = false;
                        return;
                    }

                    if (scene.id !== censorScene.id) {
                        mainSceneOBS = scene;
                        playerContentCensorshipEnabled.obsSceneChange = true;
                        await client.setActiveScene(censorScene);
                        return;
                    }

                    if (mainSceneOBS && mainSceneOBS.id !== censorScene.id) {
                        await client.setActiveScene(mainSceneOBS);
                        playerContentCensorshipEnabled.obsSceneChange = false;
                    }
                });
            } catch (error) {
                if (config.debug) {
                    console.error("Hotkey obs error:", error);
                }
                playerController.pause();
                playerContentCensorshipEnabled.obsSceneChange = false;
                handleObsClientError();
            }
            break;
        default:
            break;
    }
    isHotkeyPressed = false;
}