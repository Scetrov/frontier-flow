import { useState } from "react";

const ISSUES_URL = "https://github.com/Scetrov/frontier-flow/issues";

/**
 * Dismissible alpha-software warning banner displayed below the primary navigation.
 */
function AlphaBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="ff-alpha-banner" role="status">
      <p className="ff-alpha-banner__text">
        <strong>Alpha Software</strong> — Frontier Flow is under active development. Features may change or break.
        Please report issues on{" "}
        <a
          className="ff-alpha-banner__link"
          href={ISSUES_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>.
      </p>
      <button
        aria-label="Dismiss alpha notice"
        className="ff-alpha-banner__dismiss"
        onClick={() => { setDismissed(true); }}
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export default AlphaBanner;
