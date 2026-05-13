import { BlurPower } from "@/enums/timecode";

interface PlayerMessage {
  api: string;
  set?: string | number;
}

/**
 * Creates a player controller for the given iframe element.
 *
 * @param initial - Optional initial iframe element.
 */
export const createPlayerController = (initial?: HTMLIFrameElement) => {
  let player = initial;

  const post = (message: PlayerMessage) =>
    player?.contentWindow?.postMessage(message, "*");

  return {
    /**
     * Sets a new iframe element as the player.
     */
    set: (el: HTMLIFrameElement) => {
      player = el;
    },

    /**
     * Starts playback.
     */
    play: () => post({ api: "play" }),

    /**
     * Pauses playback.
     */
    pause: () => post({ api: "pause" }),

    /**
     * Mutes the player audio.
     */
    mute: () => post({ api: "mute" }),

    /**
     * Unmutes the player audio.
     */
    unmute: () => post({ api: "unmute" }),

    /**
     * Seeks to a specific timestamp.
     *
     * @param seconds - The position to seek to.
     */
    seek: (seconds: number) => post({ api: "seek", set: seconds }),

    /**
     * Enters or exits fullscreen mode.
     *
     * @param enabled - Whether fullscreen should be enabled.
     */
    setFullscreen: (enabled: boolean) =>
      post({ api: enabled ? "fullscreen" : "exitfullscreen" }),

    /**
     * Sets the player visibility.
     *
     * @param visible - Whether the player should be visible.
     */
    setVisible: (visible: boolean) =>
      player?.classList.toggle("mt-opacity-0", !visible),

    /**
     * Returns whether the player is currently visible.
     */
    isVisible: () =>
      player ? !player.classList.contains("mt-opacity-0") : true,

    /**
     * Enables or disables blur on the player based on the current blur power setting.
     *
     * @param enabled - Whether blur should be applied.
     * @param blurPower - The intensity of the blur effect to apply.
     */
    setBlur: (enabled: boolean, blurPower: BlurPower) => {
      if (!player) return;

      const blurClasses: Record<BlurPower, string> = {
        [BlurPower.light]: "mt-player-blur-light",
        [BlurPower.strong]: "mt-player-blur-strong",
        [BlurPower.max]: "mt-player-blur-max",
        [BlurPower.base]: "mt-player-blur-base",
      };

      const cn =
        blurPower != null
          ? blurClasses[blurPower]
          : blurClasses[BlurPower.base];
      player.classList.toggle(cn, enabled);
    },
  };
};
