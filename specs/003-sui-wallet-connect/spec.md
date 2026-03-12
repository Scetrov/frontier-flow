# Feature Specification: Sign In with Sui Wallet

**Feature Branch**: `003-sui-wallet-connect`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "Sign in with Sui wallet connection and balance display"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect Sui Wallet (Priority: P1)

A user visits Frontier Flow and wants to connect their Sui wallet so the application can identify them and interact with the Sui blockchain on their behalf. They click the "Connect" button in the top-right corner of the navigation bar, which opens a wallet selection dialog listing available Sui wallets installed in their browser. After selecting a wallet (e.g., Sui Wallet, Suiet, Ethos), the wallet extension prompts them to approve the connection. Upon approval, the button changes to "Disconnect", and the user's truncated wallet address and SUI balance are displayed prominently in the top navigation bar.

**Why this priority**: Wallet connection is the foundational interaction for all blockchain features — without it, users cannot deploy contracts, check balances, or interact with the Sui network. This is the core prerequisite for the entire deployment pipeline.

**Independent Test**: Can be fully tested by clicking "Connect", selecting a wallet, approving the connection, and verifying the wallet address and SUI balance appear in the header. Delivers immediate value by confirming blockchain identity.

**Acceptance Scenarios**:

1. **Given** the user is not connected to a wallet, **When** they click the "Connect" button, **Then** a wallet selection dialog is displayed listing available Sui wallet providers.
2. **Given** the wallet selection dialog is open, **When** the user selects a wallet provider, **Then** the wallet extension prompts for connection approval.
3. **Given** the user approves the connection in their wallet extension, **When** the approval completes, **Then** the "Connect" button changes to "Disconnect", and the truncated wallet address and SUI balance are displayed in the top navigation bar.
4. **Given** no Sui wallet extensions are installed, **When** the user clicks "Connect", **Then** a helpful message is displayed indicating that a Sui-compatible wallet is required, with guidance on how to install one.

---

### User Story 2 - View Wallet Information (Priority: P1)

Once connected, the user can see their wallet information at a glance in the top navigation bar. The connected wallet address is displayed in a truncated format (e.g., `0x1a2b...9f0e`) for readability, and the current SUI balance is shown alongside it with a recognizable SUI label. The balance updates when the page is loaded or when the user reconnects.

**Why this priority**: Displaying wallet information is equally critical to the connection itself — it provides the user with continuous awareness of which account is active and their available balance, which is essential context before deploying contracts.

**Independent Test**: Can be tested by connecting a wallet and verifying the address is truncated correctly and the SUI balance displays the correct value. Delivers value by providing ongoing account awareness.

**Acceptance Scenarios**:

1. **Given** the user is connected to a wallet, **When** they look at the top navigation bar, **Then** they see their truncated wallet address displayed prominently.
2. **Given** the user is connected to a wallet, **When** they look at the top navigation bar, **Then** they see their current SUI balance displayed with proper formatting (e.g., "12.50 SUI").
3. **Given** the user's wallet has a zero balance, **When** they view the navigation bar, **Then** the balance displays as "0 SUI".

---

### User Story 3 - Disconnect Wallet (Priority: P2)

A connected user decides to disconnect their wallet, either to switch accounts or to end their session. They click the "Disconnect" button in the top navigation bar. The wallet is disconnected, the address and balance information are removed from the header, and the button reverts to "Connect".

**Why this priority**: Disconnecting is important for security and account management but is secondary to the initial connection and information display — it's a complementary action that completes the wallet lifecycle.

**Independent Test**: Can be tested by connecting a wallet, clicking "Disconnect", and verifying the UI reverts to the disconnected state with the "Connect" button visible.

**Acceptance Scenarios**:

1. **Given** the user is connected to a wallet, **When** they click "Disconnect", **Then** the wallet is disconnected, the address and balance are removed, and the button reverts to "Connect".
2. **Given** the user has disconnected, **When** they click "Connect" again, **Then** the wallet selection flow begins anew.

---

### User Story 4 - Persistent Connection Across Page Reloads (Priority: P3)

A user connects their wallet, navigates away, and returns to Frontier Flow. The application automatically reconnects to the previously connected wallet (if still available and authorized) so the user does not have to manually reconnect each time. The wallet address and SUI balance reappear in the navigation bar without additional interaction.

