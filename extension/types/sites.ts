type SiteID = "uakino" | "uaserials";

export interface SiteDriver {
  id: SiteID;
  getPlayer(): Promise<HTMLIFrameElement | undefined>;
  getContainerForControlBar(): HTMLDivElement | undefined;
  getTitle(): string | null;
  getOriginalTitle(): string | null;
  getYear(): number | null;
}
