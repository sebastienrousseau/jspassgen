// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { expect } from 'chai';
import { readFileSync } from 'node:fs';

// Self-referencing imports resolve through package.json "exports", so these
// are the specifiers a consumer writes after installing the package.
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

describe('package exports', function () {
  it('is published under the @sebastienrousseau scope', function () {
    expect(pkg.name).to.equal('@sebastienrousseau/jspassgen');
  });

  it('exposes PasswordGenerator from the package root', async function () {
    const root = await import('@sebastienrousseau/jspassgen');
    expect(root.default).to.be.a('function');
    expect(root.default).to.equal(root.PasswordGenerator);
  });

  it('exposes the core engine from the core subpath', async function () {
    const core = await import('@sebastienrousseau/jspassgen/core');
    expect(core.createService).to.be.a('function');
    expect(core.createQuickService).to.be.a('function');
  });

  it('exposes the Node adapters from the adapters/node subpath', async function () {
    const adapters = await import('@sebastienrousseau/jspassgen/adapters/node');
    expect(adapters.NodeCryptoRandom).to.be.a('function');
  });

  it('generates a password through the documented core example', async function () {
    const { createQuickService } = await import('@sebastienrousseau/jspassgen/core');
    const { NodeCryptoRandom } = await import(
      '@sebastienrousseau/jspassgen/adapters/node'
    );
    const service = createQuickService(new NodeCryptoRandom());
    const password = await service.generate({
      type: 'strong',
      length: 16,
      iteration: 3,
      separator: '-',
    });
    expect(password.split('-')).to.have.lengthOf(3);
  });

  it('exposes the worker pool from the workers subpath', async function () {
    const workers = await import('@sebastienrousseau/jspassgen/workers');
    expect(workers.PasswordWorkerPool).to.be.a('function');
  });
});
