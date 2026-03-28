interface PrivacyNoticeBannerProps {
  readonly onDismiss: () => void;
}

export default function PrivacyNoticeBanner({ onDismiss }: PrivacyNoticeBannerProps) {
  return (
    <section aria-label="Privacy notice" className="ff-privacy-banner">
      <div className="ff-privacy-banner__copy">
        <p className="ff-privacy-banner__eyebrow">Privacy Notice</p>
        <p className="ff-privacy-banner__text">
          Frontier Flow does not track visitors. Our hosting partners, Netlify and Cloudflare, may collect information about usage in accordance with their own privacy policies.
        </p>
      </div>
      <button aria-label="Dismiss privacy notice" className="ff-privacy-banner__dismiss" onClick={onDismiss} type="button">
        Dismiss
      </button>
    </section>
  );
}