// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Origin check for the password worker's message handler.
 *
 * A dedicated worker only receives messages from the page that created it,
 * and those carry an empty origin. A message that names an origin is
 * accepted only from the worker's own origin, so the handler stays safe if
 * it is ever attached where other origins can post to it.
 *
 * @module workers/message-origin
 */

/**
 * Whether a message with `origin` may be handled.
 *
 * @param {string|undefined} origin - `MessageEvent.origin`.
 * @param {string|undefined} ownOrigin - The worker's own origin.
 * @returns {boolean} True for the creator's messages or the own origin.
 */
export function isTrustedOrigin(origin, ownOrigin) {
  if (!origin) {
    return true;
  }
  return ownOrigin !== undefined && origin === ownOrigin;
}
