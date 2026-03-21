import type { ReactNode } from "react";

import { ConservativeConnectIcon, ConservativeDeployIcon } from "./HeaderActionIcons";

type IconPreviewVariantSlug = "conservative" | "product-fit" | "engineering";

interface BuildToolCandidate {
  readonly slug: string;
  readonly title: string;
  readonly icon: ReactNode;
  readonly note: string;
}

interface BuildConceptCandidate {
  readonly slug: string;
  readonly title: string;
  readonly icon: ReactNode;
  readonly note: string;
}

interface IconPreviewAction {
  readonly icon: ReactNode;
  readonly label: string;
  readonly note: string;
}

interface IconPreviewVariant {
  readonly slug: IconPreviewVariantSlug;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly actions: {
    readonly build: IconPreviewAction;
    readonly deploy: IconPreviewAction;
    readonly connect: IconPreviewAction;
  };
}

function HammerIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.8 2.5L13.1 6.8L11.6 8.3L7.3 4" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M7.9 5.8L3.1 10.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.6 13.4L4.6 11.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.2 2.2L10.7 3.7L8.8 5.6L7.3 4.1L9.2 2.2Z" fill="currentColor" />
    </svg>
  );
}

function ClawHammerIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.1 2.7L12.9 6.5L11.4 8L7.6 4.2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8.1 5.1L3.2 10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.7 13.3L4.7 11.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10.4 2.3L13.2 1.9L12.8 4.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function CrossedToolsIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3.4L12.6 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M12 3.4L3.4 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M2.9 2.8L4.8 4.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10.8 11.4L12.8 13.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10.9 2.6C11.8 2.2 13 2.4 13.7 3.1L12.1 4.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M2.5 11.3L4.1 12.9C3.4 13.6 2.2 13.8 1.3 13.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.8 2.8C11.6 2.5 12.5 2.7 13.1 3.3L11.4 5C11 5.4 10.4 5.5 9.9 5.3L8.7 6.5L11 8.8L9.8 10L7.5 7.7L4.1 11.1C3.5 11.7 2.5 11.7 1.9 11.1C1.3 10.5 1.3 9.5 1.9 8.9L5.3 5.5L4.7 4.9C4.5 4.4 4.6 3.8 5 3.4L6.7 1.7C7.3 2.3 7.5 3.2 7.2 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
    </svg>
  );
}

function ScrewdriverWrenchIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.3 12.7L7.1 8.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M2.7 13.3L4.2 14.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.4 2.6C10.2 2.3 11.2 2.5 11.8 3.1L10.2 4.7C9.8 5.1 9.2 5.2 8.7 5L5.9 7.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8.3 7.1L13.2 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M12 10.8L13.4 9.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function CogHammerIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11.4" cy="4.6" r="1.9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.4 1.8V2.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M11.4 6.9V7.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M8.8 4.6H8.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M14.5 4.6H14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M8.2 10.1L3.4 14.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.8 7.8L8.7 9.7L7.2 11.2L5.3 9.3L6.8 7.8Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function AnvilIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5H8.4C9.4 5 10.2 4.2 10.2 3.2V3H12.6V5.2C12.6 6.5 11.5 7.6 10.2 7.6H8.8L7.9 9.2H3V5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M2.5 11.8H13.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.6 9.2V11.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function StackedBlocksIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.8 4.3H7.1V7.5H2.8V4.3Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.9 4.3H13.2V7.5H8.9V4.3Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.8 8.7H10.2V11.9H5.8V8.7Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function BlueprintIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2.8H10.8L13 5V13.2H3V2.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M10.8 2.8V5H13" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M5 6.5H11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M5 9H8.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.8 8.1V10.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 5.1L8 2.4L12.8 5.1V10.9L8 13.6L3.2 10.9V5.1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M3.7 5.4L8 7.9L12.3 5.4" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 8V13.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function GridCompileIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3H6.5V6.5H3V3Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 3H13V6.5H9.5V3Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 9.5H6.5V13H3V9.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.3 9.6H10.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.4 8.5V10.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M12 9.6H12.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M12.4 9.2V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function NodeAssemblyIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3.4" cy="4.1" fill="currentColor" r="1.1" />
      <circle cx="8" cy="4.1" fill="currentColor" r="1.1" />
      <circle cx="12.6" cy="4.1" fill="currentColor" r="1.1" />
      <path d="M4.5 4.1H6.9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.1 4.1H11.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.4V8.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.2 9.2H10.8V12.6H5.2V9.2Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function SparkBoxIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 4.2H12.8V11.8H3.2V4.2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.9V3.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M8 12.6V14.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M5.1 3L6.1 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.9 10.8L10.9 11.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M8 5.3V8.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.6 6.7H9.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function BracesSparkIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.6 3.2L3.1 5.9L5.6 8.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M10.4 3.2L12.9 5.9L10.4 8.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 2.2V4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.7 3.15L8 4.45L9.3 3.15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 5V9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.8 9.6H9.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function PackageUploadIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.2 5.2L8 2.5L12.8 5.2V10.8L8 13.5L3.2 10.8V5.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 13.1V7.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.6 5.5L8 8L12.4 5.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 7.2V3.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M6.2 5L8 3.2L9.8 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function WalletLinkIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.6 5.4H10.8L12 6.6V11.8H2.6V5.4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M3.5 4H9.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9.2 7.6H11.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M11.1 4.7H12.7C13.5 4.7 14.1 5.3 14.1 6.1C14.1 6.9 13.5 7.5 12.7 7.5H11.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10.6 9.7H12.2C13 9.7 13.6 10.3 13.6 11.1C13.6 11.9 13 12.5 12.2 12.5H10.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function TerminalCogIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.7 4.2L4.9 6.4L2.7 8.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M6.2 8.6H8.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <circle cx="11.4" cy="10.7" r="2.1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.4 7.6V8.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M11.4 12.9V13.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M8.9 10.7H8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M14.8 10.7H13.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function BoxArrowUpIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.2V12.8H13V9.2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M8 10.2V2.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M5.4 5.2L8 2.6L10.6 5.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
      <path d="M5.1 12.8H10.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function LinkPortIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 16 16" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.8 5.2H6.6C7.5 5.2 8.2 5.9 8.2 6.8C8.2 7.7 7.5 8.4 6.6 8.4H4.8C3.9 8.4 3.2 7.7 3.2 6.8C3.2 5.9 3.9 5.2 4.8 5.2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.4 7.6H11.2C12.1 7.6 12.8 8.3 12.8 9.2C12.8 10.1 12.1 10.8 11.2 10.8H9.4C8.5 10.8 7.8 10.1 7.8 9.2C7.8 8.3 8.5 7.6 9.4 7.6Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 8H9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M11.5 4V6.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10.4 5.1H12.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

const ICON_PREVIEW_VARIANTS: readonly IconPreviewVariant[] = [
  {
    slug: "conservative",
    eyebrow: "Clarity First",
    title: "Conservative Set",
    summary: "The safest semantic swap: literal tool, upload, and wallet metaphors.",
    description: "This option aims for instant recognition at header scale. It is the lowest-risk change if the goal is simply to remove ambiguity.",
    actions: {
      build: {
        icon: <HammerIcon />,
        label: "Build",
        note: "Hammer reads immediately as making or assembling something, even at 16px.",
      },
      deploy: {
        icon: <ConservativeDeployIcon />,
        label: "Deploy testnet:utopia",
        note: "An upload tray reads as sending an artifact to a target rather than paper-plane messaging.",
      },
      connect: {
        icon: <ConservativeConnectIcon />,
        label: "Connect",
        note: "A wallet silhouette is more direct than the current abstract device shape.",
      },
    },
  },
  {
    slug: "product-fit",
    eyebrow: "Best Product Fit",
    title: "Product-Fit Set",
    summary: "Closer to software tooling semantics while still staying legible in the existing header.",
    description: "This set balances recognizability with product specificity. It feels more native to a compiler-and-deployment workflow than the conservative set.",
    actions: {
      build: {
        icon: <BracesSparkIcon />,
        label: "Build",
        note: "Braces plus a spark suggests code generation or compilation instead of general editing.",
      },
      deploy: {
        icon: <PackageUploadIcon />,
        label: "Deploy testnet:utopia",
        note: "A package with an upward arrow communicates published artifact flow more explicitly.",
      },
      connect: {
        icon: <WalletLinkIcon />,
        label: "Connect",
        note: "The wallet plus link metaphor ties account identity to a connection action.",
      },
    },
  },
  {
    slug: "engineering",
    eyebrow: "Engineering Bias",
    title: "Engineering Set",
    summary: "More software-native and technical, with less literal physical-world symbolism.",
    description: "This option is aimed at users who read the UI through pipeline and systems metaphors rather than consumer-product iconography.",
    actions: {
      build: {
        icon: <TerminalCogIcon />,
        label: "Build",
        note: "Terminal plus cog reads as execution plus tooling, which is closer to compile infrastructure.",
      },
      deploy: {
        icon: <BoxArrowUpIcon />,
        label: "Deploy testnet:utopia",
        note: "The boxed output with an upward arrow feels like promotion of a built artifact.",
      },
      connect: {
        icon: <LinkPortIcon />,
        label: "Connect",
        note: "A port-link metaphor suits developers, though it is less obvious for wallet novices.",
      },
    },
  },
];

