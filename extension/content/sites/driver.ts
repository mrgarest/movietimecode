import { SiteDriver } from "@/types/sites";
import { uakinoDriver } from "./uakino";
import { uaserialsDriver } from "./uaserials";

const drivers: Record<string, SiteDriver> = {
  "uakino.best": uakinoDriver,
  "uaserials.com": uaserialsDriver
};

export const getSiteDriver = (hostname: string): SiteDriver | undefined =>
  drivers[hostname];
