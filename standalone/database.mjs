import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(process.env.DUO_DATA_DIR || "data");
mkdirSync(dataDir, { recursive: true });
const sqlite = new DatabaseSync(resolve(dataDir, "mushroom-duo.sqlite"));
sqlite.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS duo_rooms (
  code TEXT PRIMARY KEY NOT NULL,
  state TEXT NOT NULL,
  version INTEGER DEFAULT 0 NOT NULL,
  expires INTEGER NOT NULL
);`);
const statements = new Map();

// Keep the existing room/save optimistic update protocol unchanged.
export const env = { DB: {
  prepare(sql) {
    if (!statements.has(sql)) statements.set(sql, sqlite.prepare(sql));
    const statement = statements.get(sql);
    return { bind(...args) {
      return {
        async first() { return statement.get(...args) ?? null; },
        async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; },
      };
    } };
  },
} };

export function pruneExpired() {
  sqlite.prepare("DELETE FROM duo_rooms WHERE expires < ?").run(Date.now());
}

export function closeDatabase() {
  sqlite.close();
}
