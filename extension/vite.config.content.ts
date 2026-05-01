import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { buildDefineConfig } from "./vite.utils";
const CONTENT_SCRIPTS = "/content";

export default defineConfig(
  buildDefineConfig({
    plugins: [preact()],
    input: {
      content: CONTENT_SCRIPTS + "/content.css",
      caesura: CONTENT_SCRIPTS + "/caesura.tsx",
    },
  })
);
