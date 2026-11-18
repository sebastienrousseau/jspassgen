// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Clipboard clearing for `--clipboard`.
 *
 * The CLI exits as soon as it has printed the password, so a timer inside
 * it never fires. The clear is handed to a detached Node.js process
 * (`clipboard-clear.js`) that outlives the CLI. That process receives only
 * a SHA-256 digest of the password, over stdin rather than its command
 * line, and clears the clipboard only if it still holds the same text.
 *
 * @module cli/clipboard
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

/** How long a copied password stays on the clipboard, in milliseconds. */
export const CLIPBOARD_TTL_MS = 45000;

const CLEARER = fileURLToPath(new URL("./clipboard-clear.js", import.meta.url));

/**
 * SHA-256 of a string, as lowercase hex.
 *
 * @param {string} text - The text to digest.
 * @returns {string} The hex digest.
 */
export const digest = (text) =>
  createHash("sha256").update(String(text)).digest("hex");

/**
 * Starts a detached process that clears the clipboard after `ttlMs` if it
 * still holds `text`.
 *
 * @param {string} text - The text that was copied.
 * @param {number} [ttlMs=CLIPBOARD_TTL_MS] - Delay before clearing.
 * @param {Object} [deps] - Injected dependencies, for tests.
 * @param {Function} [deps.spawnFn=spawn] - `child_process.spawn`.
 * @returns {import("node:child_process").ChildProcess} The clearing process.
 */
export function scheduleClipboardClear(
  text,
  ttlMs = CLIPBOARD_TTL_MS,
  { spawnFn = spawn } = {},
) {
  const child = spawnFn(process.execPath, [CLEARER, String(ttlMs)], {
    detached: true,
    stdio: ["pipe", "ignore", "ignore"],
    windowsHide: true,
  });
  child.stdin.end(`${digest(text)}\n`);
  child.unref();
  return child;
}

/**
 * Clears the clipboard if its content still has the expected digest.
 *
 * @param {{read: Function, write: Function}} clipboard - A clipboardy-like API.
 * @param {string} expectedDigest - SHA-256 hex of the copied text.
 * @returns {Promise<boolean>} Whether the clipboard was cleared.
 */
export async function clearIfUnchanged(clipboard, expectedDigest) {
  const current = await clipboard.read();
  if (digest(current) !== expectedDigest) {
    return false;
  }
  await clipboard.write("");
  return true;
}

const DIGEST = /^[0-9a-f]{64}$/;

/**
 * The clearing process's work: wait `ttlArg` milliseconds, then clear the
 * clipboard if it still holds the text whose digest is `input`. Invalid
 * arguments do nothing. Errors are swallowed: the CLI has already exited
 * and nobody is waiting on this process.
 *
 * @param {Object} options - Arguments.
 * @param {string} options.ttlArg - Delay in milliseconds, as a string.
 * @param {string} options.input - The digest read from stdin.
 * @param {Function} options.loadClipboard - Resolves to a clipboardy-like API.
 * @param {Function} [options.wait] - Resolves after a delay.
 * @returns {Promise<boolean>} Whether the clipboard was cleared.
 */
export async function runClearer({
  ttlArg,
  input,
  loadClipboard,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const ttlMs = Number(ttlArg);
  const expected = String(input).trim();
  if (!Number.isInteger(ttlMs) || ttlMs < 0 || !DIGEST.test(expected)) {
    return false;
  }
  await wait(ttlMs);
  try {
    return await clearIfUnchanged(await loadClipboard(), expected);
  } catch {
    return false;
  }
}
