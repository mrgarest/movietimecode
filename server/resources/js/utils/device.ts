import Cookies from "js-cookie"; // TODO(remove-device-token-cookie-migration)
import CryptoJS from "crypto-js";

/**
 * Get the existing token or create a new one, store it in localStorage, and return it
 */
export const getDeviceToken = (): string => {
    migrateDeviceTokenCookie();

    try {
        const storedToken = localStorage.getItem("device_token");
        if (storedToken) return storedToken;
    } catch {}

    const deviceToken = CryptoJS.lib.WordArray.random(18).toString();

    try {
        localStorage.setItem("device_token", deviceToken);
    } catch {}

    return deviceToken;
};

/**
 * Moves the device token from the old cookie to localStorage.
 *
 * @deprecated TODO(remove-device-token-cookie-migration): temporary migration added in November 2026, when the token was moved from cookies to localStorage.
 */
const migrateDeviceTokenCookie = () => {
    const cookieToken = Cookies.get("device_token");
    if (!cookieToken) return;

    try {
        if (!localStorage.getItem("device_token")) {
            localStorage.setItem("device_token", cookieToken);
        }
        Cookies.remove("device_token", {
            path: "/",
            sameSite: "lax",
            secure: true,
        });
    } catch {}
};
