// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

// Property-based tests of the core generators: fast-check draws the
// configuration (lengths, chunk counts, separators, character sets) and
// every generated password must satisfy the generator's contract.

import { expect } from "chai";
import fc from "fast-check";
import { describe, it } from "mocha";

import { NodeCryptoRandom } from "../../src/adapters/node/index.js";
import {
  BASE64_CHARSET,
  calculateMemorablePasswordEntropy,
  calculateStrongPasswordEntropy,
  createService,
  MemoryDictionary,
} from "../../packages/core/src/index.js";

const RUNS = { numRuns: 200 };
const service = createService({}, { randomGenerator: new NodeCryptoRandom() });

// Separators that cannot occur inside a chunk of the alphabets under test.
const separator = fc.constantFrom("-", "_", ".", ":", "|");
const length = fc.integer({ min: 1, max: 64 });
const iteration = fc.integer({ min: 1, max: 8 });

const chunksOf = (password, sep) => password.split(sep);
const onlyFrom = (text, alphabet) =>
  [...text].every((char) => alphabet.includes(char));

describe("core generators: properties", () => {
  it("strong: iteration chunks of exactly length base64 characters", async () => {
    await fc.assert(
      fc.asyncProperty(length, iteration, separator, async (len, it, sep) => {
        const password = await service.generate({
          type: "strong",
          length: len,
          iteration: it,
          separator: sep,
        });
        const chunks = chunksOf(password, sep);
        expect(chunks).to.have.lengthOf(it);
        for (const chunk of chunks) {
          expect(chunk).to.have.lengthOf(len);
          expect(onlyFrom(chunk, BASE64_CHARSET)).to.equal(true);
        }
      }),
      RUNS,
    );
  });

  it("custom: never emits a character outside allowed minus forbidden", async () => {
    const pool = "abcdefghijklmnopqrstuvwxyz0123456789";
    const allowedAndForbidden = fc
      .uniqueArray(fc.constantFrom(...pool), { minLength: 2, maxLength: 36 })
      // The core refuses a set of fewer than 2 characters; keep 2 or more.
      .chain((allowed) =>
        fc
          .subarray(allowed, { maxLength: allowed.length - 2 })
          .map((forbidden) => [allowed.join(""), forbidden.join("")]),
      );
    await fc.assert(
      fc.asyncProperty(
        allowedAndForbidden,
        length,
        iteration,
        async ([allowedChars, forbiddenChars], len, it) => {
          const password = await service.generate({
            type: "custom",
            allowedChars,
            forbiddenChars,
            length: len,
            iteration: it,
            separator: "-",
          });
          const permitted = [...allowedChars]
            .filter((char) => !forbiddenChars.includes(char))
            .join("");
          const chunks = chunksOf(password, "-");
          expect(chunks).to.have.lengthOf(it);
          for (const chunk of chunks) {
            expect(chunk).to.have.lengthOf(len);
            expect(onlyFrom(chunk, permitted)).to.equal(true);
          }
        },
      ),
      RUNS,
    );
  });

  it("custom: refuses a set left with fewer than 2 characters", async () => {
    const pool = "abcdefghijklmnopqrstuvwxyz0123456789";
    const allowedAndForbidden = fc
      .uniqueArray(fc.constantFrom(...pool), { minLength: 1, maxLength: 36 })
      .chain((allowed) =>
        fc
          .integer({ min: 0, max: allowed.length - 1 })
          .map((keep) => [
            allowed.join(""),
            allowed.filter((_, i) => i !== keep).join(""),
          ]),
      );
    await fc.assert(
      fc.asyncProperty(
        allowedAndForbidden,
        async ([allowedChars, forbidden]) => {
          let rejected = false;
          try {
            await service.generate({
              type: "custom",
              allowedChars,
              forbiddenChars: forbidden,
              length: 8,
            });
          } catch {
            rejected = true;
          }
          expect(rejected).to.equal(true);
        },
      ),
      RUNS,
    );
  });

  it("memorable: iteration words, each from the dictionary", async () => {
    const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
    const dictService = createService(
      {},
      {
        randomGenerator: new NodeCryptoRandom(),
        dictionary: new MemoryDictionary(words),
      },
    );
    await fc.assert(
      fc.asyncProperty(iteration, separator, async (it, sep) => {
        const password = await dictService.generate({
          type: "memorable",
          iteration: it,
          separator: sep,
        });
        const drawn = chunksOf(password, sep);
        expect(drawn).to.have.lengthOf(it);
        for (const word of drawn) {
          expect(words.map((w) => w.toLowerCase())).to.include(
            word.toLowerCase(),
          );
        }
      }),
      RUNS,
    );
  });

  it("entropy grows with every extra character or word", () => {
    fc.assert(
      fc.property(length, iteration, (len, it) => {
        const strong = (l, i) =>
          calculateStrongPasswordEntropy({ length: l, iteration: i });
        expect(strong(len + 1, it)).to.be.above(strong(len, it));
        expect(strong(len, it + 1)).to.be.above(strong(len, it));
        expect(strong(len, it)).to.equal(len * it * 6);
        const memorable = (i) =>
          calculateMemorablePasswordEntropy({ iteration: i });
        expect(memorable(it + 1)).to.be.above(memorable(it));
      }),
      RUNS,
    );
  });

  it("rejects a length that is not a positive integer", async () => {
    const badLength = fc.oneof(
      fc.integer({ max: 0 }),
      fc.double({ min: 0.01, max: 64, noInteger: true, noNaN: true }),
    );
    await fc.assert(
      fc.asyncProperty(badLength, async (len) => {
        let rejected = false;
        try {
          await service.generate({ type: "strong", length: len });
        } catch {
          rejected = true;
        }
        expect(rejected).to.equal(true);
      }),
      RUNS,
    );
  });
});
