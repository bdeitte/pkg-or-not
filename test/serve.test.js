import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStaticServer } from "../tools/serve.js";

let dir;
let server;
let base;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "serve-test-"));
  const root = join(dir, "site");
  mkdirSync(join(root, "js"), { recursive: true });
  writeFileSync(join(root, "index.html"), "<h1>hi</h1>");
  writeFileSync(join(root, "js", "a.js"), "export {};");
  writeFileSync(join(dir, "secret.txt"), "nope");
  server = createStaticServer(root);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

test("serves index.html for /", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/html/);
  assert.equal(await res.text(), "<h1>hi</h1>");
});

test("serves ES modules with a JavaScript content type", async () => {
  const res = await fetch(`${base}/js/a.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/javascript/);
});

test("ignores the query string", async () => {
  const res = await fetch(`${base}/js/a.js?v=1`);
  assert.equal(res.status, 200);
});

test("returns 404 for missing files and directories", async () => {
  assert.equal((await fetch(`${base}/missing.js`)).status, 404);
  assert.equal((await fetch(`${base}/js`)).status, 404);
});

test("does not serve files outside the root", async () => {
  const res = await fetch(`${base}/..%2fsecret.txt`);
  assert.equal(res.status, 404);
});
