import i18n from "@/lib/i18n";
import { DateTime } from "luxon";

/**
 * Converts the number of seconds into an object with strings of hours, minutes, and seconds.
 * @param seconds
 * @returns An object { hours, minutes, seconds } in string format.
 */
export const secondsToTimeHMS = (
    seconds: number,
): { hours: string; minutes: string; seconds: string } => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return {
        hours: addZeroToTime(hours),
        minutes: addZeroToTime(minutes),
        seconds: addZeroToTime(remainingSeconds),
    };
};

/**
 * Adds a leading zero to the number if it is less than 10 and returns the string.
 * @param time
 * @returns Leading zero, if necessary.
 */
const addZeroToTime = (time: number): string =>
    `${time < 10 ? "0" + time : time}`;

/**
 * Converts a number of seconds to a time format (HH:MM:SS).
 * @param seconds Number of seconds.
 * @returns Time in HH:MM:SS format.
 */
export const secondsToTime = (seconds: number): string => {
    if (seconds < 0 || isNaN(seconds)) {
        console.warn("Invalid seconds value:", seconds);
        return "00:00:00";
    }
    const hms = secondsToTimeHMS(seconds);
    return [hms.hours, hms.minutes, hms.seconds]
        .map((time) => time.toString().padStart(2, "0"))
        .join(":");
};

/**
 * Format date time.
 * @param timestamp
 * @returns
 */
export const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "N/A";

    return DateTime.fromSeconds(timestamp)
        .setLocale(i18n.language)
        .toLocaleString(DateTime.DATETIME_SHORT);
};
