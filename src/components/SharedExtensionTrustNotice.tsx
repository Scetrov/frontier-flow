/**
 * The standing warning shown wherever someone else's package is offered for
 * authorization. Resolution establishes a package's identity and its
 * `TurretAuth` declaration; it establishes nothing about what the extension
 * does once authorized, and the capability requires saying so at the point of
 * entry. Both the authorize field and the onboarding route render this, so the
 * wording cannot drift between them.
 */
function SharedExtensionTrustNotice({ className }: { readonly className?: string }) {
  return (
    <p className={className ?? "text-xs text-[var(--brand-orange)]"}>
      Only authorize logic you trust. Checking a package confirms its identity
      and TurretAuth declaration, not that its behavior is safe. Review the
      contract and verify its package id and network before authorizing.
    </p>
  );
}

export default SharedExtensionTrustNotice;
