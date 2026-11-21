<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.24] - Unreleased

### Added

- Releases carry their SLSA build provenance. The release workflow
  attests every release file with `actions/attest-build-provenance`,
  signed through Sigstore and stored as a GitHub attestation, and
  attaches the bundle, listed in the release checksums, as
  `jspassgen-<version>.intoto.jsonl`. Check a download with
  `gh attestation verify <file> --repo sebastienrousseau/jspassgen`.
  This answers the OpenSSF Scorecard Signed-Releases check.

### Changed

- Releases follow the suite's tag-driven flow. Pushing the signed tag
  `v<version>` runs the release workflow, which checks the tag, tests,
  builds and packs `dist/`, publishes that tarball to npmjs with
  provenance once the `npm` environment is approved, publishes to
  GitHub Packages, and drafts the GitHub release with the same tarball,
  `SHA256SUMS` and the provenance bundle. The release tarball is now the
  one npm serves; before, the maintainer packed and attached it locally,
  so its bytes differed from npm's and CI could not vouch for them. The
  `workflow_dispatch` fallback is gone: rerunning the failed job of the
  tag's run does the same.

## [0.0.23] - 2026-11-20

### Changed

- **Ecosystem inventory**: `docs/ecosystem.json` marks every member
  `active` (all ten shipped 0.0.22, the first suite release) and names the
  site `jspassgen.com`; the README's ecosystem section lists where each
  member is published instead of saying only the core is on a registry.

### Security

- **Workflow permissions**: every workflow defaults to `contents: read`;
  write scopes (`id-token`, `packages`, `security-events`) sit only on the
  jobs that use them, and every action is pinned to a commit SHA.
- **Security policy**: removed the stale `.github/SECURITY.md`, which had
  no reporting address and took precedence over `SECURITY.md` on GitHub's
  Security tab.
- **Static analysis**: CodeQL (`security-extended`) runs on the
  JavaScript sources and the workflows on every push, pull request and
  weekly.
- **Property-based tests**: fast-check checks the core generators'
  contracts (chunk count and length, alphabet, custom-set exclusions, the
  2-character minimum, entropy growth, length validation) over 200 drawn
  configurations each.
- **Log messages as data**: the Node.js console logger and the entropy
  normalizer pass the message as an argument to a fixed `%s` format, so a
  `%` in a message or a password type is printed, not interpreted
  (CodeQL `js/tainted-format-string`).
- **Owner-only storage files**: `NodeFsStorage` writes files with mode
  0600, and the tests create their directories with `mkdtemp` instead of
  a predictable name in the shared temp directory.
- **Clipboard fingerprint**: the detached clipboard clearer now receives
  a salted scrypt fingerprint of the password instead of an unsalted
  SHA-256 digest, so a leaked fingerprint is expensive to brute-force
  (CodeQL `js/insufficient-password-hash`).
- **Worker origin check**: the password worker ignores a message that
  names an origin other than its own (CodeQL `js/missing-origin-check`).
- **CSPRNG in the worker pool**: `BulkPatterns.mixed` chose the next
  password type with `Math.random()`; it now uses
  `crypto.getRandomValues`, so nothing in the library calls
  `Math.random()`.

### Removed

- `npm run web:deploy` and `scripts/deploy-gh-pages.js`, which pushed the
  web demo to a `gh-pages` branch with shell commands built from the
  environment. The Pages workflow deploys it from `main`.

### Fixed

- `SECURITY.md` names GitHub private vulnerability reporting, no longer
  claims 100 % core coverage or an unrecorded 2024 audit, and links the
  published advisories. `CONTRIBUTING.md` states Node.js 22 (as
  `engines` does), points questions to Issues (Discussions are off) and
  shows the current source tree. The 0.0.21 changelog entry cites
  GHSA-8q9w-f94p-vxg8.
- The Quality Gates Coveralls step ran only on Node.js 20, which the
  matrix no longer has, so it never ran; it is removed (coveralls.yml
  uploads coverage).
- `scripts/build-web-demo.js` had a CSS path replacement that replaced a
  string with itself; it is removed.

## [0.0.22] - 2026-11-18

### Security

- **Clipboard Clear** (GHSA-w3f5-33xf-fq99): `--clipboard` promised to wipe the copied password after 45 seconds, but scheduled the wipe on an unreferenced timer in a process that exits at once, so the password stayed on the clipboard. A detached process now does the wipe: it receives only a SHA-256 digest of the password over stdin and clears the clipboard after 45 seconds if it still holds that password.
- **Web Password History** (GHSA-mhc2-hmv6-4fc9): The web demo saved the last five generated passwords to `localStorage` in plain text, where they outlived the browser session. The history is now kept in memory only, and the demo deletes the `jspassgen_history` key earlier versions left behind.

