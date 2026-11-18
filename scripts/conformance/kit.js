// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Builds the jspassgen conformance kit (docs/adr/0001-ecosystem-lockstep.md,
 * section 4) from packages/core. Every vector records the random draws the
 * core makes, in order, so a port must reproduce the algorithm exactly.
 *
 * @module scripts/conformance/kit
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createService,
  MemoryDictionary,
} from "../../packages/core/src/index.js";
import { CASES, ENTROPY_CASES, VALIDATION_CASES } from "./cases.js";

const ROOT = new URL("../../", import.meta.url);
const UINT32_RANGE = 2 ** 32;

/** Kit format version; bump when the file layout or semantics change. */
export const KIT_FORMAT = 1;

/** Absolute tolerance for comparing floating-point entropy values. */
export const FLOAT_TOLERANCE = 1e-9;

/**
 * Deterministic source that records every draw. It implements only the
 * required RandomGeneratorPort methods (it does not extend the port class,
 * whose optional methods would be seen as present), so the core takes its
 * per-draw path.
 */
export class RecordingRandom {
  constructor(seed) {
    this.seed = seed;
    this.counter = 0;
    this.draws = [];
  }

  nextUint32() {
    const digest = createHash("sha256")
      .update(`${this.seed}:${this.counter}`)
      .digest();
    this.counter += 1;
    return digest.readUInt32BE(0);
  }

  async generateRandomInt(max) {
    const limit = UINT32_RANGE - (UINT32_RANGE % max);
    let draw = this.nextUint32();
    while (draw >= limit) {
      draw = this.nextUint32();
    }
    const value = draw % max;
    this.draws.push([max, value]);
    return value;
  }

  async generateRandomBytes() {
    throw new Error("The conformance kit does not define byte draws yet");
  }
}

/**
 * Replays a recorded tape and fails on any divergence from it.
 */
export class ReplayRandom {
  constructor(draws) {
    this.draws = draws;
    this.position = 0;
  }

  async generateRandomInt(max) {
    const next = this.draws[this.position];
    if (!next) {
      throw new Error(
        `Draw ${this.position} requested past the end of the tape`,
      );
    }
    if (next[0] !== max) {
      throw new Error(
        `Draw ${this.position}: expected max ${next[0]}, got ${max}`,
      );
    }
    this.position += 1;
    return next[1];
  }

  async generateRandomBytes() {
    throw new Error("The conformance kit does not define byte draws yet");
  }

  get exhausted() {
    return this.position === this.draws.length;
  }
}

/** Reads the EFF diceware list exactly as the product ships it. */
export const readEffWordlist = () =>
  readFileSync(
    fileURLToPath(new URL("src/dictionaries/eff-diceware.json", ROOT)),
    "utf8",
  );

/** Word lists the kit can name, by id. */
export const wordlists = () => ({
  "eff-diceware": JSON.parse(readEffWordlist()).words,
});

/**
 * Creates a core service wired to the given random source. Every vector uses
 * the EFF list, as the product's entry points do; vectors name it explicitly.
 */
export const serviceFor = (randomGenerator, dictionaryId = "eff-diceware") =>
  createService(
    {},
    {
      randomGenerator,
      dictionary: new MemoryDictionary(wordlists()[dictionaryId]),
    },
  );

/** Runs one generation case and returns what the core produced. */
export const runCase = async (service, input) => {
  try {
    const result = await service.generate({ ...input, includeEntropy: true });
    return {
      password: result.password,
      entropy: result.entropy,
      securityLevel: result.securityLevel,
    };
  } catch (error) {
    return { error: error.message };
  }
};

const buildVector = async ({ id, input, dictionary = "eff-diceware" }) => {
  const random = new RecordingRandom(id);
  const expected = await runCase(serviceFor(random, dictionary), input);
  return { id, input, dictionary, draws: random.draws, expected };
};

const groupByType = (vectors) => {
  const groups = {};
  for (const vector of vectors) {
    const key = "error" in vector.expected ? "errors" : vector.input.type;
    groups[key] = groups[key] ?? [];
    groups[key].push(vector);
  }
  return groups;
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

const buildValidation = () => {
  const service = serviceFor(new RecordingRandom("validation"));
  return VALIDATION_CASES.map(({ id, input }) => {
    const { isValid, errors } = service.validateConfig(input);
    return { id, input, expected: { isValid, errors } };
  });
};

const buildEntropy = () => {
  const service = serviceFor(new RecordingRandom("entropy"));
  return ENTROPY_CASES.map(({ id, input }) => {
    const { totalBits, securityLevel, recommendation, perUnit } =
      service.calculateEntropy(input);
    return {
      id,
      input,
      expected: { totalBits, securityLevel, recommendation, perUnit },
    };
  });
};

const buildMeta = (coreVersion) => ({
  format: KIT_FORMAT,
  coreVersion,
  floatTolerance: FLOAT_TOLERANCE,
  draws:
    "Each draw is [max, value]: one call to generateRandomInt(max) that returned value. " +
    "A port replays the draws in order and must request the same max each time and use every draw.",
  generation:
    "Call generate(input) with includeEntropy; expect password, entropy and securityLevel, or an error message.",
});

/**
 * Builds every kit file in memory.
 *
 * @returns {Promise<Map<string, string>>} Kit-relative path to file contents.
 */
export const buildKit = async () => {
  const { version } = JSON.parse(
    readFileSync(fileURLToPath(new URL("package.json", ROOT)), "utf8"),
  );
  const files = new Map();

  const vectors = await Promise.all(CASES.map(buildVector));
  for (const [type, group] of Object.entries(groupByType(vectors))) {
    files.set(`vectors/${type}.json`, json({ group: type, vectors: group }));
  }
  files.set("validation.json", json({ cases: buildValidation() }));
  files.set("entropy.json", json({ cases: buildEntropy() }));
  files.set("wordlists/eff-diceware.json", readEffWordlist());
  files.set("meta.json", json(buildMeta(version)));

  const sums = [...files.keys()]
    .sort()
    .map((path) => `${sha256(files.get(path))}  ${path}`)
    .join("\n");
  files.set("SHA256SUMS", `${sums}\n`);
  return files;
};
