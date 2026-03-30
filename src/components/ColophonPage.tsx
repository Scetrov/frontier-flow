interface ProjectPackage {
  readonly name: string;
  readonly version: string;
}

const acknowledgements = [
  "CCP Games",
  "Mysten Labs",
  "zktx.io",
  "The Builders of EVE Frontier",
  "Everyone who tested Frontier Flow",
] as const;

const packageGroups = [
  {
    description: "Runtime libraries bundled into the product experience.",
    id: "dependencies",
    label: "Runtime Packages",
    packages: __PROJECT_PACKAGES__.dependencies,
  },
  {
    description: "Authoring, testing, linting, and build-time tooling.",
    id: "devDependencies",
    label: "Development Packages",
    packages: __PROJECT_PACKAGES__.devDependencies,
  },
] as const satisfies readonly {
  readonly description: string;
  readonly id: string;
  readonly label: string;
  readonly packages: readonly ProjectPackage[];
}[];

/**
 * Standalone project colophon with acknowledgements and a build-time package manifest.
 */
function ColophonPage() {
  return (
    <main className="ff-colophon" aria-label="Colophon page">
      <section className="ff-colophon__hero">
        <div className="ff-colophon__hero-copy">
          <p className="ff-colophon__eyebrow">Colophon</p>
          <h1 className="ff-colophon__title">Built with gratitude, shipped with a real toolchain.</h1>
          <p className="ff-colophon__lede">
            Frontier Flow sits at the intersection of EVE Frontier experimentation, Sui tooling, and a lot of direct user feedback.
            This page is a small thank-you note and a plain-spoken record of the packages currently declared in the project.
          </p>
        </div>
        <div className="ff-colophon__hero-actions">
          <a className="ff-colophon__link ff-colophon__link--primary" href="/">
            Return to Frontier Flow
          </a>
          <p className="ff-colophon__meta">v{__APP_VERSION__} with {__PROJECT_PACKAGES__.totalCount} declared packages.</p>
        </div>
      </section>

      <section className="ff-colophon__section" aria-labelledby="colophon-thanks-heading">
        <div className="ff-colophon__section-header">
          <p className="ff-colophon__section-kicker">Acknowledgements</p>
          <h2 className="ff-colophon__section-title" id="colophon-thanks-heading">Thanks</h2>
        </div>
        <ul className="ff-colophon__thanks-list">
          {acknowledgements.map((name) => (
            <li className="ff-colophon__thanks-item" key={name}>
              <span className="ff-colophon__thanks-mark" aria-hidden="true">//</span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ff-colophon__section" aria-labelledby="colophon-packages-heading">
        <div className="ff-colophon__section-header ff-colophon__section-header--wide">
          <div>
            <p className="ff-colophon__section-kicker">Package Manifest</p>
            <h2 className="ff-colophon__section-title" id="colophon-packages-heading">Declared project packages</h2>
          </div>
          <p className="ff-colophon__section-copy">
            Sourced from package.json at build time so the page stays aligned with the repo.
          </p>
        </div>

        <div className="ff-colophon__package-grid">
          {packageGroups.map((group) => (
            <section className="ff-colophon__package-panel" key={group.id} aria-labelledby={`colophon-${group.id}-heading`}>
              <div className="ff-colophon__package-panel-header">
                <div>
                  <p className="ff-colophon__package-count">{group.packages.length} packages</p>
                  <h3 className="ff-colophon__package-title" id={`colophon-${group.id}-heading`}>{group.label}</h3>
                </div>
                <p className="ff-colophon__package-description">{group.description}</p>
              </div>

              <ul className="ff-colophon__package-list">
                {group.packages.map((pkg) => (
                  <li className="ff-colophon__package-item" key={pkg.name}>
                    <span className="ff-colophon__package-name">{pkg.name}</span>
                    <span className="ff-colophon__package-version">{pkg.version}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ColophonPage;