**Why this priority**: Auto-reconnection is a quality of life improvement that reduces friction but is not strictly required for the core connect/disconnect/display workflow.

**Independent Test**: Can be tested by connecting a wallet, refreshing the page, and verifying the wallet reconnects automatically with the address and balance displayed.

**Acceptance Scenarios**:

1. **Given** the user previously connected a wallet and has not disconnected, **When** they reload the page, **Then** the application reconnects automatically and displays the wallet address and SUI balance.
2. **Given** the user previously disconnected their wallet, **When** they reload the page, **Then** the application does not auto-connect and shows the "Connect" button.

---

### Edge Cases

- What happens when the user's wallet browser extension is uninstalled or disabled after connecting? The application should detect the wallet is no longer available, revert to the disconnected state, and show the "Connect" button.
- What happens when the wallet connection is rejected by the user? The application should remain in the disconnected state and allow the user to retry.
- What happens when the network request for balance fails? The balance area should show a fallback state (e.g., "— SUI") and not crash the application.
- What happens when the user connects a wallet with an extremely long address? The address is truncated to a fixed format (first 6 and last 4 characters) regardless of length.
- What happens if the user switches accounts within their wallet extension? The application should reflect the new active account address and balance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Connect" button in the top-right area of the navigation bar when no wallet is connected.
- **FR-002**: System MUST open a wallet selection interface when the "Connect" button is clicked, listing all available Sui-compatible wallet providers detected in the browser.
- **FR-003**: System MUST initiate the wallet connection handshake with the user's selected wallet provider and handle the approval/rejection response.
- **FR-004**: Upon successful connection, the system MUST replace the "Connect" button with a "Disconnect" button.
- **FR-005**: Upon successful connection, the system MUST display the connected wallet address in a truncated format (first 6 characters + "..." + last 4 characters) in the top navigation bar.
- **FR-006**: Upon successful connection, the system MUST display the user's current SUI balance in the top navigation bar, formatted with up to 4 decimal places and a "SUI" label.
- **FR-007**: When the "Disconnect" button is clicked, the system MUST disconnect the wallet, remove the address and balance display, and revert the button to "Connect".
- **FR-008**: System MUST show a user-friendly message when no Sui wallet extensions are detected, guiding the user to install a compatible wallet.
- **FR-009**: System MUST attempt to auto-reconnect to a previously connected wallet on page load, restoring the connected state without user intervention.
- **FR-010**: System MUST handle network or wallet errors gracefully, displaying a fallback state for balance (e.g., "— SUI") without crashing the application.
- **FR-011**: The wallet information display MUST be styled consistently with the existing Frontier Flow design system (dark theme, Disket Mono headings, brand orange accents, no border-radius).
- **FR-012**: All interactive wallet elements (buttons, address display) MUST be keyboard accessible with visible focus indicators per the design system accessibility requirements.

### Key Entities

- **Connected Wallet**: Represents the user's active Sui wallet session. Key attributes: wallet address, provider name, connection status (connected/disconnected).
- **SUI Balance**: The user's current SUI token balance on the connected network. Displayed in the navigation bar with proper decimal formatting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the wallet connection flow (click Connect → select wallet → approve) in under 15 seconds.
- **SC-002**: 95% of users successfully connect their wallet on the first attempt when they have a compatible wallet installed.
- **SC-003**: Connected wallet address and SUI balance are visible within 2 seconds of successful connection.
- **SC-004**: Wallet auto-reconnection succeeds on page reload within 3 seconds for previously connected users.
- **SC-005**: The disconnect action completes and reverts the UI in under 1 second.
- **SC-006**: All wallet UI elements pass WCAG 2.1 AA accessibility requirements including keyboard navigation and minimum contrast ratios.

## Assumptions

- Users are expected to have a Sui-compatible browser wallet extension installed (e.g., Sui Wallet, Suiet, Ethos). The application does not provide a built-in wallet.
- The application connects to the Sui network configured in the user's wallet (mainnet, testnet, or devnet). Network selection is managed by the wallet, not the application.
- Balance is displayed for the native SUI token only; custom token balances are out of scope for this feature.
- The `@mysten/dapp-kit` library (already planned in the HLD) provides the wallet connection, auto-reconnect, and balance query capabilities.
- The wallet connection state is managed by the dapp-kit provider and persists via the wallet adapter's built-in session management.
