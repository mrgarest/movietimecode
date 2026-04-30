import { TimecodeAction } from "@/enums/timecode";
import { secondsToTime } from "./format";
import config from "config";
import { TimecodeSegment } from "@/types/timecode";

/**
 * Logs information about the censorship action for debugging.
 */
export function censorshipActionLog({
  error = false,
  isCensored,
  time,
  segment,
  action,
}: {
  error?: boolean;
  isCensored: boolean;
  time: number;
  segment: TimecodeSegment;
  action: TimecodeAction | null;
}) {
  if (!config.debug) return;

  const msg: string = [
    "✏️ Censorship Action",
    `• Status:        ${isCensored ? "on" : "off"}`,
    `• Action:        ${action}`,
    `• Time:          ${secondsToTime(time)}`,
    `• Segment ID:    ${segment.id}`,
    `• Segment start: ${secondsToTime(segment.start_time)}`,
    `• Segment end:   ${secondsToTime(segment.end_time)}`,
  ].join("\n");

  !error ? console.log(msg) : console.error(msg);
}
