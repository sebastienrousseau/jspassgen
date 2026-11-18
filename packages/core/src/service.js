// Copyright © 2022-2024 JavaScript Password Generator (jspassgen). All rights reserved.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * Core service factory for password generation.
 * This is the main entry point for creating a password generation service.
 *
 * @module service
 */

import {
  validatePorts,
  NoOpLogger,
  MemoryStorage,
  FixedClock,
  MemoryDictionary,
  DEFAULT_WORD_LIST,
} from "./ports/index.js";
import { generate, GENERATOR_REGISTRY } from "./generators/index.js";
import {
  isValidPasswordType,
  VALID_PASSWORD_TYPES,
  validatePasswordTypeConfig,
} from "./domain/password-types.js";
import {
  calculateTotalEntropy,
  getSecurityLevel,
  getSecurityRecommendation,
} from "./domain/entropy-calculator.js";
import {
  normalizeEntropy,
  getSecurityLevel as getSecurityLevelFromNormalizer,
} from "./domain/entropy-normalizer.js";
import { PASSWORD_ERRORS } from "./errors.js";

/** Password types whose entropy depends on the size of the word list. */
const WORD_LIST_TYPES = new Set(["memorable", "diceware"]);

/**
 * Adds the injected dictionary's real size to a word-based configuration,
 * so entropy is not reported against a list the words did not come from.
 * A dictionarySize the caller passes is kept.
 *
 * @param {Object} config - Generation configuration.
 * @param {Object} dictionary - DictionaryPort implementation.
 * @returns {Promise<Object>} The configuration to measure entropy with.
 */
const withDictionarySize = async (config, dictionary) => {
  if (
    !WORD_LIST_TYPES.has(config.type) ||
    config.dictionarySize !== undefined
  ) {
    return config;
  }
  return { ...config, dictionarySize: await dictionary.getWordCount() };
};

/**
 * Measures a generated password's entropy, falling back to the legacy
 * calculation if the normalizer cannot handle the configuration.
 *
 * @param {string|Object} password - The generated password.
 * @param {Object} config - Configuration including type.
 * @param {Object} logger - LoggerPort implementation.
 * @returns {{entropy: number, securityLevel: string}} Entropy in bits and level.
 */
const measureEntropy = (password, config, logger) => {
  try {
    const entropy = normalizeEntropy(password, config.type, config);
    return { entropy, securityLevel: getSecurityLevelFromNormalizer(entropy) };
  } catch (error) {
    logger.warn(`Failed to calculate normalized entropy: ${error.message}`);
  }
  try {
    const entropy = calculateTotalEntropy(config);
    return { entropy, securityLevel: getSecurityLevel(entropy) };
  } catch (fallbackError) {
    logger.warn(
      `Failed to calculate fallback entropy: ${fallbackError.message}`,
    );
  }
  return { entropy: 0, securityLevel: "WEAK" };
};

/** Default per-chunk length when a configuration omits one. */
const DEFAULT_LENGTH = 16;

/** What one unit of a password is, for per-unit entropy display. */
const UNIT_KIND = {
  memorable: "word",
  diceware: "word",
  pronounceable: "word", // one syllable
  strong: "char",
  base64: "char",
  "quantum-resistant": "char",
  honeyword: "char",
  custom: "customChar",
};

/**
 * Fills in default ports and validates them if asked.
 *
 * @param {Object} ports - Port implementations.
 * @param {boolean} validateOnInit - Whether to validate the ports.
 * @returns {Object} The resolved ports.
 * @throws {Error} If validation is requested and fails.
 */
const resolvePorts = (ports, validateOnInit) => {
  const resolvedPorts = {
    randomGenerator: ports.randomGenerator,
    logger: ports.logger ?? new NoOpLogger(),
    storage: ports.storage ?? new MemoryStorage(),
    clock: ports.clock ?? new FixedClock(),
    dictionary: ports.dictionary ?? new MemoryDictionary(DEFAULT_WORD_LIST),
  };
  if (validateOnInit) {
    const validation = validatePorts(resolvedPorts);
    if (!validation.isValid) {
      throw new Error(
        `Port validation failed: ${validation.errors.join("; ")}`,
      );
    }
  }
  return resolvedPorts;
};