### Fixed

- **npm Release Job**: The release workflow publishes to npmjs with `npm publish --provenance` inside an `npm` environment that a maintainer approves, the setup crypto-service releases with, instead of `npm stage publish`, which failed with E401 for 0.0.21 although a stage-only trusted publisher was configured. A manual run (`workflow_dispatch` with a `tag`) publishes an existing release tag to npmjs only.
- **Web Demo Deployment**: The Pages workflow now builds the web demo from `main` (`npm run web:build`) and deploys `dist/web`, instead of uploading the committed `gh-pages` branch unchanged. The site had kept serving an old bundle, so the 0.0.21 web word-list fix (GHSA-8q9w-f94p-vxg8) did not reach it.
- **Formatting**: `npm run build` ran Prettier and then `eslint --fix`, and three ESLint rules (`operator-linebreak`, `quotes` without `avoidEscape`, `indent` inside template literals) undid Prettier's layout, so the tree never matched either tool. ESLint now leaves layout to Prettier, `npm run format` covers the whole repository instead of `src/**/*.js`, `npm run format:check` checks it, and `.prettierignore` keeps generated output, word lists and Markdown out of Prettier's reach. The 163 drifted files are formatted, and the Quality Gates workflow's Lint job runs `npm run format:check`.
- **README**: Follows the family layout that every jspassgen repository now shares. Unsourced benchmark figures are replaced by the committed results, the CLI presets and defaults match the source, the 0.0.x stability policy replaces a 1.x one, the "WCAG 2.2 AAA" claim (which the accessibility audit records as failing) is dropped, and the full CLI flag table moves to `docs/README-REFERENCE.md`.
- **Security Policy**: `SECURITY.md` listed 1.1.x and 1.0.x as supported and everything below 1.0 as not, which excluded every release. It now states the family policy: the latest released `0.0.x` receives security fixes.
- **npm Release Check**: The release workflow's last step now polls npmjs for up to 10 minutes before failing. The 0.0.21 publish succeeded with provenance, but the check ran 0.2 seconds later, while npm was still processing the version, and failed the run.
- **Node Adapters**: `createNodeAdapters()` called `require()` inside an ES module and threw `ReferenceError` on every call, and `@sebastienrousseau/jspassgen/adapters/node` did not export the EFF word list, so a core service built from those adapters drew `memorable` words from a 48-word placeholder and could not make `diceware` passphrases. The entry point now exports `EFFDicewareDictionary`, and `createNodeAdapters()` works and includes it as `dictionary`.
- **Core Package Metadata**: `packages/core/package.json`, which ships inside the npm package, declared the MIT licence alone, Node.js 18 and version 0.0.1. It now declares `Apache-2.0 OR MIT`, Node.js 22 like the package around it, and the suite version.
- **Command Name**: The CLI's usage line, banners, tips and the commands it teaches now say `jspassgen`. `password-generator` still runs as an older alias. The package `homepage` points to jspassgen.com instead of password-generator.pro, and the docs name the real package (`@sebastienrousseau/jspassgen/core`) instead of `@password-generator/core`.
- **OpenSSF Scorecard**: The README showed a Scorecard badge with no data because the repository had no Scorecard workflow. `scorecard.yml` now publishes results weekly and on every push to `main`.

## [0.0.21] - 2026-11-18

### Added

- **Conformance Kit**: `conformance/` holds the contract every port must meet: draw-tape vectors for each password type, error, validation and entropy cases, and the EFF word list, with `SHA256SUMS`. It is generated from `packages/core` (`npm run conformance:generate`); `test/conformance.test.js` replays it through the core and fails if it drifts (`npm run conformance:check` does the same without mocha).
- **Ecosystem Design**: [ADR 0001](docs/adr/0001-ecosystem-lockstep.md) and `docs/ecosystem.json` define the jspassgen suite: this package, a CLI, MCP and LSP servers, native Python, Rust, Java, .NET and C++ ports proven by a shared conformance kit, and the site, all released at one version. The new members are planned; 0.0.21 ships as jspassgen alone.

### Changed

- **Dependencies**: commander ^15.1.0; development tooling @babel/cli ^8.1.0, @babel/core ^8.1.2, @babel/eslint-parser ^8.1.2, @babel/register ^8.1.2, esmock 3.0.0, jsdom 31.0.1, prettier 3.10.1 and rimraf ^6.1.4.
- **jshint Removed**: minimatch 11 breaks jshint 2, and no script or workflow ran it, so it and `.jshintrc` are gone.

### Security

