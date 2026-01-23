import chokidar from "chokidar";
import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const watchPaths = [
  "features/**/*.feature",
  "features/**/*.ts",
  "src/dsl/**/*.ts",
  "packages/dsl/**/*.ts",
  "../Tactus-web/videos/content/**/*.ts",
];

const watcher = chokidar.watch(watchPaths, {
  ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  ignoreInitial: true,
});

let running = false;
let pending = false;
let debounceTimer: NodeJS.Timeout | undefined;

const runTests = () => {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  const child = spawn(npmCmd, ["run", "bdd"], { stdio: "inherit" });
  child.on("exit", () => {
    running = false;
    if (pending) {
      pending = false;
      runTests();
    }
  });
};

const scheduleRun = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runTests, 100);
};

watcher.on("all", (_event, filePath) => {
  console.log(`[bdd:watch] change detected: ${filePath}`);
  scheduleRun();
});

watcher.on("ready", () => {
  console.log("[bdd:watch] watching for changes...");
  runTests();
});

process.on("SIGINT", async () => {
  await watcher.close();
  process.exit(0);
});
