import {
  MapTrifoldIcon,
  FileArrowUpIcon,
  FilesIcon,
  LeafIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CertificateIcon,
  FarmIcon,
  ProjectorScreenChartIcon,
  MapPinAreaIcon,
  ClipboardTextIcon,
  ChecksIcon,
  PaperPlaneTiltIcon,
  UserCheckIcon,
} from "@phosphor-icons/react";
import $log from "../../services/$log";
import { Button, Card, Pill } from "@majistudio/ogcr-design-system";

const stats = [
  {
    value: "One workspace",
    label: "Details, parcels, plans, documents and map per activity",
    icon: <ProjectorScreenChartIcon size={20} weight="duotone" />,
  },
  {
    value: "Cadastre-based",
    label: "Parcel boundary and reference from the same record",
    icon: <MapPinAreaIcon size={20} weight="duotone" />,
  },
  {
    value: "Checked first",
    label: "Readiness checks and your DCR permissions before submit",
    icon: <ChecksIcon size={20} weight="duotone" />,
  },
  {
    value: "Outcome in view",
    label: "Verification, certificate and audit reports from DCR",
    icon: <CertificateIcon size={20} weight="duotone" />,
  },
];

const features = [
  {
    icon: <LeafIcon size={28} weight="duotone" />,
    title: "Activity workspace",
    description:
      "Create activities under your operator and work on them in any order. A setup guide shows what is still missing.",
    tone: "positive",
  },
  {
    icon: <MapTrifoldIcon size={28} weight="duotone" />,
    title: "Parcels from the cadastre",
    description:
      "Search by commune, section and number. The parcel's boundary and cadastral reference come from the same record, with IACS / LPIS codes if you have them.",
    tone: "brand",
  },
  {
    icon: <UserCheckIcon size={28} weight="duotone" />,
    title: "Declared ownership",
    description:
      "Name each parcel's owner and attach the proof. Where the land registry knows the parcel, its owners are shown alongside.",
    tone: "warning",
  },
  {
    icon: <FilesIcon size={28} weight="duotone" />,
    title: "Plans and documents",
    description:
      "Activity and monitoring plans, plus versioned documents you can preview without leaving the platform.",
    tone: "neutral",
  },
  {
    icon: <PaperPlaneTiltIcon size={28} weight="duotone" />,
    title: "Submission to DCR",
    description:
      "Readiness checks and a live look at your DCR roles tell you up front whether the submission will go through.",
    tone: "positive",
  },
  {
    icon: <CertificateIcon size={28} weight="duotone" />,
    title: "Verification and certificate",
    description:
      "Follow the certifier's validation and verification, answer change requests, and see the certificate and audit reports once issued.",
    tone: "neutral",
  },
];

const workflow = [
  {
    icon: <FarmIcon size={22} weight="duotone" />,
    title: "Set up the activity",
    description: "Pick the certification scheme, describe the activity and its practices. It stays a draft until you submit.",
  },
  {
    icon: <MapPinAreaIcon size={22} weight="duotone" />,
    title: "Add parcels and owners",
    description: "Find each parcel on the cadastre, then declare who owns it, backed by a deed or cadastre extract.",
  },
  {
    icon: <FileArrowUpIcon size={22} weight="duotone" />,
    title: "Plans and documents",
    description: "Write the activity and monitoring plans and upload the supporting documents.",
  },
  {
    icon: <PaperPlaneTiltIcon size={22} weight="duotone" />,
    title: "Submit to DCR",
    description: "Readiness checks run first. The certifier then validates and verifies the activity, and the outcome shows up here.",
  },
];

const highlightCards = [
  {
    eyebrow: "Map",
    title: "Every parcel of an activity on one map",
    description:
      "Review the boundaries taken from the cadastre and see at a glance which parcels are registered on DCR.",
    bullets: ["Street map or satellite imagery underneath", "Each parcel coloured by its DCR status", "Land cover and tree cover loss overlays"],
    icon: <MapTrifoldIcon size={28} weight="duotone" />,
  },
  {
    eyebrow: "Portfolio",
    title: "All your activities at a glance",
    description:
      "The overview shows what each activity still needs, with the drafts closest to done first.",
    bullets: ["Activity health board", "Readiness across activities", "Upcoming actions for drafts"],
    icon: <ClipboardTextIcon size={28} weight="duotone" />,
  },
];

