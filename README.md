<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

<p align="center">
  <img src="https://raw.githubusercontent.com/sebastienrousseau/jspassgen/main/.github/assets/logo.svg" alt="jspassgen logo" width="128" />
</p>

<h1 align="center">jspassgen</h1>

<p align="center">
  Generates passwords and passphrases from the platform CSPRNG, as a Node.js library, a command line, a web UI and Web Workers, with the entropy of every result.
</p>

<p align="center">
  <a href="https://github.com/sebastienrousseau/jspassgen/actions/workflows/quality-gates.yml"><img src="https://img.shields.io/github/actions/workflow/status/sebastienrousseau/jspassgen/quality-gates.yml?branch=main&style=for-the-badge&logo=github" alt="Build" height="28" /></a>
  <a href="https://www.npmjs.com/package/@sebastienrousseau/jspassgen"><img src="https://img.shields.io/npm/v/@sebastienrousseau/jspassgen?style=for-the-badge&color=fc8d62&logo=npm" alt="Registry" height="28" /></a>
  <a href="https://github.com/sebastienrousseau/jspassgen/blob/main/docs/API.md"><img src="https://img.shields.io/badge/docs-API-blue?style=for-the-badge&labelColor=555555&logo=readthedocs" alt="Docs" height="28" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/sebastienrousseau/jspassgen"><img src="https://img.shields.io/ossf-scorecard/github.com/sebastienrousseau/jspassgen?style=for-the-badge&label=OpenSSF%20Scorecard&logo=openssf" alt="OpenSSF Scorecard" height="28" /></a>
  <a href="LICENSE-APACHE"><img src="https://img.shields.io/badge/license-Apache--2.0%20OR%20MIT-blue.svg?style=for-the-badge" alt="License: Apache-2.0 OR MIT" height="28" /></a>
  <a href="#requirements"><img src="https://img.shields.io/badge/Node.js-22%2B-93450a.svg?style=for-the-badge&logo=node.js" alt="Node.js 22 or newer" height="28" /></a>
</p>

---

## Contents

**Getting started**

