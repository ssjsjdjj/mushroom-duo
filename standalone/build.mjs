import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");
await mkdir(resolve(output, "public"), { recursive: true });
const [client] = await Promise.all([
  build({
    absWorkingDir: root, entryPoints: [resolve(root, "standalone/client.tsx")],
    outdir: "dist/public", entryNames: "game-[hash]", bundle: true,
    platform: "browser", format: "esm", target: ["chrome90", "safari15"],
    jsx: "automatic", minify: true, metafile: true, tsconfigRaw: {},
    define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
  }),
  build({
    absWorkingDir: root, entryPoints: [resolve(root, "standalone/server.mjs")],
    outfile: "dist/server.mjs", bundle: true, platform: "node", format: "esm",
    target: "node24", packages: "external", tsconfigRaw: {}, logLevel: "warning",
  }),
]);
const cssFile = resolve(root, "app/globals.css");
const css = await postcss([tailwind({ base: resolve(root, "app"), optimize: true })])
  .process(await readFile(cssFile, "utf8"), { from: cssFile, to: resolve(output, "public/game.css") });
await writeFile(resolve(output, "public/game.css"), css.css);
await cp(resolve(root, "public"), resolve(output, "public"), { recursive: true });
await cp(resolve(root, "standalone/launch.mjs"), resolve(output, "launch.mjs"));
const clientPath = Object.keys(client.metafile.outputs).find(p => p.endsWith(".js"));
if (!clientPath) throw new Error("Client bundle was not generated");
await writeFile(resolve(output, "public/index.html"), `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="两部手机免登录，合作闯关、接力救援和挑战双人 Boss。"><title>蘑菇搭档 · 两个人，一起过关</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/game.css"></head><body class="antialiased"><div id="root"></div><script type="module" src="/${clientPath.split(/[\\/]/).pop()}"></script></body></html>`);
console.log("Built standalone game: dist/server.mjs + dist/public");
