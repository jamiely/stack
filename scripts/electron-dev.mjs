import { spawn } from "node:child_process";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root: projectRoot, server: { host: "127.0.0.1", port: 4173, strictPort: true } });
await server.listen();
const env = { ...process.env, VITE_DEV_SERVER_URL: "http://127.0.0.1:4173" };
delete env.ELECTRON_RUN_AS_NODE;
delete env.STACK_ELECTRON_SMOKE;
const child = spawn(electronPath, [projectRoot], { cwd: projectRoot, env, stdio: "inherit" });
let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  child.kill();
  await server.close();
  process.exitCode = code;
}
child.on("error", (error) => {
  console.error(error);
  void stop(1);
});
child.on("close", (code) => void stop(code ?? 1));
process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));
