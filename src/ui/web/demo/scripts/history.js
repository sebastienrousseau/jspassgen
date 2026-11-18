// Copyright © 2022-2026 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Password history for the web demo.
 *
 * Generated passwords are secrets, so the history lives in memory only and
 * is gone when the page closes. Versions up to 0.0.21 kept it in
 * localStorage, readable by anyone with the browser profile and by any
 * script on the origin; `purgeStoredHistory` deletes what they left.
 *
 * @module demo/history
 */

/** The localStorage key that versions up to 0.0.21 wrote passwords to. */
export const LEGACY_HISTORY_KEY = "jspassgen_history";

/**
 * Creates an in-memory history of the most recent passwords.
 *
 * @param {number} max - How many passwords to keep.
 * @returns {{add: Function, clear: Function, list: Function}} The history.
 */
export function createPasswordHistory(max) {
  let items = [];
  return {
    /** @param {string} password - Adds a password unless already present. */
    add(password) {
      if (items.includes(password)) {
        return;
      }
      items = [password, ...items].slice(0, max);
    },
    /** Forgets every password. */
    clear() {
      items = [];
    },
    /** @returns {string[]} A copy of the list, newest first. */
    list() {
      return [...items];
    },
  };
}

/**
 * Deletes the password history earlier versions stored.
 *
 * @param {Storage} [storage] - Defaults to `globalThis.localStorage`, read
 *   inside the `try` because the getter itself throws when storage is
 *   blocked.
 */
export function purgeStoredHistory(storage) {
  try {
    (storage ?? globalThis.localStorage)?.removeItem(LEGACY_HISTORY_KEY);
  } catch {
    // Storage disabled or blocked: nothing was stored, nothing to delete.
  }
}
