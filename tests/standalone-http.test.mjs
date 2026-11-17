import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function start(dataDir) {
  const child = spawn(process.execPath, ["dist/launch.mjs"], {
    cwd: root, env: { ...process.env, PORT: "0", HOST: "127.0.0.1", DUO_DATA_DIR: dataDir },
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Server startup timed out: " + output)); }, 10000);
    child.stdout.on("data", data => {
      output += data;
      const match = output.match(/ready on port (\d+)/);
      if (match) { clearTimeout(timer); resolve("http://127.0.0.1:" + match[1]); }
    });
    child.stderr.on("data", data => { output += data; });
    child.once("error", e => { clearTimeout(timer); reject(e); });
    child.once("exit", code => { clearTimeout(timer); reject(new Error("Server exited " + code + ": " + output)); });
  });
  return { origin, child };
}
async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => { child.once("exit", resolve); child.kill(); });
}

test("standalone HTTP adapter serves anonymous game, enforces room identities and persists saves across a process restart", async () => {
  const dataDir = await mkdtemp(resolve(tmpdir(), "mushroom-duo-test-"));
  let running;
  try {
    running = await start(dataDir);
    const api = async (body, status = 200) => {
      const response = await fetch(running.origin + "/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); assert.equal(response.status, status, data.error); return data;
    };
    const home = await fetch(running.origin + "/");
    assert.equal(home.status, 200); assert.equal(home.headers.get("location"), null);
    const html = await home.text(); assert.match(html, /蘑菇搭档/);
    const script = html.match(/src="([^"]+\.js)"/)[1];
    const bundle = await fetch(running.origin + script); assert.equal(bundle.status, 200);
    assert.match(bundle.headers.get("content-type"), /javascript/);
    assert.equal((await fetch(running.origin + "/healthz")).status, 200);
    assert.equal((await fetch(running.origin + "/game.css")).status, 200);
    assert.equal((await fetch(running.origin + "/favicon.svg")).status, 200);
    assert.equal((await fetch(running.origin + "/api/room")).status, 405);
    assert.equal((await fetch(running.origin + "/package.json")).status, 404);
    assert.equal((await fetch(running.origin + "/.env")).status, 404);
    assert.equal((await fetch(running.origin + "/%2e%2e%5cdata%5cmushroom-duo.sqlite")).status, 404);
    assert.equal((await fetch(running.origin + "/api/room", { method: "POST", body: "x".repeat(128 * 1024 + 1) })).status, 413);
    await api(null, 400);
    const first = await api({ action: "create", level: "factory" });
    const second = await api({ action: "join", code: first.room.code });
    assert.equal(first.slot, 0); assert.equal(second.slot, 1); assert.notEqual(first.token, second.token);
    await api({ action: "join", code: first.room.code }, 409);
    await api({ action: "poll", code: first.room.code, token: "forged" }, 401);
    const saved = await api({ action: "save", code: first.room.code, token: first.token, connection: 0, epoch: first.room.epoch });
    assert.equal(saved.save.mode, "factory");
    await stop(running.child);
    running = await start(dataDir);
    const persisted = await api({ action: "poll", code: first.room.code, token: first.token });
    assert.equal(persisted.room.code, first.room.code);
    assert.equal(persisted.room.level, "factory");
    const restored = await Promise.all([api({ action: "restore", saveKey: saved.save.key }), api({ action: "restore", saveKey: saved.save.key })]);
    assert.equal(restored[0].room.code, restored[1].room.code);
    assert.equal(restored[0].token, restored[1].token);
    assert.equal(restored[0].room.runId, first.room.runId);
  } finally {
    if (running) await stop(running.child);
    if (dirname(dataDir) !== resolve(tmpdir()) || !basename(dataDir).startsWith("mushroom-duo-test-")) throw new Error("Unexpected test data path");
    await rm(dataDir, { recursive: true, force: true });
  }
});
