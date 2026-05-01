import { defineConfig } from "vite";
import { buildDefineConfig } from "./vite.utils";
const CONTENT_SCRIPTS = "/content";

export default defineConfig(
  buildDefineConfig({
    input: {
      "post-command": CONTENT_SCRIPTS + "/server/post-command.ts"
    },
  })
);
