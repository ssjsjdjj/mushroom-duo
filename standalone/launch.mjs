import { mkdirSync, chownSync } from "node:fs";
import { resolve } from "node:path";

// Railway mounts a new volume as root. Initialize its directory before dropping
// privileges, so the game can use persistent SQLite without running as root.
if (process.getuid?.() === 0) {
  const dataDir = resolve(process.env.DUO_DATA_DIR || "data");
  mkdirSync(dataDir, { recursive: true });
  chownSync(dataDir, 1000, 1000);
  process.setgid(1000);
  process.setuid(1000);
}
await import("./server.mjs");
