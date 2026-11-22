import config from "./config.json";
import path from "path";
import { AliasOptions, Plugin, PluginOption, UserConfig } from "vite";

export const banner: string = `/**
 * Movie Timecode Browser Extension
 * Release date: ${new Date().toISOString().split("T")[0]}
 * @version ${config.version}
 * @author Garest
 * @link ${config.homepageUrl}
 * @license MIT
 */`;

export const alias: AliasOptions = {
  "@": path.resolve(__dirname, "."),
  config: path.resolve(__dirname, "config.json"),
};

/**
 * Source maps are only generated for development builds (`--mode development`),
 * so they never end up in a release build.
 */
export const isDevelopment = (mode: string) => mode === "development";

interface BuildDefineConfig {
  mode: string;
  plugins?: PluginOption[];
  /** Entry file of the script, relative to the project root. */
  input: string;
  /** Output name of the script: assets/[name].js */
  name: string;
  /**
   * iife — content scripts (they can't be ES modules),
   * es — module service worker (background, "type": "module" in the manifest).
   */
  format: "iife" | "es";
  /** Output path of the CSS imported by the script, e.g. "assets/content.css". */
  cssFileName?: string;
}

/**
 * Build config for a single extension script.
 * Each script is built separately into one self-contained file without chunks,
 * because content scripts and the service worker can't load extra chunks.
 */
export const buildDefineConfig = (options: BuildDefineConfig): UserConfig => {
  return {
    mode: options.mode,
    plugins: options.plugins,
    resolve: {
      alias: alias,
    },
    build: {
      emptyOutDir: false,
      rollupOptions: {
        input: { [options.name]: path.resolve(__dirname, options.input) },
        output: {
          format: options.format,
          inlineDynamicImports: true,
          entryFileNames: "assets/[name].js",
          assetFileNames: (asset) =>
            options.cssFileName && asset.names.some((name) => name.endsWith(".css"))
              ? options.cssFileName
              : "assets/[name].[ext]",
          banner: banner,
        },
      },
      cssCodeSplit: !options.cssFileName,
      sourcemap: isDevelopment(options.mode),
    },
  };
};

/**
 * Warns when a release build is made with debug enabled in config.json: events are not sent and errors are logged to the console.
 */
export const debugWarningPlugin = (mode: string): Plugin => ({
  name: "vite:debug-warning",
  apply: "build",
  buildStart() {
    if (config.debug && !isDevelopment(mode)) {
      this.warn('config.json has "debug": true — events are disabled in this release build.');
    }
  },
});
