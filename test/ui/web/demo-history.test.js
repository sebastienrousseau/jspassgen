// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { readFileSync } from "node:fs";
import { describe, it } from "mocha";

import {
  LEGACY_HISTORY_KEY,
  createPasswordHistory,
  purgeStoredHistory,
} from "../../../src/ui/web/demo/scripts/history.js";

/** A Storage-like object that records every write. */
function recordingStorage(initial = {}) {
  const data = { ...initial };
  const writes = [];
  return {
    data,
    writes,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      writes.push([key, value]);
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe("Web demo password history", () => {
  it("keeps the most recent passwords in memory, newest first", () => {
    const history = createPasswordHistory(3);
    ["a", "b", "c", "d"].forEach((p) => history.add(p));
    expect(history.list()).to.deep.equal(["d", "c", "b"]);
  });

  it("ignores a password already in the list", () => {
    const history = createPasswordHistory(5);
    history.add("same");
    history.add("same");
    expect(history.list()).to.deep.equal(["same"]);
  });

  it("clears", () => {
    const history = createPasswordHistory(5);
    history.add("x");
    history.clear();
    expect(history.list()).to.deep.equal([]);
  });

  it("returns a copy, so callers cannot change the list", () => {
    const history = createPasswordHistory(5);
    history.add("x");
    history.list().push("injected");
    expect(history.list()).to.deep.equal(["x"]);
  });

  it("deletes passwords that earlier versions stored in localStorage", () => {
    const storage = recordingStorage({
      [LEGACY_HISTORY_KEY]: JSON.stringify(["old-secret"]),
      other: "kept",
    });
    purgeStoredHistory(storage);
    expect(storage.getItem(LEGACY_HISTORY_KEY)).to.equal(null);
    expect(storage.getItem("other")).to.equal("kept");
  });

  it("does not throw when storage is unavailable", () => {
    expect(() => purgeStoredHistory(undefined)).to.not.throw();
    expect(() =>
      purgeStoredHistory({
        removeItem: () => {
          throw new Error("SecurityError");
        },
      }),
    ).to.not.throw();
  });

  it("the demo never writes passwords to web storage", () => {
    const main = readFileSync(
      new URL("../../../src/ui/web/demo/scripts/main.js", import.meta.url),
      "utf8",
    );
    expect(main).to.not.match(/setItem\(\s*STORAGE_KEY_HISTORY/);
    expect(main).to.not.match(
      /(local|session)Storage\.setItem\([^)]*[Hh]istory/,
    );
  });
});
