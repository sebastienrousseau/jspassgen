// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  CLIPBOARD_TTL_MS,
  clearIfUnchanged,
  fingerprint,
  matchesFingerprint,
  runClearer,
  scheduleClipboardClear,
} from "../../src/cli/clipboard.js";
import { spawnSync } from "node:child_process";
import { scryptSync } from "node:crypto";

const SECRET = "correct-horse-battery-staple";

/** A fake child process that records what the parent sends it. */
function fakeSpawn() {
  const calls = [];
  const spawnFn = (command, args, options) => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.received = "";
    child.stdin.on("data", (chunk) => {
      child.received += chunk;
    });
    child.unrefCalled = false;
    child.unref = () => {
      child.unrefCalled = true;
    };
    calls.push({ command, args, options, child });
    return child;
  };
  return { spawnFn, calls };
}

/** A fake clipboard holding one string. */
function fakeClipboard(initial) {
  const clipboard = {
    value: initial,
    read: async () => clipboard.value,
    write: async (text) => {
      clipboard.value = text;
    },
  };
  return clipboard;
}

describe("CLI clipboard clear", () => {
  it("clears after 45 seconds by default", () => {
    expect(CLIPBOARD_TTL_MS).to.equal(45000);
  });

  it("hands the clear to a detached process that outlives the CLI", () => {
    const { spawnFn, calls } = fakeSpawn();
    scheduleClipboardClear(SECRET, CLIPBOARD_TTL_MS, { spawnFn });

    expect(calls).to.have.length(1);
    const [{ command, args, options, child }] = calls;
    expect(command).to.equal(process.execPath);
    expect(args[0]).to.equal(
      fileURLToPath(
        new URL("../../src/cli/clipboard-clear.js", import.meta.url),
      ),
    );
    expect(options.detached).to.equal(true);
    expect(child.unrefCalled).to.equal(true);
  });

  it("sends only a salted fingerprint, over stdin, never the password", () => {
    const { spawnFn, calls } = fakeSpawn();
    scheduleClipboardClear(SECRET, 1234, { spawnFn });

    const [{ args, child }] = calls;
    expect(args.join(" ")).to.not.include(SECRET);
    expect(args.slice(1)).to.deep.equal(["1234"]);
    expect(child.received).to.not.include(SECRET);
    const sent = child.received.trim();
    expect(sent).to.match(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect(args.join(" ")).to.not.include(sent);
    expect(matchesFingerprint(SECRET, sent)).to.equal(true);
  });

  it("salts every fingerprint, so equal passwords look different", () => {
    expect(fingerprint(SECRET)).to.not.equal(fingerprint(SECRET));
  });

  it("derives the fingerprint with scrypt, not a fast hash", () => {
    const salt = Buffer.alloc(16, 1);
    expect(fingerprint("abc", salt)).to.equal(
      `${salt.toString("hex")}:${scryptSync("abc", salt, 32).toString("hex")}`,
    );
  });

  it("rejects a malformed fingerprint", () => {
    for (const bad of ["", "zz", `${"0".repeat(32)}:${"0".repeat(63)}`]) {
      expect(matchesFingerprint(SECRET, bad)).to.equal(false);
    }
  });

  it("clears the clipboard when it still holds the password", async () => {
    const clipboard = fakeClipboard(SECRET);
    expect(await clearIfUnchanged(clipboard, fingerprint(SECRET))).to.equal(
      true,
    );
    expect(clipboard.value).to.equal("");
  });

  it("leaves the clipboard alone when the user copied something else", async () => {
    const clipboard = fakeClipboard("something the user copied later");
    expect(await clearIfUnchanged(clipboard, fingerprint(SECRET))).to.equal(
      false,
    );
    expect(clipboard.value).to.equal("something the user copied later");
  });
});

describe("CLI clipboard clearing process", () => {
  const noWait = async () => {};

  it("waits the TTL, then clears the unchanged clipboard", async () => {
    const clipboard = fakeClipboard(SECRET);
    let waited = null;
    const cleared = await runClearer({
      ttlArg: "45000",
      input: `${fingerprint(SECRET)}\n`,
      loadClipboard: async () => clipboard,
      wait: async (ms) => {
        waited = ms;
      },
    });
    expect(waited).to.equal(45000);
    expect(cleared).to.equal(true);
    expect(clipboard.value).to.equal("");
  });

  it("does nothing with a bad TTL or fingerprint", async () => {
    const clipboard = fakeClipboard(SECRET);
    const load = async () => clipboard;
    for (const [ttlArg, input] of [
      ["abc", fingerprint(SECRET)],
      ["-1", fingerprint(SECRET)],
      ["1.5", fingerprint(SECRET)],
      ["10", "not-a-fingerprint"],
      ["10", "a".repeat(64)],
      ["10", ""],
    ]) {
      expect(
        await runClearer({ ttlArg, input, loadClipboard: load, wait: noWait }),
      ).to.equal(false);
    }
    expect(clipboard.value).to.equal(SECRET);
  });

  it("swallows a clipboard that cannot be loaded or read", async () => {
    const cleared = await runClearer({
      ttlArg: "0",
      input: fingerprint(SECRET),
      loadClipboard: async () => {
        throw new Error("no clipboard");
      },
      wait: noWait,
    });
    expect(cleared).to.equal(false);
  });

  it("the entry script exits cleanly on invalid input", () => {
    const script = fileURLToPath(
      new URL("../../src/cli/clipboard-clear.js", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script, "abc"], {
      input: "not-a-fingerprint\n",
      timeout: 10000,
    });
    expect(result.status).to.equal(0);
  });
});
