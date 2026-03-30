# Quickstart: Sign In with Sui Wallet

**Feature**: 003-sui-wallet-connect

## Prerequisites

- Bun ≥ 1.0.0 installed
- A Sui-compatible browser wallet extension (e.g., [Sui Wallet](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil))
- Node.js ≥ 18 (for Vitest/Playwright)

## Install Dependencies

```bash
bun add @mysten/dapp-kit@1.0.3 @mysten/sui@2.7.0 @tanstack/react-query@^5.90.21
```

## Implementation Order

1. **`src/utils/formatAddress.ts`** — Pure utility, no dependencies. Write + test first.
2. **`src/__tests__/formatAddress.test.ts`** — Unit tests for address truncation.
3. **`src/components/WalletStatus.tsx`** — Connect/Disconnect button, address display, balance display. Uses dapp-kit hooks.
4. **`src/__tests__/WalletStatus.test.tsx`** — Unit tests with mocked dapp-kit hooks.
5. **`src/main.tsx`** — Wrap `<App />` with `QueryClientProvider` → `SuiClientProvider` → `WalletProvider`.
6. **`src/components/Header.tsx`** — Add `<WalletStatus />` to the right side of the header.
7. **`src/__tests__/Header.test.tsx`** — Update existing test for wallet integration.
8. **`tests/e2e/wallet.spec.ts`** — E2E tests for disconnected state and connect button visibility.

## Run

```bash
bun dev          # Start dev server
bun run test:run # Run unit tests once
bun run test:e2e tests/e2e/wallet.spec.ts
bun run lint     # Lint check
bun run typecheck
bun run build
```

## Verify

1. Open `http://localhost:5179` in a browser with a Sui wallet extension
2. Confirm the "Connect" button appears in the top-right of the header
3. Click "Connect" → wallet selection dialog opens
4. Select wallet → approve connection → address and balance appear
5. Click "Disconnect" → reverts to "Connect" button
6. Refresh page → auto-reconnects if previously connected
7. In a browser without a Sui wallet, click "Connect" and confirm the install guidance appears instead of a broken modal

## Key Files

| File | Role |
|------|------|
| `src/main.tsx` | Provider wiring (QueryClient, SuiClient, Wallet) |
| `src/components/WalletStatus.tsx` | Wallet UI component |
| `src/components/Header.tsx` | Header layout (hosts WalletStatus) |
| `src/utils/formatAddress.ts` | Address truncation utility |
