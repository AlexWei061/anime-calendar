import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const directory = await mkdtemp(join(tmpdir(), "anime-calendar-http-"));
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  DATA_DIR: relative(process.cwd(), directory),
  APP_ORIGIN: origin,
  ALLOW_INSECURE_LOCALHOST: "1",
  TRUST_PROXY: "0",
  NEXT_TELEMETRY_DISABLED: "1",
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
};
const server = spawn(process.execPath, ["scripts/start.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
let startError;
server.on("error", (error) => { startError = error; });
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-20_000); });
}
const serverExit = new Promise((resolve) => {
  server.once("exit", resolve);
  server.once("error", resolve);
});
let testProcess;
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { interrupted = true; testProcess?.kill(signal); server.kill(signal); });
}

try {
  const deadline = Date.now() + 60_000;
  while (true) {
    if (startError) throw startError;
    if (interrupted) throw new Error("Tests interrupted");
    if (server.exitCode !== null || server.signalCode !== null) throw new Error("Test server exited before becoming ready");
    try {
      const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) break;
    } catch { /* wait for the owned server to start */ }
    if (Date.now() > deadline) throw new Error("Test server did not become healthy within 60 seconds");
    await delay(200);
  }
  const files = process.argv.length > 2 ? process.argv.slice(2)
    : (await readdir("tests")).filter((name) => name.endsWith(".test.mjs")).sort().map((name) => join("tests", name));
  testProcess = spawn(process.execPath, ["--test", ...files], {
    env: { ...env, TEST_BASE_URL: origin, TEST_DATA_DIR: directory },
    stdio: "inherit",
  });
  const [code] = await once(testProcess, "exit");
  process.exitCode = code ?? 1;
  if (process.exitCode) console.error(serverOutput);
} catch (error) {
  console.error(error.message, serverOutput);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  const forceStop = setTimeout(() => server.kill("SIGKILL"), 5000);
  await serverExit;
  clearTimeout(forceStop);
  await rm(directory, { recursive: true, force: true });
}
