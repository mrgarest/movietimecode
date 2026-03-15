import {
  AliasOptions,
  defineConfig,
  Plugin,
  PluginOption,
  UserConfig,
} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import getManifest from "./manifest.config";
import { viteStaticCopy } from "vite-plugin-static-copy";
import config from "./config.json";
import fs from "fs";

const banner: string = `/**
 * Movie Timecode Browser Extension
 * Release date: ${new Date().toISOString().split("T")[0]}
 * @version ${config.version}
 * @author Garest
 * @link ${config.homepageUrl}
 * @license MIT
 */`;

const alias: AliasOptions = {
  "@": path.resolve(__dirname, "."),
  config: path.resolve(__dirname, "config.json"),
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "../LICENSE",
          dest: "",
        },
        {
          src: "assets/*",
          dest: "",
        },
      ],
    }),
    {
      name: "vite-plugin-manifest",
      apply: "build",
      generateBundle(_, _bundle) {
        const manifestJson = JSON.stringify(getManifest(), null, 2);

        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: manifestJson,
        });
      },
    },
    CustomLocalesPlugin(),
  ],
  resolve: {
    alias: alias,
  },
  build: {
    rollupOptions: {
      output: {
        banner: banner,
      },
    },
    sourcemap: config.debug,
  },
});

interface BuildDefineConfig {
  plugins?: PluginOption[];
  input: Record<string, string>;
};

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

function CustomLocalesPlugin(): Plugin {
  let viteOutDir: string;

  return {
    name: "vite:custom-locales",
    apply: "build",

    configResolved(config) {
      viteOutDir = config.build.outDir;
    },

    async closeBundle() {
      const inputDir = path.resolve(__dirname, "./locales");
      const outputDir = path.resolve(process.cwd(), viteOutDir, "_locales");

      if (!fs.existsSync(inputDir)) return;

      const localeDirs = fs
        .readdirSync(inputDir)
        .filter((f) => fs.statSync(path.join(inputDir, f)).isDirectory());

      for (const langCode of localeDirs) {
        const translationFile = path.join(
          inputDir,
          langCode,
          "translation.json",
        );
        if (!fs.existsSync(translationFile)) continue;

        const translation: Record<string, string> = JSON.parse(
          fs.readFileSync(translationFile, "utf-8"),
        );

        const langOutputDir = path.join(outputDir, langCode);
        fs.mkdirSync(langOutputDir, { recursive: true });

        fs.writeFileSync(
          path.join(langOutputDir, "messages.json"),
          JSON.stringify(
            {
              appName: { message: translation.appName },
              appDesc: { message: translation.appDesc },
              censoringPlayerContent: {
                message: translation.censoringPlayerContent,
              },
            },
            null,
            2,
          ),
          "utf-8",
        );
      }
    },
  };
}
