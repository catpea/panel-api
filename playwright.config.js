import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    browserName: "firefox",
    headless: true,
    baseURL: "http://localhost:8080",
  },
  webServer: {
    command: "http-server -c-1 . --port 8080",
    port: 8080,
    reuseExistingServer: true,
  },
});
