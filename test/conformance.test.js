// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Replays the conformance kit through the core, as every port must, and
 * checks that the committed kit is what the core produces now.
 */

import { expect } from "chai";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildKit,
  FLOAT_TOLERANCE,
  ReplayRandom,
  runCase,
  serviceFor,
} from "../scripts/conformance/kit.js";

const KIT = new URL("../conformance/", import.meta.url);
const read = (path) => readFileSync(fileURLToPath(new URL(path, KIT)), "utf8");
const readJson = (path) => JSON.parse(read(path));

const vectorFiles = readdirSync(fileURLToPath(new URL("vectors/", KIT))).sort();

const expectSameResult = (actual, expected) => {
  if ("error" in expected) {
    expect(actual).to.deep.equal(expected);
    return;
  }
  expect(actual.password).to.deep.equal(expected.password);
  expect(actual.securityLevel).to.equal(expected.securityLevel);
  expect(Math.abs(actual.entropy - expected.entropy)).to.be.at.most(
    FLOAT_TOLERANCE,
  );
};

describe("conformance kit: integrity", () => {
  it("matches what the core produces now", async () => {
    const files = await buildKit();
    for (const [path, content] of files) {
      expect(read(path), path).to.equal(content);
    }
  });

  it("lists every kit file in SHA256SUMS with its digest", () => {
    const lines = read("SHA256SUMS").trim().split("\n");
    expect(lines.length).to.be.greaterThan(0);
    for (const line of lines) {
      const [digest, path] = line.split("  ");
      expect(
        createHash("sha256").update(read(path)).digest("hex"),
        path,
      ).to.equal(digest);
    }
  });
});

describe("conformance kit: vectors", () => {
  for (const file of vectorFiles) {
    describe(`vectors/${file}`, () => {
      for (const vector of readJson(`vectors/${file}`).vectors) {
        it(`${vector.id} replays draw for draw`, async () => {
          const random = new ReplayRandom(vector.draws);
          const actual = await runCase(
            serviceFor(random, vector.dictionary),
            vector.input,
          );
          expectSameResult(actual, vector.expected);
          expect(random.exhausted, "every draw used").to.equal(true);
        });
      }
    });
  }
});

describe("conformance kit: validation and entropy", () => {
  it("reproduces every validation result", () => {
    const service = serviceFor(new ReplayRandom([]));
    for (const { id, input, expected } of readJson("validation.json").cases) {
      const { isValid, errors } = service.validateConfig(input);
      expect({ isValid, errors }, id).to.deep.equal(expected);
    }
  });

  it("reproduces every entropy estimate", () => {
    const service = serviceFor(new ReplayRandom([]));
    for (const { id, input, expected } of readJson("entropy.json").cases) {
      const actual = service.calculateEntropy(input);
      expect(Math.abs(actual.totalBits - expected.totalBits), id).to.be.at.most(
        FLOAT_TOLERANCE,
      );
      expect(Math.abs(actual.perUnit - expected.perUnit), id).to.be.at.most(
        FLOAT_TOLERANCE,
      );
      expect(actual.securityLevel, id).to.equal(expected.securityLevel);
      expect(actual.recommendation, id).to.deep.equal(expected.recommendation);
    }
  });
});

describe("conformance kit: ReplayRandom", () => {
  it("rejects a draw with a different max", async () => {
    const random = new ReplayRandom([[64, 3]]);
    let message = "";
    await random.generateRandomInt(10).catch((error) => {
      message = error.message;
    });
    expect(message).to.equal("Draw 0: expected max 64, got 10");
  });

  it("rejects a draw past the end of the tape", async () => {
    const random = new ReplayRandom([]);
    let message = "";
    await random.generateRandomInt(64).catch((error) => {
      message = error.message;
    });
    expect(message).to.equal("Draw 0 requested past the end of the tape");
  });

  it("reports a partly used tape as not exhausted", async () => {
    const random = new ReplayRandom([
      [64, 1],
      [64, 2],
    ]);
    await random.generateRandomInt(64);
    expect(random.exhausted).to.equal(false);
  });
});
