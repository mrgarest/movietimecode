import config from "./config.json";
import path from "path";
import { AliasOptions, PluginOption, UserConfig } from "vite";

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

interface BuildDefineConfig {
  plugins?: PluginOption[];
  input: Record<string, string>;
}

export const buildDefineConfig = (options: BuildDefineConfig): UserConfig => {
  return {
    plugins: options.plugins,
    resolve: {
      alias: alias,
    },
    build: {
      emptyOutDir: false,
      rollupOptions: {
        input: options.input,
        output: {
          entryFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]",
          banner: banner,
        },
      },
      sourcemap: config.debug,
    },
  };
};
