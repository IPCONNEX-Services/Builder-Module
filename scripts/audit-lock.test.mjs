import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const entry = new URL("./audit-lock.mjs", import.meta.url).href;
function run(response, status = 200) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", `
    globalThis.fetch = async (url, options) => {
      const packages = JSON.parse(options.body);
      if (!packages.cypress || !packages['@rollup/rollup-linux-x64-gnu']) {
        throw new Error('Development or optional dependencies were omitted');
      }
      return new Response(${JSON.stringify(JSON.stringify(response))}, { status: ${status} });
    };
    await import(${JSON.stringify(entry)});
  `], { encoding: "utf8" });
}

test("includes development and optional dependencies in a successful audit", () => {
  const result = run({});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 advisories/);
});

test("fails for a vulnerability in development tooling", () => {
  const result = run({ vitest: [{ severity: "moderate", title: "Test advisory", url: "https://example.com/advisory" }] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /vitest: moderate/);
});

test("fails when the registry is unavailable", () => {
  const result = run({}, 503);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTP 503/);
});

test("fails on an unexpected registry response", () => {
  const result = run({ error: "invalid response" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid advisory list/);
});