const BUILD_TOOL_CANDIDATES: readonly BuildToolCandidate[] = [
  {
    slug: "plain-hammer",
    title: "Plain Hammer",
    icon: <HammerIcon />,
    note: "The most generic build metaphor. Clear enough, but it can still read as construction rather than compile.",
  },
  {
    slug: "claw-hammer",
    title: "Claw Hammer",
    icon: <ClawHammerIcon />,
    note: "The claw silhouette gives the head more character and reads better than the plain hammer at small sizes.",
  },
  {
    slug: "crossed-tools",
    title: "Crossed Tools",
    icon: <CrossedToolsIcon />,
    note: "Feels like setup or tooling rather than one specific action. Strong silhouette, but slightly broader meaning.",
  },
  {
    slug: "wrench",
    title: "Wrench",
    icon: <WrenchIcon />,
    note: "Good for technical adjustment and engineering. Less literal than a hammer, more software-tool adjacent.",
  },
  {
    slug: "screwdriver-wrench",
    title: "Screwdriver + Wrench",
    icon: <ScrewdriverWrenchIcon />,
    note: "Signals a toolchain rather than one tool. Slightly busier, but stronger if you want 'build system' rather than 'build action'.",
  },
  {
    slug: "cog-hammer",
    title: "Cog + Hammer",
    icon: <CogHammerIcon />,
    note: "Hybrid metaphor: execution plus tooling. More distinctive, but starts to feel custom rather than universal.",
  },
  {
    slug: "anvil",
    title: "Anvil",
    icon: <AnvilIcon />,
    note: "Thematically strong for forging, but more stylized and less instantly recognized than the other candidates.",
  },
];

const BUILD_CONCEPT_CANDIDATES: readonly BuildConceptCandidate[] = [
  {
    slug: "stacked-blocks",
    title: "Stacked Blocks",
    icon: <StackedBlocksIcon />,
    note: "This reads as assembly from smaller units. It is simple, stable, and less construction-coded than hand tools.",
  },
  {
    slug: "blueprint",
    title: "Blueprint",
    icon: <BlueprintIcon />,
    note: "This leans toward generation from a design artifact. It suits a low-code compiler better than a hammer does.",
  },
  {
    slug: "package",
    title: "Package",
    icon: <PackageIcon />,
    note: "The build result is literally a package artifact. This is one of the most semantically accurate options for the product.",
  },
  {
    slug: "grid-compile",
    title: "Grid Compile",
    icon: <GridCompileIcon />,
    note: "This reads as several parts being compiled or resolved. It is more abstract, but closer to a systems metaphor.",
  },
  {
    slug: "node-assembly",
    title: "Node Assembly",
    icon: <NodeAssemblyIcon />,
    note: "This directly echoes the graph-to-artifact pipeline. It is product-specific rather than generic tooling.",
  },
  {
    slug: "spark-box",
    title: "Spark Box",
    icon: <SparkBoxIcon />,
    note: "A compact artifact-plus-activation metaphor. Cleaner than hand tools, but still energetic enough to feel like execution.",
  },
];

