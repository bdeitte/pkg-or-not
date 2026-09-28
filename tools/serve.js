// Minimal static file server for local development. ES modules need http,
// not file://, and the repo has no npm dependencies, so this uses node:http.
//
//   node tools/serve.js [port]     # default: 8000, serves site/

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export function createStaticServer(root) {
  const base = resolve(root);
  return createServer(async (req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch {
      res.writeHead(400).end("Bad request");
      return;
    }
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(join(base, path));
    try {
      if (!file.startsWith(base + sep)) throw new Error("outside root");
      if (!(await stat(file)).isFile()) throw new Error("not a file");
      const body = await readFile(file);
      const type = TYPES[extname(file)] ?? "application/octet-stream";
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8000);
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "site");
  createStaticServer(root).listen(port, () => {
    console.log(`Serving site/ on http://localhost:${port}`);
  });
}
