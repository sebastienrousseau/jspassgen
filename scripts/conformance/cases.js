// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Inputs for the conformance kit. Each id is also the seed of the
 * deterministic source that produced its draws, so ids must stay stable:
 * renaming one changes its vector.
 *
 * @module scripts/conformance/cases
 */

/** Generation cases: one vector each, valid or expected to fail. */
export const CASES = [
  {
    id: "strong-16x4-dash",
    input: { type: "strong", length: 16, iteration: 4, separator: "-" },
  },
  {
    id: "strong-8x1",
    input: { type: "strong", length: 8, iteration: 1, separator: "-" },
  },
  {
    id: "strong-32x2-dot",
    input: { type: "strong", length: 32, iteration: 2, separator: "." },
  },
  {
    id: "base64-12x3-dash",
    input: { type: "base64", length: 12, iteration: 3, separator: "-" },
  },
  {
    id: "base64-24x1",
    input: { type: "base64", length: 24, iteration: 1, separator: "-" },
  },
  {
    id: "memorable-4-dash",
    input: { type: "memorable", iteration: 4, separator: "-" },
  },
  {
    id: "memorable-6-space",
    input: { type: "memorable", iteration: 6, separator: " " },
  },
  {
    id: "quantum-32x1",
    input: {
      type: "quantum-resistant",
      length: 32,
      iteration: 1,
      separator: "-",
    },
  },
  {
    id: "quantum-48x2-dash",
    input: {
      type: "quantum-resistant",
      length: 48,
      iteration: 2,
      separator: "-",
    },
  },
  {
    id: "diceware-6-dash",
    input: { type: "diceware", iteration: 6, separator: "-" },
    dictionary: "eff-diceware",
  },
  {
    id: "diceware-8-space",
    input: { type: "diceware", iteration: 8, separator: " " },
    dictionary: "eff-diceware",
  },
  {
    id: "honeyword-12x5",
    input: { type: "honeyword", length: 12, iteration: 5, separator: "-" },
  },
  {
    id: "pronounceable-4-dash",
    input: { type: "pronounceable", iteration: 4, separator: "-" },
  },
  {
    id: "pronounceable-3-dot",
    input: { type: "pronounceable", iteration: 3, separator: "." },
  },
  {
    id: "custom-hex-10x2",
    input: {
      type: "custom",
      allowedChars: "0123456789abcdef",
      length: 10,
      iteration: 2,
      separator: "-",
    },
  },
  {
    id: "custom-forbidden-8x1",
    input: {
      type: "custom",
      allowedChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      forbiddenChars: "AEIOU",
      length: 8,
      iteration: 1,
      separator: "-",
    },
  },
  {
    id: "error-type-missing",
    input: { length: 16, iteration: 1, separator: "-" },
  },
  {
    id: "error-type-unknown",
    input: { type: "rot13", length: 16, iteration: 1, separator: "-" },
  },
  {
    id: "error-iteration-zero",
    input: { type: "strong", length: 16, iteration: 0, separator: "-" },
  },
  {
    id: "error-length-zero",
    input: { type: "strong", length: 0, iteration: 1, separator: "-" },
  },
  {
    id: "error-quantum-too-short",
    input: {
      type: "quantum-resistant",
      length: 16,
      iteration: 1,
      separator: "-",
    },
  },
  {
    id: "error-honeyword-single",
    input: { type: "honeyword", length: 12, iteration: 1, separator: "-" },
  },
  {
    id: "error-custom-all-forbidden",
    input: {
      type: "custom",
      allowedChars: "abc",
      forbiddenChars: "abc",
      length: 8,
      iteration: 1,
      separator: "-",
    },
  },
];

/** validateConfig cases. */
export const VALIDATION_CASES = [
  { id: "valid-strong", input: { type: "strong", length: 16, iteration: 4 } },
  { id: "valid-diceware", input: { type: "diceware", iteration: 6 } },
  { id: "missing-type", input: { length: 16, iteration: 1 } },
  { id: "unknown-type", input: { type: "rot13", length: 16 } },
  {
    id: "iteration-negative",
    input: { type: "strong", length: 16, iteration: -1 },
  },
  {
    id: "iteration-fraction",
    input: { type: "strong", length: 16, iteration: 1.5 },
  },
  {
    id: "length-over-max",
    input: { type: "strong", length: 1025, iteration: 1 },
  },
  {
    id: "quantum-under-min",
    input: { type: "quantum-resistant", length: 31, iteration: 1 },
  },
  {
    id: "custom-chars-not-string",
    input: { type: "custom", allowedChars: 42, length: 8 },
  },
];

/** calculateEntropy cases (no password, so the configuration alone decides). */
export const ENTROPY_CASES = [
  { id: "strong-16x4", input: { type: "strong", length: 16, iteration: 4 } },
  { id: "base64-12x3", input: { type: "base64", length: 12, iteration: 3 } },
  { id: "memorable-4", input: { type: "memorable", iteration: 4 } },
  {
    id: "quantum-32x1",
    input: { type: "quantum-resistant", length: 32, iteration: 1 },
  },
  { id: "diceware-6", input: { type: "diceware", iteration: 6 } },
  {
    id: "honeyword-12x5",
    input: { type: "honeyword", length: 12, iteration: 5 },
  },
  { id: "pronounceable-4", input: { type: "pronounceable", iteration: 4 } },
  {
    id: "custom-hex-10x2",
    input: {
      type: "custom",
      allowedChars: "0123456789abcdef",
      length: 10,
      iteration: 2,
    },
  },
];
