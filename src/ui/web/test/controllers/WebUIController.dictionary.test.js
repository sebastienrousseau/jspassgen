// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'node:fs';

if (typeof global !== 'undefined' && !global.crypto) {
  const { webcrypto } = await import('crypto');
  global.crypto = webcrypto;
}

const { createWebUIController } = await import('../../controllers/WebUIController.js');
const { FormState } = await import('../../state/FormState.js');
const { MemoryStorage } = await import('../../../../../packages/core/src/ports/StoragePort.js');

const effWords = new Set(
  JSON.parse(
    readFileSync(new URL('../../../../dictionaries/eff-diceware.json', import.meta.url), 'utf8')
  ).words
);

const generate = (type, iteration) =>
  createWebUIController({ storage: new MemoryStorage() }).generate(
    new FormState({ type, iteration: String(iteration), separator: '-' })
  );

describe('WebUIController uses the EFF word list', () => {
  for (const type of ['memorable', 'diceware']) {
    it(`draws ${type} words from the 7776-word EFF list`, async () => {
      const result = await generate(type, 6);
      const words = result.password.split('-');
      expect(words).to.have.length(6);
      for (const word of words) {
        expect(effWords.has(word), word).to.equal(true);
      }
    });
  }
});
