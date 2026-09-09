// Audit every locked version, including workspace dev and optional packages.
import { readFile } from "node:fs/promises";
import lockfile from "@yarnpkg/lockfile";

const parsed = lockfile.parse(await readFile(new URL("../yarn.lock", import.meta.url), "utf8"));
if (parsed.type !== "success") throw new Error("Cannot audit an invalid or conflicted Yarn lockfile");

const versions = new Map();
for (const [selector, entry] of Object.entries(parsed.object)) {
  const actual = selector.includes("@npm:") ? selector.split("@npm:")[1] : selector;
  const name = actual.slice(0, actual.lastIndexOf("@"));
  if (!name || !entry.version) throw new Error(`Missing package name/version for ${selector}`);
  if (!versions.has(name)) versions.set(name, new Set());
  versions.get(name).add(entry.version);
}
if (!versions.size) throw new Error("Refusing to audit an empty lockfile");

const packages = Object.fromEntries([...versions].map(([name, values]) => [name, [...values]]));
const response = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(packages),
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`Security registry returned HTTP ${response.status}`);
const advisories = await response.json();
if (!advisories || typeof advisories !== "object" || Array.isArray(advisories)) {
  throw new Error("Unexpected security registry response");
}
let count = 0;
for (const [name, findings] of Object.entries(advisories)) {
  if (!Array.isArray(findings)) throw new Error(`Invalid advisory list for ${name}`);
  for (const finding of findings) {
    count++;
    console.error(`${name}: ${finding.severity} — ${finding.title} (${finding.url})`);
  }
}
console.log(`Audited ${versions.size} packages / ${[...versions.values()].reduce((n, v) => n + v.size, 0)} locked versions: ${count} advisories`);
if (count) process.exitCode = 1;
