# Data Model: Sign In with Sui Wallet

**Feature**: 003-sui-wallet-connect  
**Date**: 2026-03-12

## Entities

### 1. NetworkConfig

**Source**: Created in `src/main.tsx` using `createNetworkConfig` from `@mysten/dapp-kit` and `getJsonRpcFullnodeUrl` from `@mysten/sui/jsonRpc`.

| Field     | Type                                | Description                                                    |
|-----------|-------------------------------------|----------------------------------------------------------------|
| `testnet` | `{ network: string; url: string }` | Full-node URL and network name for Sui testnet                 |
| `mainnet` | `{ network: string; url: string }` | Full-node URL and network name for Sui mainnet                 |

**Notes**: Network selection is managed by the user's wallet extension, not by the application. The config is passed to `SuiClientProvider` as `networks`. Default network is `testnet` for development.

---

### 2. WalletAccount (external — `@mysten/dapp-kit`)

**Source**: Returned by `useCurrentAccount()` hook. This type is owned by dapp-kit; we consume it read-only.

| Field      | Type     | Description                                      |
|------------|----------|--------------------------------------------------|
| `address`  | `string` | Full Sui address (66-char hex, `0x` prefix)      |
| `publicKey`| `Uint8Array` | Account public key bytes                      |
| `chains`   | `readonly string[]` | Supported chain identifiers            |
| `features` | `readonly string[]` | Supported wallet features              |
| `label`    | `string \| undefined` | Optional user-assigned account label |
| `icon`     | `string \| undefined` | Optional wallet icon URL             |

**Used fields**: Only `address` is used in this feature (for display and balance query).

---

### 3. CoinBalance (external — `@mysten/sui`)

**Source**: Returned by `useSuiClientQuery('getBalance', { owner: address })`.

| Field              | Type     | Description                                    |
|--------------------|----------|------------------------------------------------|
| `totalBalance`     | `string` | Total balance in MIST (1 SUI = 10⁹ MIST)      |
| `coinType`         | `string` | Coin type identifier (e.g., `0x2::sui::SUI`)  |
| `coinObjectCount`  | `number` | Number of coin objects                         |
| `lockedBalance`    | `object` | Locked balance details                         |

**Used fields**: Only `totalBalance` is used. Conversion: `Number(totalBalance) / 1_000_000_000` → SUI value.

---

### 4. WalletStatus (UI state — derived, not stored)

**Source**: Derived from dapp-kit hooks in `WalletStatus.tsx`. Not persisted.

| Derived State        | Source Hook/Logic                     | Type                  |
|----------------------|---------------------------------------|-----------------------|
| `account`            | `useCurrentAccount()`                 | `WalletAccount \| null` |
| `isConnected`        | `account !== null`                    | `boolean`             |
| `displayAddress`     | `formatAddress(account.address)`      | `string`              |
| `displayBalance`     | `formatBalance(balance.totalBalance)` | `string`              |
| `balanceError`       | `useSuiClientQuery` error state       | `boolean`             |

**Notes**: No props are passed to `WalletStatus` — all state comes from dapp-kit hooks. This is consistent with the Solution Design §1.1 which states: "Network selection and wallet connection state are handled internally by dapp-kit hooks."

## Utility Functions

### `formatAddress(address: string): string`

**Location**: `src/utils/formatAddress.ts`

| Parameter | Type     | Description                      |
|-----------|----------|----------------------------------|
| `address` | `string` | Full Sui address (66-char hex)   |
| **Returns** | `string` | Truncated: `0x1a2b...9f0e`    |

**Rules**:
- Returns `address.slice(0, 6) + "..." + address.slice(-4)`
- Input must be a valid hex string starting with `0x`
- If address is shorter than 10 characters, return as-is (guard)

### `formatBalance(balanceMist: string): string`

**Location**: Inline in `WalletStatus.tsx` (simple enough to not warrant a separate file)

| Parameter     | Type     | Description                        |
|---------------|----------|------------------------------------|
| `balanceMist` | `string` | Balance in MIST from RPC response  |
| **Returns**   | `string` | Formatted: `"12.5000 SUI"`        |

**Rules**:
- Convert: `Number(balanceMist) / 1_000_000_000`
- Format with up to 4 decimal places (strip trailing zeros beyond the first)
- Append " SUI" label
- On NaN or error: return "— SUI"

## State Transitions

```text
┌─────────────┐    click Connect     ┌──────────────────┐
│ Disconnected │ ──────────────────► │ Wallet Selection  │
│              │                     │ (dapp-kit modal)  │
└─────────────┘                     └──────────────────┘
       ▲                                    │
       │                          ┌─────────┴──────────┐
       │                          │                    │
       │                    User Approves        User Rejects
       │                          │                    │
       │                          ▼                    │
       │                   ┌─────────────┐             │
       │                   │  Connected  │             │
       │                   │ addr + bal  │             │
       │                   └─────────────┘             │
       │                          │                    │
       │                  click Disconnect             │
       │                          │                    │
       └──────────────────────────┴────────────────────┘
```

**Auto-reconnect path**: On page load, `WalletProvider` with `autoConnect` checks localStorage → if previous wallet found and adapter available → transitions directly to Connected state.

## Validation Rules

| Rule                          | Source  | Enforcement               |
|-------------------------------|---------|---------------------------|
| Address starts with `0x`      | FR-005  | `formatAddress` guard     |
| Address is 66 characters      | Sui SDK | Guaranteed by wallet      |
| Balance is non-negative       | Sui RPC | Guaranteed by blockchain  |
| Balance format ≤ 4 decimals   | FR-006  | `formatBalance` function  |
| Network errors don't crash UI | FR-010  | React error boundary + fallback balance display |

## Relationships

```text
main.tsx
  └── QueryClientProvider
        └── SuiClientProvider (networks config)
              └── WalletProvider (autoConnect)
                    └── App.tsx
                          └── Header.tsx
                                └── WalletStatus.tsx
                                      ├── useCurrentAccount() → WalletAccount
                                      ├── useConnectWallet() → connect action
                                      ├── useDisconnectWallet() → disconnect action
                                      └── useSuiClientQuery('getBalance') → CoinBalance
```
