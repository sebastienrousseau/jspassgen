#!/usr/bin/env node
// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Writes the conformance kit to conformance/, or with --check, exits 1 if
 * the committed kit differs from what the core produces now.
 *
 * Usage: node scripts/conformance/generate.js [--check]
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildKit } from "./kit.js";

const KIT_DIR = fileURLToPath(new URL("../../conformance/", import.meta.url));
const GENERATED_DIRS = ["vectors", "wordlists"];
const HAND_WRITTEN = new Set(["README.md"]);

const listFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(KIT_DIR, join(entry.parentPath, entry.name)))
    .filter((path) => !HAND_WRITTEN.has(path));

const write = (files) => {
  for (const sub of GENERATED_DIRS) {
    rmSync(join(KIT_DIR, sub), { recursive: true, force: true });
  }
  for (const [path, content] of files) {
    mkdirSync(dirname(join(KIT_DIR, path)), { recursive: true });
    writeFileSync(join(KIT_DIR, path), content);
  }
  console.log(`Wrote ${files.size} files to conformance/`);
};

const check = (files) => {
  const problems = [];
  for (const [path, content] of files) {
    let current = null;
    try {
      current = readFileSync(join(KIT_DIR, path), "utf8");
    } catch {
      problems.push(`missing: ${path}`);
      continue;
    }
    if (current !== content) problems.push(`differs: ${path}`);
  }
  for (const path of listFiles(KIT_DIR)) {
    if (!files.has(path)) problems.push(`unexpected: ${path}`);
  }
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error("Run `npm run conformance:generate` and commit the result.");
    process.exit(1);
  }
  console.log(`conformance/ matches the core (${files.size} files)`);
};

const files = await buildKit();
if (process.argv.includes("--check")) {
  check(files);
} else {
  write(files);
}
