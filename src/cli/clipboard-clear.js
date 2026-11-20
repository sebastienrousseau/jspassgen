// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Detached clipboard clearer, started by `scheduleClipboardClear`.
 *
 * Usage: node clipboard-clear.js <ttl-ms>, with the salted scrypt
 * fingerprint of the copied text on stdin. The logic is `runClearer` in ./clipboard.js.
 *
 * @module cli/clipboard-clear
 */

import { runClearer } from "./clipboard.js";

let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
}

await runClearer({
  ttlArg: process.argv[2],
  input,
  loadClipboard: async () => (await import("clipboardy")).default,
});
