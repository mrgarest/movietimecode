import { Settings } from "@/types/settings";
import { updateSetting } from "@/utils/settings";

/**
 * Hook for synchronizing the state of React components with chrome.storage.
 */
export const useSyncSetting = () => {
  const sync = <K extends keyof Settings>(
    key: K,
    setter: (val: any) => void
  ) => {
    return (value: any) => {
      setter(value);
      updateSetting(key, value);
    };
  };

  return { sync };
};
