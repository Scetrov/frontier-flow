## Context

Routing in this application is a pathname comparison in `App()` dispatching to a lazily imported page — `/icon-preview`, `/colophon`, `/kitchen-sink`. An onboarding route costs one branch and one component; nothing about the editor, compiler, deployment, or wallet lifecycle is involved.

The verification work already exists. `resolveSharedAuthorizationContract` reads a package over the target-aware gRPC client, asserts the returned identity matches the request, and requires a locally declared `TurretAuth` witness. The route is a caller of that, not a second implementation of it.

## Goals / Non-Goals

**Goals:** Let someone adopt a published contract from a link without transcribing identifiers, while seeing exactly what they are adopting before any wallet or turret is involved.

**Non-Goals:** Any notion of tribes or membership; a contract directory; changing authorization; or making the link itself a form of consent.

## Decisions

### The link finds a contract; it never consents to one

Nothing is saved, no wallet is touched, and no turret is changed by opening the link. The page resolves the package, shows what it found, and waits. Confirmation saves the extension and opens the authorize view, where turret selection and authorization remain separate explicit acts.

This is the central property of the design, not a nicety. A shareable link that authorized on arrival would be a better phishing instrument than the field it replaces — one click instead of a deliberate paste — which is exactly the abuse @Scetrov named in review. The standing trust notice is rendered here by the same component the authorize field uses, so the two cannot drift apart.

Alternative: preselect the reader's turrets to save a step. Rejected for the same reason — the saved step is the step where a person decides.

### The link carries the module, and a mismatch is fatal

The module is not strictly required, since resolution can discover it. Carrying it makes the link self-describing: the page can say what contract is being offered before the network answers, and the resolved module becomes a check on the link rather than a value taken on faith.

When the two disagree the page refuses and names both. Preferring the resolved module would quietly repair a link that may have been tampered with or mis-shared; preferring the link's module would authorize against something the package does not declare.

### Query parameters over path segments

A package id and a network identifier containing a colon (`testnet:stillness`) are both awkward as path segments, and the three values are unordered attributes of one contract rather than a hierarchy. Query parameters also degrade legibly: a link missing one parameter is reported as missing that parameter.

### An entry point, not a parallel interface

Confirmation hands off to the existing authorize view rather than re-implementing turret listing, selection, and progress. The route owns resolution and consent; everything after that is the behaviour the application already has, and stays covered by its existing tests.

## Risks / Trade-offs

**A link is a social-engineering vector.** This change cannot remove that, and does not pretend to: it narrows what a link can do to "propose a contract", shows the full package id and network before anything is adopted, and states plainly that verification establishes identity rather than safety. A reader who approves without reading remains exposed — as they are today when pasting an id a stranger sent them.

**Per-browser storage, as before.** The route stores through `sharedExtensionStorage`, so an onboarded contract follows the browser rather than the player. Re-opening the link is the recovery path, which is the point of having a link.
