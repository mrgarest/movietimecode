import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { buildDefineConfig, debugWarningPlugin } from "./vite.utils";

/**
 * Build config for the extension scripts.
 *
 * Each script must be a single self-contained file, and IIFE builds can't have several entries, so every script is built by a separate Vite run. The script is selected by the TARGET env variable:
 *
 *   TARGET=content vite build -c vite.config.scripts.ts
 *
 * To add a new script, add it to the table below and to the scripts in package.json.
 */
interface Target {
    /** Entry file, relative to the project root. */
    input: string;
    /** Output name: assets/[name].js */
    name: string;
    /** iife — content scripts (they can't be ES modules), es — module service worker. */
    format: "iife" | "es";
    /** Output path of the CSS imported by the script. */
    cssFileName?: string;
    plugins?: (mode: string) => PluginOption[];
}

const targets: Record<string, Target> = {
    content: {
        input: "content/caesura.tsx",
        name: "caesura",
        format: "iife",
        cssFileName: "assets/content.css",
        plugins: (mode) => [react(), tailwindcss(), debugWarningPlugin(mode)],
    },
    auth: {
        input: "content/server/auth.ts",
        name: "sa",
        format: "iife",
    },
    post: {
        input: "content/server/post-command.ts",
        name: "post-command",
        format: "iife",
    },
    background: {
        input: "background/background.ts",
        name: "background",
        format: "es",
    },
};

export default defineConfig(({ mode }) => {
    const targetName = process.env.TARGET;
    const target = targetName ? targets[targetName] : undefined;

    if (!target) {
        throw new Error(`Unknown TARGET "${targetName ?? ""}". Available: ${Object.keys(targets).join(", ")}`);
    }

    return buildDefineConfig({
        mode,
        input: target.input,
        name: target.name,
        format: target.format,
        cssFileName: target.cssFileName,
        plugins: target.plugins?.(mode),
    });
});
