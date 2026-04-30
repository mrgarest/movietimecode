import { SiteDriver } from "@/types/sites";
import { waitForElement, waitForShadowRoot } from "@/utils/page";

/**
 * Text extraction tool.
 * @param selector
 * @returns
 */
const getText = (selector: string): string | null =>
  document.querySelector(selector)?.textContent?.trim() ?? null;

/**
 * Get the iframe player.
 * @returns
 */
const getPlayer = async (): Promise<HTMLIFrameElement | undefined> => {
  try {
    const shadowRoot = await waitForShadowRoot("player-control");
    if (!shadowRoot) return undefined;
    
    // Style injection
    if (!shadowRoot.querySelector("#mt-content-styles")) {
      const link = document.createElement("link");
      link.id = "mt-content-styles";
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("assets/content.css");
      shadowRoot.appendChild(link);
    }

    return await waitForElement<HTMLIFrameElement>("iframe", {
      root: shadowRoot,
    });
  } catch {
    return undefined;
  }
};

/**
 * Returns the container below the player where the control panel is mounted.
 * @returns
 */
const getContainerForControlBar = (): HTMLDivElement | undefined =>
  document.querySelector<HTMLDivElement>(".fplayer.tabs-box.sect") ?? undefined;

/**
 * Get the movie title.
 * @returns
 */
const getTitle = (): string | null =>
  getText(".short-header .short-title .oname_ua");

/**
 * Get the original movie title.
 * @returns
 */
const getOriginalTitle = (): string | null => getText(".short-header .oname");

/**
 * Get the year the movie was released.
 * @returns
 */
const getYear = (): number | null => {
  const match =
    document.body.innerHTML.match(
      /:\/\/[a-z0-9.-]+\.[a-z0-9]+\/find\/year\/(\d+)\//i,
    ) ?? document.body.innerHTML.match(/\/year\/(\d+)\//i);
  const year = match?.[1] ? parseInt(match[1], 10) : null;
  return Number.isNaN(year) ? null : year;
};

export const uaserialsDriver: SiteDriver = {
  id: "uaserials",
  getPlayer,
  getContainerForControlBar,
  getTitle,
  getOriginalTitle,
  getYear,
};
