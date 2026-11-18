<!-- SPDX-License-Identifier: Apache-2.0 OR MIT -->

# jspassgen conformance kit

The contract every jspassgen port must meet
([ADR 0001](../docs/adr/0001-ecosystem-lockstep.md), section 4). Every file
here except this README is generated from `packages/core` by
`npm run conformance:generate`; do not edit them by hand. `npm test` fails
if they no longer match the core.

## Files

| File                          | What it holds                                                                                                       |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `meta.json`                   | Kit format, the core version it came from, the float tolerance, and the draw and generation rules in one line each. |
| `vectors/<type>.json`         | Generation vectors for one password type.                                                                           |
| `vectors/errors.json`         | Inputs that must fail, with the exact error message.                                                                |
| `validation.json`             | `validateConfig` inputs and the expected `isValid` and `errors`.                                                    |
| `entropy.json`                | `calculateEntropy` inputs and the expected `totalBits`, `perUnit`, `securityLevel` and `recommendation`.            |
| `wordlists/eff-diceware.json` | The EFF diceware list, byte-identical to `src/dictionaries/eff-diceware.json`.                                      |
| `SHA256SUMS`                  | SHA-256 of every file above.                                                                                        |

## Vectors

```json
{
  "id": "diceware-6-dash",
  "input": { "type": "diceware", "iteration": 6, "separator": "-" },
  "dictionary": "eff-diceware",
  "draws": [[7776, 2552], [7776, 3407], "... four more"],
  "expected": {
    "password": "fiction-impulse-swimming-garment-versus-pouch",
    "entropy": 77.55,
    "securityLevel": "MODERATE"
  }
}
```

(Shortened: the real vector lists all six draws.)

- `draws` is the draw tape: each `[max, value]` is one call to
  `generateRandomInt(max)` that returned `value`, in the order the core made
  them.
- `dictionary` names the word list in `wordlists/` the service is built with.
- `expected` is either `password`, `entropy` and `securityLevel` from
  `generate(input)` with `includeEntropy: true`, or `error` with the message
  `generate` throws. A honeyword `password` is the set object, not a string.

## How a port passes

1. Build the service with a random source that replays `draws`. On each
   `generateRandomInt(max)` call it checks that `max` equals the next draw's
   `max`, then returns its `value`. A different `max`, or a call past the end
   of the tape, is a failure.
2. Use only the two required random methods. The core's optional
   `generateRandomString` and `generateRandomBase64` fast paths are not part
   of the contract.
3. Compare `password`, `securityLevel` and `error` exactly, and `entropy`,
   `totalBits` and `perUnit` within `floatTolerance`.
4. After the call, every draw on the tape must have been used.

`test/conformance.test.js` does exactly this against the JavaScript core and
is the reference implementation of a port's conformance test.

## Vendoring

A port copies this directory unchanged, checks it against `SHA256SUMS`, and
records the jspassgen commit it came from in `ci/core.ref`. A release pins
that commit to the jspassgen release tag.

## Not covered yet

- Byte draws (`generateRandomBytes`): no generator uses them today, and the
  generator script fails if one starts to.
- The statistical quality of a port's real random source. Each port tests
  its own source for bias; a tape cannot.
