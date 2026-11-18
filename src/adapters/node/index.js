// Copyright © 2022-2024 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Node.js adapters index - exports all Node.js-specific port implementations.
 *
 * @module adapters/node
 */

import { NodeCryptoRandom } from "./crypto-random.js";
import { NodeConsoleLogger, LogLevel } from "./console-logger.js";
import { NodeFsStorage } from "./fs-storage.js";
import { NodeSystemClock } from "./system-clock.js";
import { EFFDicewareDictionary } from "./eff-diceware-dictionary.js";

export {
  NodeCryptoRandom,
  NodeConsoleLogger,
  LogLevel,
  NodeFsStorage,
  NodeSystemClock,
  EFFDicewareDictionary,
};

/**
 * Creates a complete set of Node.js adapters for dependency injection.
 *
 * @param {Object} options - Configuration options for adapters.
 * @param {Object} options.logger - Logger options.
 * @param {Object} options.storage - Storage options.
 * @returns {Object} An object containing all adapter instances, including
 *   `dictionary`, the 7776-word EFF Diceware list, so a core service built
 *   from them draws memorable and diceware words from the full list.
 */
export function createNodeAdapters(options = {}) {
  return {
    randomGenerator: new NodeCryptoRandom(),
    logger: new NodeConsoleLogger(options.logger),
    storage: new NodeFsStorage(options.storage),
    clock: new NodeSystemClock(),
    dictionary: new EFFDicewareDictionary(),
  };
}