- [Install](#install): npm library, global CLI, `npx`, or a checkout
- [Requirements](#requirements): Node.js floor, browsers, platforms
- [Quick Start](#quick-start): generate a password from code and from the shell

**The jspassgen ecosystem**

- [The jspassgen ecosystem](#the-jspassgen-ecosystem): the core library, its tools and native SDKs, released in lockstep

**Library reference**

- [Capabilities at a glance](#capabilities-at-a-glance): the eight password types and the surfaces that serve them
- [Ecosystem comparison](#ecosystem-comparison): jspassgen against the platform random APIs alone
- [Benchmarks](#benchmarks): committed figures and the commands that produce them
- [Features](#features): entry points in the exports map
- [Configuration](#configuration): generation options, dictionaries, CLI presets
- [Examples](#examples): runnable example index

**Operational**

- [When not to use jspassgen](#when-not-to-use-jspassgen): limitations
- [Development](#development): local gates and CI
- [Security](#security): randomness sources, advisories, provenance
- [Documentation](#documentation): all reference docs
- [Stability guarantees](#stability-guarantees): SemVer axis, password shape, Node.js floor
- [License](#license)

---

## Install

### As a JavaScript library

```bash
npm install @sebastienrousseau/jspassgen
```

The package is ESM only (`"type": "module"`) and ships its own TypeScript
declarations.

Install the `jspassgen` command globally, or run it once without
installing:

```bash
npm install -g @sebastienrousseau/jspassgen
npx @sebastienrousseau/jspassgen --help
```

Build and test from source:

```bash
git clone https://github.com/sebastienrousseau/jspassgen.git
cd jspassgen
npm ci
npm test
```

---

## Requirements

- Node.js **22.0.0 or newer** (`engines` in `package.json`).
- CI runs the test suite on Node.js 22 and 24 on Ubuntu. macOS and Windows
  are not tested in CI.
- In a browser or worker, the web adapter needs `crypto.getRandomValues`.
- `-c, --clipboard` needs a clipboard that
  [`clipboardy`](https://www.npmjs.com/package/clipboardy) can reach; without
  one the CLI prints a warning and still prints the password.

---

## Quick Start

```javascript
import PasswordGenerator from '@sebastienrousseau/jspassgen';

const password = await PasswordGenerator({
  type: 'strong',
  length: 20,
  iteration: 2,
  separator: '-',
});

console.log(password);
```

The default export resolves to the password as a string: here two
20-character chunks joined by `-`. It draws from Node.js `crypto` and loads
the EFF word list for `memorable` and `diceware`.

From the shell:

```bash
npx @sebastienrousseau/jspassgen -p quick
npx @sebastienrousseau/jspassgen -t diceware -i 6 -s '-'
npx @sebastienrousseau/jspassgen -p secure -n 5 -f json
```

`-p quick` prints four 14-character chunks with their strength and entropy.
`--interactive` starts a guided setup in a terminal.

---

## The jspassgen ecosystem

jspassgen is one core library and the tools, SDKs and site around it.
Every member is listed in
[`docs/ecosystem.json`](https://github.com/sebastienrousseau/jspassgen/blob/main/docs/ecosystem.json)
and, from the suite's first lockstep release, every member ships the same
version ([ADR 0001](https://github.com/sebastienrousseau/jspassgen/blob/main/docs/adr/0001-ecosystem-lockstep.md)).
The JavaScript tools depend on the core and add no generation logic of
their own; each SDK is a native port that is checked against the core's
conformance kit as its generators land.

| Component | Purpose | Use case |
| :--- | :--- | :--- |
| **`jspassgen`** | Password and passphrase core, Node.js library, CLI, web UI and workers; source of the conformance kit | Programs that generate secrets |
| [`jspassgen-cli`](https://github.com/sebastienrousseau/jspassgen-cli) | Command-line generator built on the core | Passwords in a terminal or a script |
| [`jspassgen-mcp`](https://github.com/sebastienrousseau/jspassgen-mcp) | Local stdio MCP server | AI agents that need a generated secret |
| [`jspassgen-lsp`](https://github.com/sebastienrousseau/jspassgen-lsp) | Language server for weak literal secrets | Editors checking configuration and `.env` files |
| [`jspassgen-sdk-python`](https://github.com/sebastienrousseau/jspassgen-sdk-python) | Native port on the `secrets` module | Python programs |
| [`jspassgen-sdk-rust`](https://github.com/sebastienrousseau/jspassgen-sdk-rust) | Native port on the OS CSPRNG | Rust programs |
| [`jspassgen-sdk-java`](https://github.com/sebastienrousseau/jspassgen-sdk-java) | Native port on `SecureRandom` | JVM programs |
| [`jspassgen-sdk-dotnet`](https://github.com/sebastienrousseau/jspassgen-sdk-dotnet) | Native port on `RandomNumberGenerator` | .NET programs |
| [`jspassgen-sdk-cpp`](https://github.com/sebastienrousseau/jspassgen-sdk-cpp) | Native C++17 port on the OS CSPRNG | C++ programs |
| [`jspassgen.com`](https://github.com/sebastienrousseau/jspassgen.github.io) | Source of [jspassgen.com](https://jspassgen.com) | Evaluating the suite |

Every member shipped 0.0.22, the suite's first lockstep release: the core,
CLI, MCP server and language server on npm, the SDKs on PyPI, crates.io,
Maven Central and NuGet, the C++ SDK as a GitHub release, and the site at
jspassgen.com. The SDKs are early: each README's Capabilities at a glance
says what works today.

---

## Capabilities at a glance

| Area | Capability | Status |
| :--- | :--- | :--- |
| Random strings | `strong` and `base64`: chunks from a 64-character alphabet (letters, digits, `+`, `/`) | Released |
| Passphrases | `memorable` and `diceware`: words from the 7,776-word EFF list | Released |
| Long secrets | `quantum-resistant`: base64 alphabet, 32 characters or more; 43 reach 256 bits | Released |
| Pronounceable | `pronounceable`: consonant-vowel-vowel-consonant syllables | Released |
| Policy-shaped | `custom`: named character sets or literal characters, with exclusions | Released |
| Breach detection | `honeyword`: one real password at a random position among decoys | Released |
| Entropy | Bits, security level and recommendation for a result or a configuration | Released |
| Surfaces | Node.js library, CLI, web UI, Web Worker pool | Released |
| Ports | Conformance kit replayed against the core on every test run | CI-gated |

---

## Ecosystem comparison

jspassgen sits on top of the platform random APIs rather than replacing
them. The table compares it with using those APIs directly; third-party
generators have not been compared, and no claim is made about them.

| Project | Password types | Entropy reported | Runtimes |
| :--- | :---: | :---: | :---: |
| **jspassgen** | Eight, including passphrases and honeywords | Yes | Node.js 22+, browsers, Web Workers |
| Node.js `crypto` alone | Random bytes and integers; formatting is yours | No | Node.js |
| Web Crypto `getRandomValues` alone | Random bytes; formatting is yours | No | Browsers, workers |

---

## Benchmarks

The figures below come from
[`benchmarks/benchmark-results.json`](benchmarks/benchmark-results.json),
written by `npm run benchmark:all` on 2026-02-07. The file does not record
the machine or the Node.js version, so treat them as rough, single-run
signals.

| Scenario | Result | Environment |
| :--- | ---: | :--- |
| `strong`, 16 characters, 1 chunk | 80,673 ops/s | Not recorded |
| `base64`, 32 characters, 1 chunk | 57,806 ops/s | Not recorded |
| `memorable`, 4 words | 122,286 ops/s | Not recorded |
| Total entropy, `strong` configuration | 11,312k ops/s | Not recorded |

Run them on your own machine:

```bash
npm run benchmark:all        # every suite; rewrites benchmark-results.json
npm run benchmark:generation # generation by type, length and chunk count
npm run benchmark:crypto     # CSPRNG against Math.random() as a baseline
npm run benchmark:entropy    # entropy calculations
npm run benchmark:bulk       # bulk generation
```

---

## Features

The exports map in `package.json` defines four entry points:

- `@sebastienrousseau/jspassgen`: the `PasswordGenerator` default export,
  wired to Node.js `crypto` and the EFF word list, plus the CLI services
  (`generatePassword`, `generateMultiplePasswords`, `processConfiguration`,
  the audit helpers and others).
- `@sebastienrousseau/jspassgen/core`: the platform-free core:
  `createService`, the generators, entropy functions, character sets and
  the port interfaces (`RandomGeneratorPort`, `DictionaryPort`,
  `MemoryDictionary` and the rest).
- `@sebastienrousseau/jspassgen/adapters/node`: `NodeCryptoRandom`,
  `EFFDicewareDictionary` (the 7,776-word EFF list), a console logger,
  file storage and a system clock for the core's ports, and
  `createNodeAdapters()`, which builds them all.
- `@sebastienrousseau/jspassgen/workers`: a Web Worker pool for bulk
  generation in the browser (`createWorkerPool`, `generatePasswordsBulk`).

The package installs the `jspassgen` command; `password-generator` is an
older alias for the same entry point, kept so existing scripts still run. `packages/core` imports
nothing from Node.js or the browser; `npm run verify:core` and CI enforce
it. The web UI lives in [`src/ui/web/`](src/ui/web/) and is deployed from
`main` to [doc.jspassgen.com](https://doc.jspassgen.com/).

---

## Configuration

`service.generate()` and the default export take one options object:

| Option | Default | Meaning |
| :--- | :--- | :--- |
| `type` | none, required | One of the eight types above |
| `length` | `16` | Characters per chunk, or per password for `honeyword`; `pronounceable` ignores it |
| `iteration` | `1` | Chunks, words or four-letter syllables; total passwords for `honeyword` |
| `separator` | `"-"` | Text between chunks or words |
| `allowedChars` | none | `custom` only: set names such as `UPPERCASE,DIGITS`, or literal characters |
| `forbiddenChars` | none | `custom` only: characters to remove |
| `includeEntropy` | `false` | Resolve to `{ password, entropy, securityLevel, metadata }` instead of a string |

The core takes its randomness and word list as ports. Without a
`dictionary`, `memorable` draws from a 48-word placeholder list and
`diceware` throws. `createNodeAdapters()` supplies the 7,776-word EFF
list with Node.js `crypto`:

```javascript
import { createService } from '@sebastienrousseau/jspassgen/core';
import { createNodeAdapters } from '@sebastienrousseau/jspassgen/adapters/node';

const service = createService({}, createNodeAdapters());

const result = await service.generate({ type: 'diceware', iteration: 6, includeEntropy: true });
console.log(result.password, result.entropy);
```

The CLI takes the same options as flags (`-t`, `-l`, `-i`, `-s`,
`--allowed-chars`, `--forbidden-chars`), adds output flags (`-n`, `-f`,
`-c`, `-a`, `--learn`, `--reveal`, `--interactive`), and has six presets:

| Preset | Type | Shape |
| :--- | :--- | :--- |
| `quick` | `strong` | 4 chunks of 14, joined by `-` |
| `secure` | `strong` | 4 chunks of 16, no separator |
| `memorable` | `memorable` | 4 words, joined by `-` |
| `quantum` | `quantum-resistant` | 43 characters |
| `diceware` | `diceware` | 6 words, joined by `-` |
| `pronounceable` | `pronounceable` | 3 four-letter syllables, joined by `-` |

Flags given with a preset override it. The full flag table is in the
[detailed README reference](docs/README-REFERENCE.md#cli-flags).

---

## Examples

The repository has no `examples/` directory. These are the runnable
examples it does ship:

- [`docs/examples/web-worker-bulk.js`](docs/examples/web-worker-bulk.js):
  bulk generation in a browser through the Web Worker pool.
- [`docs/RECIPES.md`](docs/RECIPES.md): CLI commands for common password
  policies.
- [`src/ui/web/demo/`](src/ui/web/demo/): the web UI; `npm run web:preview`
  builds and serves it locally.
- `make run`: generates a `base64`, a `strong` and a `memorable` password
  from a checkout.

---

## When not to use jspassgen

- It generates secrets; it does not hash or verify them. Store passwords
  with a key derivation function such as Argon2id, scrypt or bcrypt.
- Do not use it where no CSPRNG is available: the adapters fail rather than
  fall back to `Math.random()`.
- Do not use `memorable` through `/core` without a `dictionary` port: the
  48-word placeholder list gives about 5.6 bits per word.

---

## Development

```bash
npm test               # c8 + mocha, the single gate
npm run lint           # ESLint
npm run format:check   # Prettier
npm run lint:markdown  # remark
npm run verify:core    # packages/core has no platform imports
npm run build          # formats, lints and packs dist/
```

The Quality Gates workflow runs lint and formatting, the test suite on
Node.js 22 and 24 with coverage floors, the core, web UI and parity suites,
core isolation, `npm audit --audit-level=moderate`, the build and the
benchmarks. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for local reproduction
and the release lifecycle.

---

## Security

Report vulnerabilities privately according to [`SECURITY.md`](SECURITY.md).

The core takes all randomness from an injected `RandomGeneratorPort`. The
Node.js adapter uses `crypto.randomInt` and `crypto.randomBytes`; the web
adapter uses `crypto.getRandomValues`. The core, the adapters and the CLI
never call `Math.random()`; in `./workers`, `BulkPatterns.mixed` uses it
only to choose which type to generate next.

The 0.0.21 advisory
[GHSA-8q9w-f94p-vxg8](https://github.com/sebastienrousseau/jspassgen/security/advisories/GHSA-8q9w-f94p-vxg8)
fixed the web UI and Web Worker, which built the core without a word list:
`memorable` drew from the 48-word placeholder while reporting EFF-list
strength. The hosted demo picked up the fix once the Pages workflow began
building from `main` (see [`CHANGELOG.md`](CHANGELOG.md)).

0.0.22 is published to npm with provenance (SLSA provenance v1), and CI
runs `npm audit` and a Codacy scan.

---

## Documentation

- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Documentation index](docs/INDEX.md)
- [CLI recipes](docs/RECIPES.md)
- [Developer documentation](DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Security policy](SECURITY.md)
- [Conformance kit](conformance/README.md)
- [Ecosystem lockstep (ADR 0001)](docs/adr/0001-ecosystem-lockstep.md)
- [Ecosystem manifest](docs/ecosystem.json)
- [Performance budget](docs/PERFORMANCE_BUDGET.md)
- [Accessibility audit](docs/ACCESSIBILITY_AUDIT.md)
- [Detailed README reference](docs/README-REFERENCE.md)

---

## Stability guarantees

- During the `0.0.x` lifecycle every release increments by `0.0.1`, and the
  patch component is the breaking-change axis.
- The contract is the exports map, the options and result shapes, the CLI
  flags and presets, and the shape of each password (alphabet, chunk count
  and length, separator). Password values are random and not part of it.
- A change to any of these is breaking even when no signature changes, and
  the changelog calls it out.
- `packages/core` stays free of platform dependencies; CI enforces it.
- The Node.js floor is 22 (`engines`). It is raised only on the breaking
  axis, with the reason in the changelog.

---

## License

Licensed under either [Apache License 2.0](LICENSE-APACHE) or
[MIT](LICENSE-MIT), at your option.