function getVariantFromPathname(pathname: string): IconPreviewVariant | null {
  const slug = pathname.replace(/^\/icon-preview\/?/, "");

  if (slug.length === 0) {
    return null;
  }

  return ICON_PREVIEW_VARIANTS.find((variant) => variant.slug === slug) ?? null;
}

function PreviewButton({ action, tone }: { readonly action: IconPreviewAction; readonly tone: "primary" | "secondary" }) {
  const className = tone === "primary"
    ? "ff-header__button ff-header__button--compact min-h-11 border-[var(--brand-orange)] bg-transparent px-4 py-2 text-[var(--brand-orange)] hover:bg-[rgba(255,71,0,0.1)]"
    : "ff-header__button ff-header__button--compact min-h-11 border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] px-4 py-2 text-[var(--cream-white)]";

  return (
    <button aria-label={action.label} className={className} type="button">
      <span aria-hidden="true" className="ff-header__button-icon">{action.icon}</span>
      <span className="ff-header__button-label">{action.label}</span>
    </button>
  );
}

function VariantLink({ href, label, active = false }: { readonly href: string; readonly label: string; readonly active?: boolean }) {
  const className = active
    ? "border-[var(--brand-orange)] bg-[rgba(255,71,0,0.12)] text-[var(--cream-white)]"
    : "border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.72)] text-[var(--text-secondary)] hover:border-[var(--brand-orange)] hover:text-[var(--cream-white)]";

  return (
    <a className={`inline-flex items-center border px-3 py-2 font-heading text-[0.68rem] uppercase tracking-[0.18em] transition-colors ${className}`} href={href}>
      {label}
    </a>
  );
}

function BuildToolStudyLink({ active = false }: { readonly active?: boolean }) {
  return <VariantLink active={active} href="/icon-preview/build-tools" label="Build Tool Study" />;
}

function BuildConceptStudyLink({ active = false }: { readonly active?: boolean }) {
  return <VariantLink active={active} href="/icon-preview/build-concepts" label="Build Concept Study" />;
}

function IconPreviewIndex() {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(255,71,0,0.12),transparent_38%),linear-gradient(180deg,rgba(26,10,10,0.98),rgba(10,12,20,1))] px-6 py-8 text-[var(--text-primary)] sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="max-w-3xl space-y-4">
          <p className="font-heading text-[0.72rem] uppercase tracking-[0.28em] text-[var(--brand-orange)]">Icon Preview Pages</p>
          <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-4xl">Header action icon alternatives</h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            Each option below has its own dedicated page so the build, deploy, and connect symbols can be reviewed in isolation with the current visual language.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {ICON_PREVIEW_VARIANTS.map((variant) => (
            <article className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5" key={variant.slug}>
              <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">{variant.eyebrow}</p>
              <h2 className="mt-3 font-heading text-xl uppercase tracking-[0.12em] text-[var(--cream-white)]">{variant.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{variant.summary}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <PreviewButton action={variant.actions.deploy} tone="primary" />
                <PreviewButton action={variant.actions.build} tone="secondary" />
                <PreviewButton action={variant.actions.connect} tone="secondary" />
              </div>
              <div className="mt-5">
                <VariantLink href={`/icon-preview/${variant.slug}`} label={`Open ${variant.title}`} />
              </div>
            </article>
          ))}
        </section>

        <section className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Build Focus</p>
          <h2 className="mt-3 font-heading text-xl uppercase tracking-[0.12em] text-[var(--cream-white)]">Additional hammer and tool options</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Deploy and Connect can stay on the Conservative set while Build is explored separately. This page isolates only the build symbol so the choice is easier to judge.
          </p>
          <div className="mt-5">
            <BuildToolStudyLink />
          </div>
        </section>

        <section className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Build Direction</p>
          <h2 className="mt-3 font-heading text-xl uppercase tracking-[0.12em] text-[var(--cream-white)]">Non-tool build concepts</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            If every hammer and wrench feels wrong, the better move is to stop treating Build as a physical tool. This study explores artifact, module, blueprint, and assembly metaphors instead.
          </p>
          <div className="mt-5">
            <BuildConceptStudyLink />
          </div>
        </section>
      </div>
    </main>
  );
}