/**
 * Throws unless the type is known and the configuration valid for it.
 *
 * @param {string} type - Password type.
 * @param {Object} config - Configuration to validate.
 * @throws {Error} The first failing check, or all validation errors joined.
 */
const assertGeneratable = (type, config) => {
  if (!type) {
    throw new Error(PASSWORD_ERRORS.TYPE_REQUIRED);
  }
  if (!isValidPasswordType(type)) {
    throw new Error(PASSWORD_ERRORS.UNKNOWN_TYPE(type, VALID_PASSWORD_TYPES));
  }
  const validation = validatePasswordTypeConfig(type, config);
  if (!validation.isValid) {
    throw new Error(validation.errors.join("; "));
  }
};

/**
 * Wraps a generated password with its entropy, security level and metadata.
 *
 * @param {string|Object} password - The generated password.
 * @param {Object} generatedConfig - The configuration it was generated with.
 * @param {Object} resolvedPorts - The service's ports.
 * @returns {Promise<Object>} The result object.
 */
const withEntropy = async (password, generatedConfig, resolvedPorts) => {
  const entropyConfig = await withDictionarySize(
    generatedConfig,
    resolvedPorts.dictionary,
  );
  const { entropy, securityLevel } = measureEntropy(
    password,
    entropyConfig,
    resolvedPorts.logger,
  );
  return {
    password,
    entropy: Math.round(entropy * 100) / 100, // Round to 2 decimal places
    securityLevel,
    metadata: {
      type: generatedConfig.type,
      length: password.length,
      config: generatedConfig,
      generatedAt: await resolvedPorts.clock.now(),
    },
  };
};

/**
 * Validates options, generates a password and optionally measures it.
 *
 * @param {Object} resolvedPorts - The service's ports.
 * @param {Object} options - Generation options (see the service's generate()).
 * @returns {Promise<string|Object>} The password, or the result object with entropy.
 */
const generateWithPorts = async (resolvedPorts, options) => {
  const {
    type,
    length = DEFAULT_LENGTH,
    iteration = 1,
    separator = "-",
    includeEntropy = false,
    ...restOptions
  } = options;

  assertGeneratable(type, { length, iteration, ...restOptions });

  const generatedConfig = {
    type,
    length,
    iteration,
    separator,
    ...restOptions,
  };
  const password = await generate(generatedConfig, resolvedPorts);

  // Return just password if entropy not requested (for backward compatibility)
  if (!includeEntropy) {
    return password;
  }
  return withEntropy(password, generatedConfig, resolvedPorts);
};

/**
 * Estimates entropy for a configuration with the unified normalizer,
 * falling back to the legacy calculation.
 *
 * @param {Object} options - Password configuration.
 * @param {string} fakePassword - Password to measure (empty for configuration only).
 * @param {Function} perUnit - (type, options, totalBits) => per-unit entropy.
 * @returns {Object} Entropy information.
 */
const estimateEntropy = (options, fakePassword, perUnit) => {
  const { type, length = DEFAULT_LENGTH, iteration = 1 } = options;

  try {
    const normalizedEntropy = normalizeEntropy(fakePassword, type, options);
    // Legacy entropy still drives the recommendation
    const legacyEntropy = calculateTotalEntropy({ type, length, iteration });
    return {
      totalBits: normalizedEntropy,
      securityLevel: getSecurityLevelFromNormalizer(normalizedEntropy),
      recommendation: getSecurityRecommendation(legacyEntropy),
      perUnit: perUnit(type, options, normalizedEntropy),
      legacy: {
        totalBits: legacyEntropy,
        securityLevel: getSecurityLevel(legacyEntropy),
      },
    };
  } catch (error) {
    const totalEntropy = calculateTotalEntropy({ type, length, iteration });
    return {
      totalBits: totalEntropy,
      securityLevel: getSecurityLevel(totalEntropy),
      recommendation: getSecurityRecommendation(totalEntropy),
      perUnit:
        type === "memorable"
          ? totalEntropy / iteration
          : length * Math.log2(64),
      error: error.message,
    };
  }
};

