// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  CLIPBOARD_TTL_MS,
  clearIfUnchanged,
  digest,
  runClearer,
  scheduleClipboardClear,
} from "../../src/cli/clipboard.js";
import { spawnSync } from "node:child_process";

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

  it("never puts the password or its digest on the command line", () => {
    const { spawnFn, calls } = fakeSpawn();
    scheduleClipboardClear(SECRET, 1234, { spawnFn });

    const [{ args, child }] = calls;
    const commandLine = args.join(" ");
    expect(commandLine).to.not.include(SECRET);
    expect(commandLine).to.not.include(digest(SECRET));
    expect(args.slice(1)).to.deep.equal(["1234"]);
    expect(child.received).to.equal(`${digest(SECRET)}\n`);
  });

  it("clears the clipboard when it still holds the password", async () => {
    const clipboard = fakeClipboard(SECRET);
    expect(await clearIfUnchanged(clipboard, digest(SECRET))).to.equal(true);
    expect(clipboard.value).to.equal("");
  });

  it("leaves the clipboard alone when the user copied something else", async () => {
    const clipboard = fakeClipboard("something the user copied later");
    expect(await clearIfUnchanged(clipboard, digest(SECRET))).to.equal(false);
    expect(clipboard.value).to.equal("something the user copied later");
  });

  it("digests with SHA-256", () => {
    expect(digest("abc")).to.equal(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("CLI clipboard clearing process", () => {
  const noWait = async () => {};

  it("waits the TTL, then clears the unchanged clipboard", async () => {
    const clipboard = fakeClipboard(SECRET);
    let waited = null;
    const cleared = await runClearer({
      ttlArg: "45000",
      input: `${digest(SECRET)}\n`,
      loadClipboard: async () => clipboard,
      wait: async (ms) => {
        waited = ms;
      },
    });
    expect(waited).to.equal(45000);
    expect(cleared).to.equal(true);
    expect(clipboard.value).to.equal("");
  });

  it("does nothing with a bad TTL or digest", async () => {
    const clipboard = fakeClipboard(SECRET);
    const load = async () => clipboard;
    for (const [ttlArg, input] of [
      ["abc", digest(SECRET)],
      ["-1", digest(SECRET)],
      ["1.5", digest(SECRET)],
      ["10", "not-a-digest"],
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
      input: digest(SECRET),
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
      input: "not-a-digest\n",
      timeout: 10000,
    });
    expect(result.status).to.equal(0);
  });
});
