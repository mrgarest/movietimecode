import { SiteDriver } from "@/types/sites";
import { waitForElement } from "@/utils/page";

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
  if (
    !document.querySelector<HTMLDivElement>(
      ".movie-right .players-section .playlists-ajax",
    )
  ) {
    return (
      document.querySelector<HTMLIFrameElement>(
        ".movie-right .players-section iframe#pre",
      ) ?? undefined
    );
  }

  try {
    return await waitForElement<HTMLIFrameElement>(
      ".movie-right .players-section .playlists-ajax iframe#playerfr",
    );
  } catch {
    return undefined;
  }
};

/**
 * Returns the container below the player where the control panel is mounted.
 * @returns
 */
const getContainerForControlBar = (): HTMLDivElement | undefined =>
  document.querySelector<HTMLDivElement>(
    ".movie-right .players-section .box.full-text.visible",
  ) ?? undefined;

/**
 * Get the movie title.
 * @returns
 */
const getTitle = (): string | null => getText(".alltitle .solototle");

/**
 * Get the original movie title.
 * @returns
 */
const getOriginalTitle = (): string | null =>
  getText(".alltitle .origintitle i");

/**
 * Get the year the movie was released.
 * @returns
 */
const getYear = (): number | null => {
  const match = document.body.innerHTML.match(
    /:\/\/[a-z0-9.-]+\.[a-z0-9]+\/find\/year\/(\d+)\//i,
  );
  const year = match?.[1] ? parseInt(match[1], 10) : null;
  return Number.isNaN(year) ? null : year;
};

export const uakinoDriver: SiteDriver = {
  id: "uakino",
  getPlayer,
  getContainerForControlBar,
  getTitle,
  getOriginalTitle,
  getYear,
};
