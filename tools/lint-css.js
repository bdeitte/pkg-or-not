// Checks site CSS against the "widely available" Baseline with ESLint and
// @eslint/css. The repo has no npm dependencies, so ESLint is installed into a
// cache folder outside the repo on first run and reused after that.
//
//   node tools/lint-css.js [files ...]     # default: site/**/*.css
//
// Set PKG_OR_NOT_LINT_DIR to change the cache folder.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGES = ["eslint@10.11.0", "@eslint/css@2.0.0"];
const lintDir =
  process.env.PKG_OR_NOT_LINT_DIR ?? join(homedir(), ".cache", "pkg-or-not-lint");
const eslintBin = join(lintDir, "node_modules", ".bin", "eslint");
const configPath = join(lintDir, "eslint.config.js");
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const CONFIG = `import css from "@eslint/css";

export default [
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    rules: {
      "css/use-baseline": ["error", { available: "widely" }],
    },
  },
];
`;

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (!existsSync(eslintBin)) {
  mkdirSync(lintDir, { recursive: true });
  writeFileSync(
    join(lintDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2) + "\n",
  );
  console.error(`Installing ${PACKAGES.join(" ")} into ${lintDir}`);
  const status = run("npm", ["install", "--prefix", lintDir, ...PACKAGES], repoRoot);
  if (status !== 0) process.exit(status);
}
writeFileSync(configPath, CONFIG);

const files = process.argv.slice(2);
process.exit(run(eslintBin, ["-c", configPath, ...(files.length ? files : ["site/**/*.css"])], repoRoot));
