<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# ADR 0001: The jspassgen Ecosystem in Lockstep

## Status

Proposed (0.0.21). Modelled on crypto-service ADR 0005
(<https://github.com/sebastienrousseau/crypto-service/blob/main/docs/adr/0005-suite-lockstep-with-sdks-and-site.md>).

## Context

jspassgen today is one npm package: a zero-dependency core
(`packages/core`), a Node.js CLI, a web UI and workers, plus the site
`jspassgen.github.io` (jspassgen.com, untagged, `VERSION` 0.0.2).

Users outside Node.js (Python, Rust, JVM, .NET, C++), AI agents and
editors have no supported way to generate passwords with the same rules,
the same entropy accounting and the same EFF wordlist. Every unofficial
port drifts, and a password generator that drifts is a security defect,
not a cosmetic one.

crypto-service solves the same multi-repository problem with one version,
one inventory, one contract and a post-release consistency check. Its SDKs
are thin REST clients for crypto-server. jspassgen deliberately does not
copy that part: generating a secret on a server and sending it over the
network breaks the product's core promise that the secret is made on the
user's machine from the platform CSPRNG and never leaves it.

## Decision

### 1. Members

Ten repositories, one suite:

| Member                 | Kind | Language   | Registry identity (proposed)                             |
| :--------------------- | :--- | :--------- | :------------------------------------------------------- |
| `jspassgen`            | core | JavaScript | npm `@sebastienrousseau/jspassgen`                       |
| `jspassgen-cli`        | tool | JavaScript | npm `@sebastienrousseau/jspassgen-cli` (bin `jspassgen`) |
| `jspassgen-mcp`        | tool | JavaScript | npm `@sebastienrousseau/jspassgen-mcp`                   |
| `jspassgen-lsp`        | tool | JavaScript | npm `@sebastienrousseau/jspassgen-lsp`                   |
| `jspassgen-sdk-python` | sdk  | Python     | PyPI `jspassgen`                                         |
| `jspassgen-sdk-rust`   | sdk  | Rust       | crates.io `jspassgen`                                    |
| `jspassgen-sdk-java`   | sdk  | Java       | Maven Central `com.jspassgen:jspassgen`                  |
| `jspassgen-sdk-dotnet` | sdk  | .NET       | NuGet `Jspassgen`                                        |
| `jspassgen-sdk-cpp`    | sdk  | C++        | GitHub release (CMake package `jspassgen`)               |
| `jspassgen.github.io`  | site | HTML (ssg) | none (jspassgen.com)                                     |

The npm, PyPI, crates.io and NuGet names were unregistered on 2026-11-18.
The Maven `com.jspassgen` namespace needs DNS verification of
jspassgen.com at Sonatype Central before the first Java release.

`docs/ecosystem.json` is the machine-readable form of this table.

### 2. One version

Every member releases the same `0.0.x` version, moving strictly by `0.0.1`
(`~/Code/AGENTS.md` §3). A member that has never been tagged first ships
at the suite's current version, never at `0.0.1`.

0.0.21 ships as jspassgen alone: it is already merged, and the new
repositories do not exist yet. The first suite release, in which every
member ships, is the first version after all ten pass their gates. Until
then jspassgen keeps releasing on its own, and `docs/ecosystem.json` marks
the other members `"status": "planned"`. From the first suite release on,
a member that cannot ship holds the version back for every member.

### 3. One inventory

`docs/ecosystem.json` lists every member: repository, kind, language,
registry identity, version file, required release assets and status.
README tables, the site's ecosystem pages and the consistency check read
it; nothing else hard-codes the member list.

### 4. One contract: native ports proven by a conformance kit

The SDKs are native implementations of `packages/core`, not network
clients. Each one:

- draws randomness only from the platform CSPRNG (Python `secrets`, Rust
  `getrandom`/`rand::rngs::OsRng`, Java `SecureRandom`, .NET
  `RandomNumberGenerator`, C++ the OS source: `getrandom(2)`,
  `arc4random_buf`, `BCryptGenRandom`), behind an injectable random port
  matching `RandomGeneratorPort` (`generateRandomBytes`,
  `generateRandomInt`);
- maps `generateRandomInt(max)` to an unbiased draw (rejection sampling),
  never a modulo of raw bytes;
- makes no network call and has no telemetry;
- implements the password types in `PASSWORD_TYPES`, their validation and
  entropy calculation, with the same error codes.

The contract lives in this repository as `conformance/`, generated from
`packages/core` and extending the parity contract in
`packages/core/test/parity/`:

- **Draw tapes.** Each vector is a configuration, the ordered list of
  random draws the core makes (`{op: "int", max, value}` or
  `{op: "bytes", length, hex}`), and the expected password, validation
  result and entropy. A port replays the tape through its random port and
  must make the same draws in the same order and produce byte-identical
  output. This pins the algorithm, not only the output distribution.
- **Errors.** Invalid configurations and the error code each must raise.
- **Wordlist.** The EFF diceware list (`src/dictionaries/eff-diceware.json`)
  is vendored byte-identical.
- **Integrity.** `conformance/SHA256SUMS` covers every file. Each port
  vendors the kit unchanged and records the jspassgen commit it came from
  in `ci/core.ref`; a release pins it to the release tag's commit.

Statistical properties of each real CSPRNG adapter (uniformity across
`max`, rejection of bias) are tested in each port, since tapes cannot
cover them.

The three JavaScript tools depend on `@sebastienrousseau/jspassgen` at the
exact suite version and add no generation logic of their own:

- **jspassgen-cli** moves `src/cli` out of this repository. Until it ships,
  the `jspassgen` bin stays here; afterwards the bin here becomes a shim
  that prints the new package name, removed one release later.
- **jspassgen-mcp** is a stdio MCP server with tools to generate a
  password or passphrase, estimate entropy and analyse strength. Secrets
  are returned to the local client only; nothing is logged.
- **jspassgen-lsp** reports weak or low-entropy literal secrets in
  configuration and `.env` files, with a code action that replaces one with
  a generated value.

### 5. One repository standard

Every member follows `~/Code/AGENTS.md`, `~/Code/README-TEMPLATE.md` and
the layout of the matching crypto-service member: `AGENTS.md`,
`CHANGELOG.md`, `CITATION.cff`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
`DCO.txt`, `DEVELOPMENT.md`, `GOVERNANCE.md`, `SECURITY.md`, `SUPPORT.md`,
`KEYS.asc`, `LICENSE-APACHE`, `LICENSE-MIT`, `LICENSES/`, `REUSE.toml`,
`Makefile` (one gate), `mise.toml`, `conformance/`, `ci/core.ref`,
`docs/` and a rendered manual, `examples/`, `benchmarks/`, `fuzz/`,
`.github/demo.tape` and `.github/demo.gif`, Dependabot, CodeQL, OpenSSF
Scorecard, signed tags and a `SHA256SUMS` release asset. Licence:
Apache-2.0 OR MIT.

### 6. Release order

jspassgen first, then the three JavaScript tools, then the five SDKs, then
the site. Every tag is SSH-signed by the maintainer; registry publication
uses trusted publishing behind an environment with a required reviewer.
jspassgen's release workflow dispatches `jspassgen-release` to the site,
which rebuilds with the new version.

### 7. Checked after release

`scripts/check-ecosystem.mjs`, run by
`.github/workflows/suite-consistency.yml` after a release, daily and on
demand, verifies for every member whose status is `active`: the signed
tag, the GitHub release title (`<name> <version>`) and its checksums, the
registry publication, and the site's `VERSION`. Any drift fails the
check.

## Consequences

- A suite release needs ten repositories green. Five native ports multiply
  the maintenance surface; the conformance kit is what keeps that cost
  bounded, so it is built before any port.
- Ports reproduce core's draw order exactly. A change to how core consumes
  randomness is a breaking change for every port and lands in all of them
  in the same suite version.
- The trust model stays local-first: no member generates a secret
  remotely. A hosted or team offering, if one is ever built, is a separate
  product decision and not implied by this ADR.
- Adding a member means adding it to `docs/ecosystem.json`; the check then
  covers it.
- Releasing stays a maintainer action; automation verifies, it does not
  release on its own.

## Implementation order

1. This ADR and `docs/ecosystem.json` (0.0.21).
2. `conformance/` generator and kit in jspassgen, with a CI check that the
   committed kit matches the generator.
3. `scripts/check-ecosystem.mjs` and `suite-consistency.yml`, checking only
   `active` members.
4. Create the eight new repositories from the standard in section 5, each
   private until its gate passes.
5. Ports and tools, each passing the kit; the site gains an ecosystem page
   read from `docs/ecosystem.json`.
6. First suite release; every member flips to `active`.
