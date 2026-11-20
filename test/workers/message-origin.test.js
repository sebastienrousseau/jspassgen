// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { describe, it } from "mocha";

import { isTrustedOrigin } from "../../src/workers/message-origin.js";

describe("worker message origin", () => {
  const own = "https://jspassgen.com";

  it("accepts the creator's messages, which carry no origin", () => {
    expect(isTrustedOrigin("", own)).to.equal(true);
    expect(isTrustedOrigin(undefined, own)).to.equal(true);
  });

  it("accepts a message from the worker's own origin", () => {
    expect(isTrustedOrigin(own, own)).to.equal(true);
  });

  it("refuses a message from any other origin", () => {
    expect(isTrustedOrigin("https://evil.example", own)).to.equal(false);
    expect(isTrustedOrigin("null", own)).to.equal(false);
  });

  it("refuses a named origin when its own origin is unknown", () => {
    expect(isTrustedOrigin("https://evil.example", undefined)).to.equal(false);
  });
});
