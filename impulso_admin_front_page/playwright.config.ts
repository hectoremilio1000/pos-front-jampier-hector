import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "0";
process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE =
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE || "mac-arm64";
const pwHome =
  process.env.PLAYWRIGHT_HOME ||
  path.join(process.cwd(), ".playwright-home");
process.env.HOME = pwHome;
if (!fs.existsSync(pwHome)) {
  fs.mkdirSync(pwHome, { recursive: true });
}

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
    {
      name: "chrome",
      use: {
        channel: "chrome",
        launchOptions: {
          args: ["--disable-crashpad", "--disable-crash-reporter"],
          env: { HOME: pwHome },
        },
      },
    },
  ],
});
