import config from "./config.json";
import fs from "fs";
import path from "path";
import { AliasOptions, Plugin, PluginOption, transformWithEsbuild, UserConfig } from "vite";

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
          assetFileNames: "assets/[name].[ext]",
          banner: banner,
        },
      },
      sourcemap: isDevelopment(options.mode),
    },
  };
};

/**
 * Emits a plain CSS file as a minified asset.
 * Used for content.css, which is injected by the manifest and not imported from JS.
 * @param input - CSS file, relative to the project root
 * @param fileName - output file name inside dist
 */
export const emitCssPlugin = (input: string, fileName: string): Plugin => {
  const file = path.resolve(__dirname, input);

  return {
    name: "vite:emit-css",
    apply: "build",
    buildStart() {
      this.addWatchFile(file);
    },
    async generateBundle() {
      const { code } = await transformWithEsbuild(fs.readFileSync(file, "utf-8"), file, {
        loader: "css",
        minify: true,
        target: "chrome120",
      });
      this.emitFile({ type: "asset", fileName, source: code });
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
