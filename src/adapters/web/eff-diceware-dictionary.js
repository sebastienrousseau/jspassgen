// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * EFF diceware word list for browsers and Web Workers.
 *
 * The Node.js adapter reads the list with `require`, which browsers lack;
 * this one imports the same JSON file as a module, so bundlers inline it and
 * native ES module loaders fetch it. Without it the web entry points fell
 * back to the core's 48-word placeholder list.
 *
 * @module adapters/web/eff-diceware-dictionary
 */

import { MemoryDictionary } from "../../../packages/core/src/ports/DictionaryPort.js";
import effDiceware from "../../dictionaries/eff-diceware.json" with { type: "json" };

/**
 * Creates a dictionary port holding the 7776-word EFF diceware list.
 *
 * @returns {MemoryDictionary} The dictionary port.
 */
export const createEffDicewareDictionary = () =>
  new MemoryDictionary(effDiceware.words);
