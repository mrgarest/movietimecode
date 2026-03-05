import config from "config";

/**
 * Plays an audio alert.
 */
export function playAlertSound() {
  let audio: HTMLAudioElement | null = new Audio(
    chrome.runtime.getURL("sounds/alert.mp3")
  );

  audio.play().catch((err) => {
    audio = null;
    if (config.debug) {
      console.error("Aler sound error", err);
    }
  });

  setTimeout(() => {
    if (!audio) return;
    audio.pause();
    audio = null;
  }, 1100);
}
