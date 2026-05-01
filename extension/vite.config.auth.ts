import { defineConfig } from "vite";
import { buildDefineConfig } from "./vite.utils";
const CONTENT_SCRIPTS = "/content";

export default defineConfig(
  buildDefineConfig({
    input: {
      "sa": CONTENT_SCRIPTS + "/server/auth.ts"
    },
  })
);
