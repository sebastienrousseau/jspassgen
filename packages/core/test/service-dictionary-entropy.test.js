// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { createService } from '../src/service.js';
import { MemoryDictionary, DEFAULT_WORD_LIST } from '../src/ports/DictionaryPort.js';

const counterRandom = () => {
  let next = 0;
  return {
    generateRandomBytes: async (n) => new Uint8Array(n),
    generateRandomInt: async (max) => {
      next += 1;
      return next % max;
    },
  };
};

const bits = (words, size) => Math.round(words * Math.log2(size) * 100) / 100;

describe('service entropy follows the injected dictionary', () => {
  it('reports memorable entropy from the default 48-word list, not 7776', async () => {
    const service = createService({}, { randomGenerator: counterRandom() });
    const result = await service.generate({
      type: 'memorable',
      iteration: 6,
      separator: '-',
      includeEntropy: true,
    });
    expect(DEFAULT_WORD_LIST.length).to.equal(48);
    expect(result.entropy).to.equal(bits(6, 48));
  });

  it('reports memorable entropy from a custom list size', async () => {
    const words = Array.from({ length: 1024 }, (_, i) => `w${i}`);
    const service = createService(
      {},
      { randomGenerator: counterRandom(), dictionary: new MemoryDictionary(words) }
    );
    const result = await service.generate({
      type: 'memorable',
      iteration: 5,
      separator: '-',
      includeEntropy: true,
    });
    expect(result.entropy).to.equal(bits(5, 1024));
  });

  it('keeps an explicit dictionarySize the caller passes', async () => {
    const service = createService({}, { randomGenerator: counterRandom() });
    const result = await service.generate({
      type: 'memorable',
      iteration: 4,
      separator: '-',
      dictionarySize: 48,
      includeEntropy: true,
    });
    expect(result.entropy).to.equal(bits(4, 48));
  });
});
