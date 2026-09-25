import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/auth-browser",
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://auth-test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
  },
});
