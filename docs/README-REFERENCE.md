<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# jspassgen README reference

Detail moved out of the [README](../README.md) to keep it short. Everything
here was checked against the source on the `feat/v0.0.22` branch
(package version 0.0.21).

## CLI flags

```bash
jspassgen [options]
```

`password-generator` is an older alias of the same entry point (`index.js`). The flags are defined
in [`src/config.js`](../src/config.js) and registered with commander in
[`src/cli/CLIController.js`](../src/cli/CLIController.js);
`jspassgen --help` prints them.

| Flag | Meaning | Default |
| :--- | :--- | :--- |
| `-p, --preset <preset>` | Preset: `quick`, `secure`, `memorable`, `quantum`, `diceware`, `pronounceable` | None |
| `-t, --type <type>` | `strong`, `base64`, `memorable`, `quantum-resistant`, `diceware`, `honeyword`, `pronounceable`, `custom` | None; required without `-p` |
| `-l, --length <number>` | Characters per chunk | `16` |
| `-i, --iteration <number>` | Chunks, words or syllables; total passwords for `honeyword` | `1` |
| `-s, --separator <char>` | Text between chunks or words | `-` |
| `-c, --clipboard` | Copy the password (the real one for `honeyword`, the first one with `-n`) to the clipboard; it is cleared after 45 seconds unless the clipboard changed | Off |
| `-a, --audit` | Print a security audit: entropy sources, algorithms and storage guidance | Off |
| `--learn` | Print the equivalent command and common shortcuts | Off |
| `-f, --format <format>` | Output format for bulk runs: `text`, `json`, `yaml`, `csv` | `text` |
| `-n, --count <number>` | Number of passwords to generate | `1` |
| `--interactive` | Start the guided setup (needs a terminal) | Off |
| `--allowed-chars <chars>` | `custom` only: set names (`UPPERCASE`, `LOWERCASE`, `DIGITS`, `SPECIAL`, `CONSONANTS`, `HEX_UPPERCASE`, `HEX_LOWERCASE`) or literal characters, comma-separated | None |
| `--forbidden-chars <chars>` | `custom` only: characters to remove | None |
| `--reveal` | Mark which `honeyword` entry is real | Off |
| `-h, --help` | Print usage | None |

The `-l`, `-i` and `-s` defaults are the core's (`packages/core/src/service.js`);
commander itself sets none. With `-p`, the preset supplies `type`, `length`,
`iteration` and `separator`, and any of those flags given alongside it win.
`honeyword` needs `-i 2` or more (one real password and at least one decoy).
`quantum-resistant` needs `-l 32` or more and warns below 43, the length
that reaches 256 bits.

Run with no flags outside a terminal, the CLI prints a short list of
starting commands instead of generating.

## Changes from the pre-template README

- The `Requirements` line `^22.0.0 or >=24.0.0` is replaced by the
  `engines` value, `>=22.0.0`.
- The CLI table's defaults (`-t strong`, `-i 1` as commander defaults) and
  its omission of `--learn` and of the `diceware` and `pronounceable`
  presets are corrected from the source.
- The benchmark figures (about 500,000, 750,000 and 2,000,000 ops/sec) had
  no committed source and are replaced by the committed
  `benchmarks/benchmark-results.json` run.
- The web UI is no longer described as WCAG 2.2 AAA: its own
  [accessibility audit](ACCESSIBILITY_AUDIT.md) records AAA as failing.
- `npm run demo:web` does not exist; the web UI is served with
  `npm run web` or built and served with `npm run web:preview`.