/**
 * Entropy per word, syllable or character, for display.
 *
 * @param {string} type - Password type.
 * @param {Object} options - Configuration with iteration and length.
 * @param {number} totalEntropy - Total entropy in bits.
 * @returns {number} Entropy per unit, or 0 for an unknown type or no units.
 */
const perUnitEntropy = (type, options, totalEntropy) => {
  const { iteration = 1, length = DEFAULT_LENGTH } = options;
  const unitCount = {
    word: iteration,
    char: length * iteration,
    customChar: (length || 1) * iteration,
  }[UNIT_KIND[type]];
  return unitCount > 0 ? totalEntropy / unitCount : 0;
};

/**
 * Validates a configuration without generating.
 *
 * @param {Object} options - Password configuration.
 * @returns {Object} Validation result with isValid and errors.
 */
const validateOptions = (options) => {
  const { type } = options;
  if (!type) {
    return { isValid: false, errors: [PASSWORD_ERRORS.TYPE_REQUIRED] };
  }
  if (!isValidPasswordType(type)) {
    return {
      isValid: false,
      errors: [PASSWORD_ERRORS.UNKNOWN_TYPE(type, VALID_PASSWORD_TYPES)],
    };
  }
  return validatePasswordTypeConfig(type, options);
};

/**
 * Creates a password generation service with injected ports.
 *
 * @param {Object} config - Service configuration.
 * @param {boolean} [config.validateOnInit=true] - Whether to validate ports on initialization.
 * @param {Object} ports - Port implementations.
 * @param {Object} ports.randomGenerator - RandomGeneratorPort implementation (required).
 * @param {Object} [ports.logger] - LoggerPort implementation.
 * @param {Object} [ports.storage] - StoragePort implementation.
 * @param {Object} [ports.clock] - ClockPort implementation.
 * @param {Object} [ports.dictionary] - DictionaryPort implementation.
 * @returns {Object} Password generation service.
 * @throws {Error} If required ports are missing or invalid.
 */
export function createService(config = {}, ports) {
  const { validateOnInit = true } = config;
  const resolvedPorts = resolvePorts(ports, validateOnInit);

  return {
    /**
     * Generates a password. Options: type, length (16), iteration (1),
     * separator ("-"), includeEntropy (false), plus type-specific options.
     * Resolves to the password, or { password, entropy, securityLevel,
     * metadata } when includeEntropy is true.
     */
    generate: (options) => generateWithPorts(resolvedPorts, options),

    /** Generates one result per options object, in order. */
    async generateMultiple(optionsArray) {
      const results = [];
      for (const options of optionsArray) {
        results.push(await this.generate(options));
      }
      return results;
    },

    /** Estimates entropy for a configuration (optionally for a given password). */
    calculateEntropy(options, fakePassword = "") {
      return estimateEntropy(options, fakePassword, (type, opts, bits) =>
        this._calculatePerUnitEntropy(type, opts, bits),
      );
    },

    /** Calculates per-unit entropy for display purposes. @private */
    _calculatePerUnitEntropy: perUnitEntropy,

    /** Validates a configuration without generating. */
    validateConfig: validateOptions,

    /** Gets the list of supported password types. */
    getSupportedTypes: () => [...VALID_PASSWORD_TYPES],

    /** Gets the generator for a type, or null if there is none. */
    getGenerator: (type) => GENERATOR_REGISTRY[type] ?? null,

    /** Gets the resolved ports used by this service (for debugging and tests). */
    getPorts: () => ({ ...resolvedPorts }),
  };
}

/**
 * Creates a service with minimal configuration for quick usage.
 *
 * @param {Object} randomGenerator - RandomGeneratorPort implementation.
 * @returns {Object} Password generation service.
 */
export function createQuickService(randomGenerator) {
  return createService({}, { randomGenerator });
}