/** The public landing page; signed-in users go straight to the overview. */
function Home({ onOpenLogin, onOpenRegister }) {
  if (import.meta.env.DEV) {
    $log.success("Running in development mode");
  }

  return (
    <div className="ogcr-home">
      {/* ── Hero ── */}
      <section className="ogcr-home__hero">
        <div className="ogcr-home__hero-content">
          <Pill tone="positive" className="ogcr-home__hero-badge">
            Built for operators submitting to DCR
          </Pill>
          <h1 className="ogcr-home__hero-title text-h1 tracking-[-1px]">
            Prepare carbon activities
            <br />
            <span className="ogcr-home__hero-title--accent">from parcel to certificate</span>
          </h1>
          <p className="ogcr-home__hero-subtitle">
            Operator Platform is where operators put together a carbon activity — its
            parcels, owners, plans and documents — check it, and submit it to DCR. The
            certifier's verdict, certificate and audit reports come back to the same place.
          </p>
          <div className="ogcr-home__hero-actions">
            <Button variant="filled" iconRight={<ArrowRightIcon size={16} weight="bold" />} onClick={onOpenRegister}>
              Create an account
            </Button>
            <Button variant="outlined" onClick={onOpenLogin}>Sign in</Button>
          </div>
          <ul className="ogcr-home__hero-points" aria-label="Primary platform benefits">
            {[
              "Every activity, its parcels and documents in one workspace",
              "Parcels taken straight from the cadastre and shown on a map",
              "Checked before you submit, followed after",
            ].map((item) => (
              <li key={item} className="ogcr-home__hero-point">
                <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ogcr-home__hero-panel" aria-label="Activity workflow overview">
          <div className="ogcr-home__hero-panel-head">
            <Pill tone="neutral">Operator workflow</Pill>
          </div>
          <div className="ogcr-home__hero-workflow">
            {workflow.map((step, index) => (
              <div key={step.title} className="ogcr-home__workflow-step">
                <div className="ogcr-home__workflow-step-index">0{index + 1}</div>
                <div className="ogcr-home__workflow-step-icon" aria-hidden="true">{step.icon}</div>
                <div className="ogcr-home__workflow-step-body">
                  <h2 className="ogcr-home__workflow-step-title">{step.title}</h2>
                  <p className="ogcr-home__workflow-step-desc">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="ogcr-home__stats" aria-label="Platform at a glance">
        {stats.map((s) => (
          <div key={s.label} className="ogcr-home__stat">
            <span className="ogcr-home__stat-icon" aria-hidden="true">{s.icon}</span>
            <strong className="ogcr-home__stat-value">{s.value}</strong>
            <span className="ogcr-home__stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="ogcr-home__features" aria-labelledby="features-heading">
        <header className="ogcr-home__section-header">
          <h2 id="features-heading" className="ogcr-home__section-title">
            Built around the way an activity reaches the registry
          </h2>
          <p className="ogcr-home__section-subtitle">
            From a first draft to the certifier's verdict, each step has its place.
          </p>
        </header>
        <div className="ogcr-home__feature-grid">
          {features.map((f) => (
            <Card key={f.title} className="ogcr-home__feature-card">
              <div className="ogcr-home__feature-icon" aria-hidden="true">
                {f.icon}
              </div>
              <h3 className="ogcr-home__feature-title">{f.title}</h3>
              <p className="ogcr-home__feature-desc">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="ogcr-home__highlights" aria-labelledby="highlights-heading">
        <header className="ogcr-home__section-header ogcr-home__section-header--left">
          <h2 id="highlights-heading" className="ogcr-home__section-title">
            See where every activity stands
          </h2>
          <p className="ogcr-home__section-subtitle">
            On the map, and across the whole portfolio.
          </p>
        </header>
        <div className="ogcr-home__highlight-grid">
          {highlightCards.map((item) => (
            <Card key={item.title} className="ogcr-home__highlight-card" elevated>
              <div className="ogcr-home__highlight-icon" aria-hidden="true">{item.icon}</div>
              <Pill tone="positive" className="ogcr-home__highlight-eyebrow">{item.eyebrow}</Pill>
              <h3 className="ogcr-home__highlight-title">{item.title}</h3>
              <p className="ogcr-home__highlight-desc">{item.description}</p>
              <ul className="ogcr-home__highlight-list" aria-label={item.eyebrow}>
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="ogcr-home__highlight-item">
                    <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ogcr-home__cta" aria-labelledby="cta-heading">
        <h2 id="cta-heading" className="ogcr-home__cta-title">
          Ready to prepare your first activity?
        </h2>
        <p className="ogcr-home__cta-subtitle">
          Sign in with your DCR account, or create one. You set up your operator
          profile once, then add activities whenever you need.
        </p>
        <ul className="ogcr-home__cta-checks" aria-label="Key benefits">
          {[
            "Activities, parcels and documents in one place",
            "Cadastre-based parcels on a map",
            "Submission and outcome through DCR",
          ].map((item) => (
            <li key={item} className="ogcr-home__cta-check">
              <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="filled" iconRight={<ArrowRightIcon size={16} weight="bold" />} onClick={onOpenLogin}>
          Sign in to get started
        </Button>
      </section>
    </div>
  );
}

export default Home;