- `package-lock.json` moves serialize-javascript 7.1.2 to 7.1.4 (Dependabot alert: low).
- **Web Word List** ([GHSA-8q9w-f94p-vxg8](https://github.com/sebastienrousseau/jspassgen/security/advisories/GHSA-8q9w-f94p-vxg8)): The web UI (`WebUIController`) and the Web Worker built the core service without a dictionary, so `memorable` passwords were drawn from the core's 48-word placeholder list (about 5.6 bits per word) while their strength was reported for the 7776-word EFF list (about 12.9 bits per word), and `diceware` failed. Both now load the EFF list, and the core reports word-based entropy from the size of the dictionary it was given.
- npm overrides force minimatch ^11.0.1 and glob ^14.0.2 across the dependency tree, since their dependants still request the vulnerable majors (Dependabot alert #107).

### Fixed

- **Release Workflow**: The workflow now starts when a release is published rather than created. 0.0.20's release was created as a draft while its tarball uploaded, and a draft's `created` event starts no workflow, so 0.0.20 was not published to GitHub Packages.

## [0.0.20] - 2026-10-22

### Changed

- **Package Name**: Published as `@sebastienrousseau/jspassgen`, in line with the author's other npm packages. The unscoped `jspassgen` package stops at 0.0.19 and is deprecated in favour of the new name. The `jspassgen` and `password-generator` commands are unchanged: `npm install -g @sebastienrousseau/jspassgen` or `npx @sebastienrousseau/jspassgen`.
- **Package Exports**: Added an `exports` map. The root, `core`, `adapters/node` and `workers` subpaths are the public entry points, and the import examples in the README and docs now resolve (`jspassgen/core` and `@jspassgen/core` never did). Deep imports of other files are no longer possible.
- **Release Workflow**: From 0.0.21, npmjs releases are staged through trusted publishing with provenance and made public by a maintainer with `npm stage approve`. npm attaches a trusted publisher only to a package that exists, so 0.0.20, the first version under the new name, is published by hand without provenance, and the workflow skips a version that is already on npmjs. The workflow uses the npm bundled with Node 24 instead of installing `npm@latest`.
- **Dependencies**: esmock 2.8.0, jsdom 30.1.3, prettier 3.9.10, react 19.3.1, @babel/preset-typescript 8.0.7 and eslint-plugin-prettier 5.5.7.

### Removed

- **Publishing Scripts**: Removed `scripts/publish-all-versions.sh`, which backfilled versions to the unscoped `jspassgen` name.

### Security

- **markdown-it**: Constrained to `^14.3.3` through `overrides` so the version behind Dependabot alert #103 cannot resolve.

### Fixed

- **CLI Compatibility**: Added explicit step to upgrade npm CLI to the latest version in the release workflow to guarantee native OIDC Trusted Publishing compatibility.

### Changed

- **Publishing Scripts**: Added version iterations through `0.0.20` across automated multi-version publishing scripts.

## [0.0.19] - 2026-10-10

### Fixed

- **Registry Resolution**: Removed scoped registry override from `.npmrc` to allow GitHub Packages publishing without registry collision.
- **Workflow Authentication**: Configured Node.js 24 with tokenless Trusted Publishing for npmjs and dedicated scoped registry targeting for GitHub Packages.

### Changed

- **Publishing Scripts**: Added version iterations through `0.0.19` across automated multi-version scripts.

## [0.0.18] - 2026-10-10

### Fixed

- **Release Workflow**: Configured explicit relative directory target (`./dist`) for `npm publish` in the release workflow to prevent registry lookup errors during dual publishing to npmjs and GitHub Packages.

### Changed

- **Publishing Scripts**: Added version iterations through `0.0.18` to automated publishing scripts (`publish-github-packages.sh` and `publish-all-versions.sh`).

## [0.0.12] - 2026-10-09

### Added

- **Packaging & Distribution**: Bundled `packages/core` and TypeScript declarations (`types/` and `index.d.ts`) into distribution artifacts.
- **Custom Character Set Flags**: Added `--allowed-chars` and `--forbidden-chars` options to configure character sets directly from the CLI.
- **Honeyword Reveal Flag**: Added `--reveal` option to identify real vs decoy honeywords in the output table.
- **Clipboard Scrubbing**: Implemented automated clipboard clearing with a 45-second time-to-live and signal handling.

### Fixed

- **Core Packaging**: Resolved module resolution errors (`ERR_MODULE_NOT_FOUND`) for package consumers by copying runtime-agnostic core into `dist/`.
- **Special Character Set Size**: Corrected `SPECIAL.size` to 26 and bit calculations in character set metadata.
- **Shannon Entropy Calculation**: Unified CLI entropy reporting with core theoretical entropy calculation.
- **Dependency Vulnerabilities**: Pruned unused runners and applied overrides for `chokidar`, `serialize-javascript`, and `brace-expansion`.

### Changed

- **Vectorized CSPRNG Sampling**: Optimized `NodeCryptoRandom` with batch random byte generation and rejection sampling for higher throughput.
- **Modernized Dependencies**: Upgraded `@babel` suite to 8.0.6, `jsdom` to 30.1.0, `mocha` to 12.0.2, `prettier` to 3.9.8, `react` to 19.3.0, and `undici` to 8.11.2.

## [0.0.11] - 2026-09-09

### Added

- **Quantum-Resistant Password Generation**: New password type (`-t quantum-resistant`) with enhanced entropy using quantum-safe algorithms following NIST Post-Quantum Cryptography standards.
- **KDF Configuration Options**: Configurable Argon2id key derivation parameters via CLI (`--kdf-memory`, `--kdf-time`, `--kdf-parallelism`) and programmatic API.
- **NIST SP 800-132 Compliance**: Key derivation using Argon2id with recommended parameters (64MB memory, 3 iterations, 4 threads).
- **Enhanced Character Sets**: Expanded symbol alphabet (94 printable ASCII characters) for quantum-resistant mode.
- **Minimum Entropy Threshold**: 256-bit entropy guarantee for quantum-resistant passwords.

### Security

- **Post-Quantum Ready**: Passwords resist both classical and quantum computing attacks.
- **Configurable KDF Parameters**: Enterprise-grade security with adjustable memory, time, and parallelism settings.
- **Enhanced Entropy Calculation**: Real-time entropy validation for quantum-resistant generation.

### Documentation

- Added comprehensive Quantum-Resistant Mode section to README.
- Added Key Derivation Functions (KDF) documentation with NIST SP 800-132 guidance.
- Added command-line and programmatic examples for quantum-resistant password generation.
- Updated password types table with quantum-resistant entry.

## [0.0.10] - 2026-02-07

### Added

- **Hexagonal Architecture**: Platform-agnostic core package (`@password-generator/core`) with zero dependencies.
- **Web UI Demo**: Browser-based password generator using the same core as CLI.
- **Port/Adapter Pattern**: Injectable ports for crypto, storage, logging, and dictionary.
- **Cross-Platform Parity Tests**: Ensure CLI and Web UI produce identical results.
- **Benchmarks**: Performance benchmarks for password generation and entropy calculation.

### Changed

- CLI refactored as thin adapter over `packages/core`.
- Web UI implemented as thin adapter over `packages/core`.
- Improved project structure with clear separation of concerns.

### Developer Experience

- 100% test coverage for core package.
- Isolation verification scripts to prevent dependency leakage.
- ESLint configurations for core and web packages.

## [0.0.9] - 2023-11-08

### Added

- Interactive onboarding flow for first-time users.
- Command learning presenter for CLI education.
- Accessibility improvements with proper ARIA support.
- Theming system with design tokens.

### Changed

- Modular architecture following SOLID principles.
- Unified onboarding implementation with consistent API.

### Security

- Hardened against insecure behavior patterns.
- Security audit utilities.

## [0.0.8] - 2023-09-09

### Added

- Enhanced code quality and security of base64 and memorable password generators.
- Expanded test coverage for string converters and array helpers.
- Auto-install-peers dependency configuration.

## [0.0.7] - 2022-09-30

### Changed

- Migrated CI package manager to pnpm.
- Workflow updates for Node.js matrix testing.

## [0.0.6] - 2022-04-26

### Fixed

- Resolved memorable password failure when loading dictionary data entries.

## [0.0.5] - 2022-04-26

### Fixed

- Resolved code scanning alert for missing newline at end of files.

## [0.0.4] - 2022-04-26

### Added

- Currency formatting helper utility (`toCurrency`).
- Unit tests for kebab-case transformation.

### Changed

- Reduced cyclomatic complexity across utility functions.

## [0.0.3] - 2022-04-26

### Added

- Integrated c8 for code coverage reporting.

### Changed

- Remark linting and Codacy style optimizations across documentation.

## [0.0.2] - 2022-04-20

### Added

- Random consonant, vowel, and syllable generators for phonetic passwords.
- String case converter functions (`toSnakeCase`, `toCamelCase`, `toTitleCase`).
- ECMAScript 6 refactoring with Babel support.

## [0.0.1] - 2022-04-10

### Added

- Initial release of `@sebastienrousseau/password-generator`.
- Strong, memorable, and base64 password generation.
- CLI with configurable length, iteration count, and separators.
