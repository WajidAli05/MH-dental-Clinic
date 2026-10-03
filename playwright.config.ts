import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // Real GPU through ANGLE: the page runs several WebGL canvases, far too slow in software.
  use: { browserName: "chromium", launchOptions: { args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] } },
});
