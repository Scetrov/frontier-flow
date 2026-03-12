# Research: Sign In with Sui Wallet

**Feature**: 003-sui-wallet-connect  
**Date**: 2026-03-12

## 1. dapp-kit Provider Architecture

### Decision: Use `@mysten/dapp-kit` provider stack at root level

**Rationale**: The HLD (§2.2) and Solution Design (§5.7) already specify `@mysten/dapp-kit` as the wallet integration library. It provides `SuiClientProvider`, `WalletProvider`, and React hooks that handle wallet discovery, connection, disconnection, and balance queries. The library is production-stable (v1.0.3+) and designed for React applications.

**Provider nesting order** (outermost → innermost):
1. `QueryClientProvider` (`@tanstack/react-query`) — caching layer for RPC queries
2. `SuiClientProvider` — configures Sui JSON-RPC endpoints per network
3. `WalletProvider` — wallet adapter, connection state, auto-reconnect

**Alternatives considered**:
- **Manual wallet adapter**: Building custom wallet connection using `@mysten/wallet-standard` directly. Rejected because dapp-kit already wraps this with React hooks and handles edge cases (wallet detection, session persistence, multi-wallet support).
- **Dedicated state management (Zustand/Jotai)**: Not needed — dapp-kit manages wallet state internally via React context, and `@tanstack/react-query` handles RPC caching. No global state library required per Constitution (Architecture & Design Standards).

## 2. Connect/Disconnect UI Strategy

### Decision: Custom `WalletStatus` component using dapp-kit hooks (not `ConnectButton`)

**Rationale**: The dapp-kit `ConnectButton` is a pre-built component with its own styling (Radix UI-based, rounded corners, its own colour scheme). This conflicts with Frontier Flow's design system: no border-radius, Disket Mono headings, brand orange accents, dark sci-fi aesthetic. Building a custom component using the underlying hooks gives full styling control.

**Hooks used**:
- `useCurrentAccount()` — returns the connected `WalletAccount` or `null`
- `useConnectWallet()` — exposes `mutate` function to trigger wallet selection dialog
- `useDisconnectWallet()` — exposes `mutate` function to disconnect
- `useSuiClientQuery('getBalance', ...)` — fetches SUI balance for the connected address
- `useWallets()` — lists available wallet adapters (for the "no wallet detected" edge case)

**Alternatives considered**:
- **Use `ConnectButton` with CSS overrides**: Rejected because dapp-kit uses Radix UI with scoped styles. Overriding border-radius, fonts, and colours globally would be fragile and could break on library updates.
- **Use `ConnectModal` component**: dapp-kit provides a `ConnectModal` that can be triggered programmatically. This is a viable option for the wallet selection dialog while still using a custom trigger button. Will evaluate during implementation.

## 3. Balance Display

### Decision: Convert MIST to SUI using integer division, display up to 4 decimal places

**Rationale**: The Sui RPC `getBalance` endpoint returns `totalBalance` as a string denominated in MIST (1 SUI = 10⁹ MIST). For display, we convert to SUI and format with up to 4 decimal places for readability (e.g., "12.5000 SUI"). This matches the spec requirement (FR-006).

**Implementation approach**:
- Parse the string balance to `Number` (safe for typical balances; SUI total supply is ~10B, well within Number.MAX_SAFE_INTEGER when measured in MIST divided by 10⁹)
- Divide by `1_000_000_000`
- Format using `toFixed(4)` and strip unnecessary trailing zeros
- Display with "SUI" label

**Alternatives considered**:
- **BigInt arithmetic**: More precise for extremely large values, but SUI balances in practice don't exceed Number.MAX_SAFE_INTEGER / 10⁹ ≈ 9M SUI. Simple division is sufficient and more readable.
- **toLocaleString formatting**: Could introduce locale-specific separators (1.234,56 vs 1,234.56). Explicit formatting is more predictable.

## 4. Address Truncation

### Decision: Truncate to `0x1a2b...9f0e` format (first 6 + "..." + last 4 characters)

**Rationale**: Sui addresses are 66-character hex strings (0x prefix + 64 hex digits). Displaying the full address is unreadable. The 6+4 truncation pattern is an established convention in the Sui and Ethereum ecosystems, providing enough entropy to visually distinguish accounts while fitting comfortably in the navigation bar.

**Implementation**: Pure utility function in `src/utils/formatAddress.ts` — easily testable, no dependencies.

**Alternatives considered**:
- **First 4 + last 4**: Too short, insufficient visual entropy for distinguishing accounts.
- **ENS/SuiNS name resolution**: Out of scope for MVP. Could be added later as an enhancement.

## 5. Auto-Reconnect

### Decision: Use `WalletProvider`'s built-in `autoConnect` prop

**Rationale**: Setting `<WalletProvider autoConnect>` on the root provider causes dapp-kit to check `localStorage` for a previously connected wallet on mount. If the wallet adapter is still available, it reconnects silently. This satisfies FR-009 with zero custom code.

**Alternatives considered**:
- **Custom localStorage + manual reconnect**: Unnecessary complexity. dapp-kit handles the full lifecycle.

## 6. dapp-kit CSS Handling

### Decision: Import `@mysten/dapp-kit/dist/index.css` to style the wallet selection modal

**Rationale**: Even though we use a custom trigger button, the wallet selection dialog rendered by `useConnectWallet` or `ConnectModal` requires dapp-kit's CSS for its internal modal styling. Without it, the wallet list renders unstyled. The global `* { border-radius: 0; }` rule in `index.css` will override any rounded corners from dapp-kit's styles.

**Alternatives considered**:
- **Don't import CSS, build fully custom modal**: Higher implementation cost for MVP. The dapp-kit modal handles wallet adapter discovery, icons, and error states automatically. Custom modal can be a future iteration.

## 7. Peer Dependencies

### Decision: Install `@mysten/dapp-kit`, `@mysten/sui`, and `@tanstack/react-query`

**Rationale**: 
- `@mysten/dapp-kit`: Core wallet integration (hooks, providers)
- `@mysten/sui`: Peer dependency of dapp-kit; also required later for transaction building (already planned in HLD §2.2)
- `@tanstack/react-query`: Required peer dependency of dapp-kit; provides query caching for RPC calls

**Version pinning**: Per SECURITY.md §2.2, `@mysten/dapp-kit` and `@mysten/sui` must be pinned to exact versions (no `^` or `~`). `@tanstack/react-query` can use caret range since it doesn't directly affect blockchain transactions.

**React 19 compatibility**: All three packages are confirmed compatible with React 19.

## 8. Testing Strategy

### Decision: Unit tests with mocked dapp-kit hooks + E2E tests with mocked wallet

**Unit tests** (Vitest + @testing-library/react):
- Mock dapp-kit hooks (`useCurrentAccount`, `useSuiClientQuery`, etc.) via `vi.mock`
- Test `WalletStatus` component in connected/disconnected/error states
- Test `formatAddress` utility with various input lengths
- Test balance formatting (MIST → SUI conversion, zero balance, error states)

**E2E tests** (Playwright):
- Mock wallet extension is not practical in Playwright (browser extensions can't be injected)
- Test the disconnected state (Connect button visible, no wallet info)
- Test the no-wallet-detected message (when no wallets are registered)
- Integration tests with a real wallet would be manual QA

**Alternatives considered**:
- **MSW for RPC mocking**: Could intercept `sui_getBalance` calls. Viable but adds complexity for a UI-focused feature. Hook mocking is simpler for unit tests.
