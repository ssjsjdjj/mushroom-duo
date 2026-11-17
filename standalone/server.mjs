import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, dirname, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { POST } from "../app/api/room/route.ts";
import { closeDatabase, pruneExpired } from "./database.mjs";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "public");
const bodyLimit = 128 * 1024;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const json = (res, status, value) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/healthz" && ["GET", "HEAD"].includes(req.method)) {
      res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
      return res.end(req.method === "HEAD" ? undefined : "ok");
    }
    if (url.pathname === "/api/room") {
      if (req.method !== "POST") return json(res, 405, { error: "请使用 POST 请求" });
      if (Number(req.headers["content-length"]) > bodyLimit) { req.resume(); return json(res, 413, { error: "请求过大" }); }
      let length = 0; const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > bodyLimit) { req.resume(); return json(res, 413, { error: "请求过大" }); }
        chunks.push(chunk);
      }
      const reply = await POST(new Request("http://localhost/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: Buffer.concat(chunks) }));
      res.writeHead(reply.status, { ...Object.fromEntries(reply.headers), "X-Content-Type-Options": "nosniff" });
      return res.end(Buffer.from(await reply.arrayBuffer()));
    }
    if (!["GET", "HEAD"].includes(req.method)) return json(res, 405, { error: "不支持的请求方法" });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return json(res, 400, { error: "网址格式不正确" }); }
    if (pathname.includes("\0") || pathname.includes("\\") || pathname.split("/").some(p => p.startsWith("."))) return json(res, 404, { error: "页面不存在" });
    const filename = resolve(publicDir, pathname === "/" ? "index.html" : "." + pathname);
    if (!filename.startsWith(publicDir + sep)) return json(res, 404, { error: "页面不存在" });
    let info;
    try { info = await stat(filename); } catch { return json(res, 404, { error: "页面不存在" }); }
    if (!info.isFile()) return json(res, 404, { error: "页面不存在" });
    res.writeHead(200, {
      "Content-Type": types[extname(filename)] || "application/octet-stream",
      "Content-Length": info.size, "X-Content-Type-Options": "nosniff",
      "Cache-Control": /game-[A-Z0-9]+\.js$/.test(filename) ? "public,max-age=31536000,immutable" : "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    const stream = createReadStream(filename);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  } catch (error) {
    if (!res.headersSent) json(res, 500, { error: "服务暂时不可用，请重试" });
    else res.destroy();
    console.error("Request failed:", error instanceof Error ? error.name : "unknown");
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
pruneExpired();
const cleanup = setInterval(pruneExpired, 15 * 60 * 1000);
cleanup.unref();
server.listen(Number(process.env.PORT || 3000), process.env.HOST || "0.0.0.0", () => {
  console.log(`Mushroom Duo ready on port ${server.address().port}`);
});
function shutdown() {
  clearInterval(cleanup);
  server.close(() => { closeDatabase(); process.exit(0); });
  server.closeAllConnections();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
