// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from "chai";
import { describe, it } from "mocha";

import * as nodeAdapters from "../../src/adapters/node/index.js";
import { createService } from "../../packages/core/src/index.js";
import { DEFAULT_WORD_LIST } from "../../packages/core/src/ports/DictionaryPort.js";

const EFF_WORD_COUNT = 7776;

describe("adapters/node entry point", () => {
  it("exports the EFF Diceware dictionary", async () => {
    expect(nodeAdapters.EFFDicewareDictionary).to.be.a("function");
    const dictionary = new nodeAdapters.EFFDicewareDictionary();
    expect(await dictionary.getWordCount()).to.equal(EFF_WORD_COUNT);
  });

  describe("createNodeAdapters", () => {
    it("builds every adapter, the EFF dictionary included", async () => {
      const adapters = nodeAdapters.createNodeAdapters();
      expect(adapters.randomGenerator).to.be.instanceOf(
        nodeAdapters.NodeCryptoRandom,
      );
      expect(adapters.logger).to.be.instanceOf(nodeAdapters.NodeConsoleLogger);
      expect(adapters.storage).to.be.instanceOf(nodeAdapters.NodeFsStorage);
      expect(adapters.clock).to.be.instanceOf(nodeAdapters.NodeSystemClock);
      expect(adapters.dictionary).to.be.instanceOf(
        nodeAdapters.EFFDicewareDictionary,
      );
      expect(await adapters.dictionary.getWordCount()).to.equal(EFF_WORD_COUNT);
    });

    it("passes logger and storage options through", () => {
      const adapters = nodeAdapters.createNodeAdapters({
        logger: { level: nodeAdapters.LogLevel.ERROR },
        storage: { basePath: "/tmp/jspassgen-test" },
      });
      expect(adapters.logger.level).to.equal(nodeAdapters.LogLevel.ERROR);
      expect(adapters.storage.basePath).to.equal("/tmp/jspassgen-test");
    });

    it("gives the core service the full EFF list for memorable passwords", async () => {
      const service = createService({}, nodeAdapters.createNodeAdapters());
      const placeholder = new Set(DEFAULT_WORD_LIST);
      let outsidePlaceholder = 0;
      for (let i = 0; i < 20; i++) {
        const password = await service.generate({
          type: "memorable",
          iteration: 4,
          separator: "-",
        });
        outsidePlaceholder += password
          .split("-")
          .filter((word) => !placeholder.has(word)).length;
      }
      // 80 draws from 7776 words: all of them landing in the 48-word
      // placeholder has probability (48/7776)^80, effectively zero.
      expect(outsidePlaceholder).to.be.above(0);
    });
  });
});
