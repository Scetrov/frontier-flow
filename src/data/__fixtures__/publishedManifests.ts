/**
 * Test fixtures for Published.toml manifest parsing.
 *
 * These fixtures cover replacement, upgrade, malformed, partial, and
 * duplicated-key scenarios.
 */

/**
 * A valid replacement manifest: Stillness where published-at == original-id.
 */
export const VALID_REPLACEMENT_MANIFEST = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A valid upgrade manifest for both targets where published-at != original-id.
 */
export const VALID_UPGRADE_MANIFEST = `
[published.testnet_stillness]
published-at = "0xd2fd1224f881e7a705dbc211888af11655c315f2ee0f03fe680fc3176e6e4780"
original-id = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c"
toolchain-version = "1.69.1"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest missing the entire Stillness section.
 */
export const MISSING_STILLNESS_SECTION = `
[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest missing the entire Utopia section.
 */
export const MISSING_UTOPIA_SECTION = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"
`;

/**
 * A completely empty manifest.
 */
export const EMPTY_MANIFEST = ``;

/**
 * A manifest with a duplicate key in the Stillness section.
 */
export const DUPLICATE_PUBLISHED_AT = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
published-at = "0xd2fd1224f881e7a705dbc211888af11655c315f2ee0f03fe680fc3176e6e4780"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with a duplicate original-id key.
 */
export const DUPLICATE_ORIGINAL_ID = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with a malformed published-at (not 0x-prefixed hex).
 */
export const MALFORMED_PUBLISHED_AT = `
[published.testnet_stillness]
published-at = "not-a-hex-id"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with a malformed original-id.
 */
export const MALFORMED_ORIGINAL_ID = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "zz_invalid"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with "0x" as a package ID (no hex digits after prefix).
 */
export const EMPTY_HEX_ID = `
[published.testnet_stillness]
published-at = "0x"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with missing toolchain-version in Stillness.
 */
export const MISSING_TOOLCHAIN_VERSION = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * A manifest with missing published-at in Utopia.
 */
export const MISSING_PUBLISHED_AT = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;
