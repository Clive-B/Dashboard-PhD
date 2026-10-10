import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
await access(path.join(standaloneRoot, "server.js"));

const child = spawn(process.execPath, ["server.js"], {
  cwd: standaloneRoot,
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: "3001", AIC_HOME_SERVER_MODE: "true" },
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Could not start the AIC Scholar home server:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