function IconPreviewVariantPage({ variant }: { readonly variant: IconPreviewVariant }) {
  const actions = [variant.actions.deploy, variant.actions.build, variant.actions.connect] as const;

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(255,71,0,0.16),transparent_40%),linear-gradient(180deg,rgba(26,10,10,0.98),rgba(10,12,20,1))] px-6 py-8 text-[var(--text-primary)] sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.84)] p-6">
          <div className="flex flex-wrap gap-3">
            <VariantLink href="/icon-preview" label="All sets" />
            <BuildToolStudyLink />
            <BuildConceptStudyLink />
            {ICON_PREVIEW_VARIANTS.map((candidate) => (
              <VariantLink
                active={candidate.slug === variant.slug}
                href={`/icon-preview/${candidate.slug}`}
                key={candidate.slug}
                label={candidate.title}
              />
            ))}
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="font-heading text-[0.72rem] uppercase tracking-[0.28em] text-[var(--brand-orange)]">{variant.eyebrow}</p>
            <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-4xl">{variant.title}</h1>
            <p className="text-sm leading-7 text-[var(--cream-white)] sm:text-base">{variant.summary}</p>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">{variant.description}</p>
          </div>
        </header>

        <section className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.72)] p-6">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Action Bar Preview</p>
          <div className="mt-4 flex flex-wrap gap-3 border border-[var(--ui-border-dark)] bg-[rgba(20,22,32,0.82)] p-4">
            <PreviewButton action={variant.actions.deploy} tone="primary" />
            <PreviewButton action={variant.actions.build} tone="secondary" />
            <PreviewButton action={variant.actions.connect} tone="secondary" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {actions.map((action) => (
            <article className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5" key={action.label}>
              <div className="flex h-14 w-14 items-center justify-center border border-[var(--brand-orange)] bg-[rgba(255,71,0,0.08)] text-[var(--brand-orange)]">
                {action.icon}
              </div>
              <h2 className="mt-4 font-heading text-lg uppercase tracking-[0.12em] text-[var(--cream-white)]">{action.label}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{action.note}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function BuildToolStudyPage() {
  const deployAction = ICON_PREVIEW_VARIANTS[0].actions.deploy;
  const connectAction = ICON_PREVIEW_VARIANTS[0].actions.connect;

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(255,71,0,0.16),transparent_40%),linear-gradient(180deg,rgba(26,10,10,0.98),rgba(10,12,20,1))] px-6 py-8 text-[var(--text-primary)] sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.84)] p-6">
          <div className="flex flex-wrap gap-3">
            <VariantLink href="/icon-preview" label="All sets" />
            <BuildToolStudyLink active={true} />
            <BuildConceptStudyLink />
            {ICON_PREVIEW_VARIANTS.map((candidate) => (
              <VariantLink href={`/icon-preview/${candidate.slug}`} key={candidate.slug} label={candidate.title} />
            ))}
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="font-heading text-[0.72rem] uppercase tracking-[0.28em] text-[var(--brand-orange)]">Build Focus</p>
            <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-4xl">Build tool study</h1>
            <p className="text-sm leading-7 text-[var(--cream-white)] sm:text-base">Conservative Deploy and Connect retained. Only the Build icon changes across these options.</p>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">This makes the tradeoff easier to read. If one build symbol wins, it can be combined directly with the Conservative deploy upload and wallet connect icons.</p>
          </div>
        </header>

        <section className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.72)] p-6">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Baseline</p>
          <div className="mt-4 flex flex-wrap gap-3 border border-[var(--ui-border-dark)] bg-[rgba(20,22,32,0.82)] p-4">
            <PreviewButton action={deployAction} tone="primary" />
            <PreviewButton action={{ icon: <HammerIcon />, label: "Build", note: "Baseline hammer." }} tone="secondary" />
            <PreviewButton action={connectAction} tone="secondary" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {BUILD_TOOL_CANDIDATES.map((candidate) => (
            <article className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5" key={candidate.slug}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Candidate</p>
                  <h2 className="mt-3 font-heading text-lg uppercase tracking-[0.12em] text-[var(--cream-white)]">{candidate.title}</h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center border border-[var(--brand-orange)] bg-[rgba(255,71,0,0.08)] text-[var(--brand-orange)]">
                  {candidate.icon}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border border-[var(--ui-border-dark)] bg-[rgba(20,22,32,0.82)] p-4">
                <PreviewButton action={deployAction} tone="primary" />
                <PreviewButton action={{ icon: candidate.icon, label: "Build", note: candidate.note }} tone="secondary" />
                <PreviewButton action={connectAction} tone="secondary" />
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{candidate.note}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function BuildConceptStudyPage() {
  const deployAction = ICON_PREVIEW_VARIANTS[0].actions.deploy;
  const connectAction = ICON_PREVIEW_VARIANTS[0].actions.connect;

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(255,71,0,0.16),transparent_40%),linear-gradient(180deg,rgba(26,10,10,0.98),rgba(10,12,20,1))] px-6 py-8 text-[var(--text-primary)] sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.84)] p-6">
          <div className="flex flex-wrap gap-3">
            <VariantLink href="/icon-preview" label="All sets" />
            <BuildToolStudyLink />
            <BuildConceptStudyLink active={true} />
            {ICON_PREVIEW_VARIANTS.map((candidate) => (
              <VariantLink href={`/icon-preview/${candidate.slug}`} key={candidate.slug} label={candidate.title} />
            ))}
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="font-heading text-[0.72rem] uppercase tracking-[0.28em] text-[var(--brand-orange)]">Build Direction</p>
            <h1 className="font-heading text-3xl uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-4xl">Build concept study</h1>
            <p className="text-sm leading-7 text-[var(--cream-white)] sm:text-base">Conservative Deploy and Connect retained. Build is re-framed as artifact generation rather than hand-tool work.</p>
            <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">This direction is a better semantic fit for compiling a graph into Move code and package artifacts. If the tool page felt off, one of these should read cleaner.</p>
          </div>
        </header>

        <section className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.72)] p-6">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Baseline</p>
          <div className="mt-4 flex flex-wrap gap-3 border border-[var(--ui-border-dark)] bg-[rgba(20,22,32,0.82)] p-4">
            <PreviewButton action={deployAction} tone="primary" />
            <PreviewButton action={{ icon: <PackageIcon />, label: "Build", note: "Baseline artifact metaphor." }} tone="secondary" />
            <PreviewButton action={connectAction} tone="secondary" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {BUILD_CONCEPT_CANDIDATES.map((candidate) => (
            <article className="border border-[var(--ui-border-dark)] bg-[rgba(15,17,26,0.82)] p-5" key={candidate.slug}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Candidate</p>
                  <h2 className="mt-3 font-heading text-lg uppercase tracking-[0.12em] text-[var(--cream-white)]">{candidate.title}</h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center border border-[var(--brand-orange)] bg-[rgba(255,71,0,0.08)] text-[var(--brand-orange)]">
                  {candidate.icon}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border border-[var(--ui-border-dark)] bg-[rgba(20,22,32,0.82)] p-4">
                <PreviewButton action={deployAction} tone="primary" />
                <PreviewButton action={{ icon: candidate.icon, label: "Build", note: candidate.note }} tone="secondary" />
                <PreviewButton action={connectAction} tone="secondary" />
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{candidate.note}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

/**
 * Renders standalone preview pages for shortlisted build, deploy, and connect icon sets.
 */
function IconPreviewPage() {
  const pathname = typeof window === "undefined" ? "/icon-preview" : window.location.pathname;

  if (pathname === "/icon-preview/build-tools") {
    return <BuildToolStudyPage />;
  }

  if (pathname === "/icon-preview/build-concepts") {
    return <BuildConceptStudyPage />;
  }

  const variant = getVariantFromPathname(pathname);

  if (variant === null) {
    return <IconPreviewIndex />;
  }

  return <IconPreviewVariantPage variant={variant} />;
}

export default IconPreviewPage;