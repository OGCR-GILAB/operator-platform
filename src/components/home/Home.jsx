import {
  MapTrifoldIcon,
  FileArrowUpIcon,
  FileTextIcon,
  LeafIcon,
  TrendUpIcon,
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  FarmIcon,
  ProjectorScreenChartIcon,
  MapPinAreaIcon,
  ClipboardTextIcon,
  ChartBarIcon,
  TimerIcon,
  ChecksIcon,
  BroadcastIcon,
} from "@phosphor-icons/react";
import $log from "../../services/$log";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Pill from "../ui/Pill";
import { useGlobal } from "../providers/GlobalContext";
import { useNavigate } from "react-router-dom";

const stats = [
  {
    value: "1 dashboard",
    label: "Activities, parcels, GIS and reports",
    icon: <ProjectorScreenChartIcon size={20} weight="duotone" />,
  },
  {
    value: "Parcel-first",
    label: "Import boundaries and field data fast",
    icon: <MapPinAreaIcon size={20} weight="duotone" />,
  },
  {
    value: "Always visible",
    label: "Monitor activity health and risks",
    icon: <BroadcastIcon size={20} weight="duotone" />,
  },
  {
    value: "Report-ready",
    label: "Generate evidence for submission cycles",
    icon: <FileTextIcon size={20} weight="duotone" />,
  },
];

const features = [
  {
    icon: <LeafIcon size={28} weight="duotone" />,
    title: "Carbon Activity Workspace",
    description:
      "Create and manage one or many carbon activities with milestones, documents, approvals, and status tracking in one place.",
    tone: "positive",
  },
  {
    icon: <MapTrifoldIcon size={28} weight="duotone" />,
    title: "Parcel Import & Mapping",
    description:
      "Import parcels from spreadsheets, shapefiles, or field records, then organize them on an interactive GIS map with clear ownership and activity links.",
    tone: "brand",
  },
  {
    icon: <TrendUpIcon size={28} weight="duotone" />,
    title: "Monitoring & Performance",
    description:
      "Track parcel activity, progress, issuance readiness, and field observations through live dashboards and status summaries.",
    tone: "warning",
  },
  {
    icon: <ClipboardTextIcon size={28} weight="duotone" />,
    title: "Submission & Reporting",
    description:
      "Prepare validation packs, reporting periods, and carbon credit evidence with structured records and exportable summaries.",
    tone: "neutral",
  },
  {
    icon: <UsersIcon size={28} weight="duotone" />,
    title: "Farmer & Developer Collaboration",
    description:
      "Coordinate field teams, activity developers, and farmer groups around the same parcel data, tasks, and reporting deadlines.",
    tone: "positive",
  },
  {
    icon: <ChartBarIcon size={28} weight="duotone" />,
    title: "Portfolio Insights",
    description:
      "See how every activity contributes to your wider pipeline with rollups for acreage, readiness, reporting, and delivery risks.",
    tone: "neutral",
  },
];

const workflow = [
  {
    icon: <FarmIcon size={22} weight="duotone" />,
    title: "Set up your activity",
    description: "Register a new carbon activity, define methodology, assign landowners, and capture baseline details.",
  },
  {
    icon: <FileArrowUpIcon size={22} weight="duotone" />,
    title: "Import parcels",
    description: "Bring in parcel boundaries and tabular records, then match each parcel to the right farmer, group, or activity.",
  },
  {
    icon: <BroadcastIcon size={22} weight="duotone" />,
    title: "Monitor performance",
    description: "Watch GIS layers, field updates, and activity checkpoints to quickly spot missing data, risks, or delays.",
  },
  {
    icon: <ChecksIcon size={22} weight="duotone" />,
    title: "Generate reports",
    description: "Package submission-ready reports with parcel evidence, progress summaries, and the metrics needed for credit issuance.",
  },
];

const highlightCards = [
  {
    eyebrow: "GIS Command Center",
    title: "See activities spatially, not just as rows in a table",
    description:
      "Switch from activity lists to parcel maps instantly. Review boundaries, farmer clusters, monitoring hotspots, and field updates from one visual workspace.",
    bullets: ["Parcel overlays and boundary review", "Map-based monitoring for every activity stage", "Faster issue triage for missing or risky parcels"],
    icon: <MapTrifoldIcon size={28} weight="duotone" />,
  },
  {
    eyebrow: "Reporting Engine",
    title: "Move from field activity to submission-ready evidence",
    description:
      "Turn activity records, parcel histories, and monitoring data into clear reporting outputs for internal review, external submission, and stakeholder updates.",
    bullets: ["Activity summaries and audit-friendly exports", "Reporting periods with parcel-level traceability", "Reusable templates for recurring submissions"],
    icon: <FileTextIcon size={28} weight="duotone" />,
  },
];

function Home() {
  if (import.meta.env.DEV) {
    $log.success("Running in development mode");
  }

  return (
    <div className="ogcr-home">
      {/* ── Hero ── */}
      <section className="ogcr-home__hero">
        <div className="ogcr-home__hero-content">
          <Pill tone="positive" className="ogcr-home__hero-badge">
            Built for activity developers and farmers
          </Pill>
          <h1 className="ogcr-home__hero-title text-h1">
            Manage carbon activities
            <br />
            <span className="ogcr-home__hero-title--accent">from import to report</span>
          </h1>
          <p className="ogcr-home__hero-subtitle">
            Operator Platform gives activity developers and farmers a single workspace
            to create activities, import and map parcels, monitor implementation, and
            generate the reports needed to move carbon credit programs forward.
          </p>
          <div className="ogcr-home__hero-actions">
            <Button variant="filled" tone="brand" endIcon={<ArrowRightIcon size={16} weight="bold" />}>
              Create an activity
            </Button>
            <Button variant="outlined">Explore GIS dashboard</Button>
          </div>
          <ul className="ogcr-home__hero-points" aria-label="Primary platform benefits">
            {[
              "Manage multiple carbon activities in one portfolio",
              "Import parcels and review them on an interactive map",
              "Track progress, farmer activity, and reporting readiness",
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
            <span className="ogcr-home__hero-panel-meta">
              <TimerIcon size={16} weight="duotone" aria-hidden="true" />
              Submission cycle ready
            </span>
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
      <section className="ogcr-home__stats" aria-label="Platform statistics">
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
            A dashboard shaped around real carbon activity work
          </h2>
          <p className="ogcr-home__section-subtitle">
            Give operators one place to move from onboarding activities to monitoring parcels and preparing submissions.
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
            Purpose-built for GIS, activity tracking, and reporting
          </h2>
          <p className="ogcr-home__section-subtitle">
            The platform is not just a landing page for activities — it is the operating layer that ties maps, workflows, and evidence together.
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
          Ready to run your carbon portfolio with more clarity?
        </h2>
        <p className="ogcr-home__cta-subtitle">
          Start with one activity or a full portfolio of farmer-linked parcels,
          then scale monitoring and reporting from the same operator dashboard.
        </p>
        <ul className="ogcr-home__cta-checks" aria-label="Key benefits">
          {[
            "Multi-activity portfolio visibility",
            "GIS-based parcel management",
            "Submission-ready reporting workflows",
          ].map((item) => (
            <li key={item} className="ogcr-home__cta-check">
              <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        <Button variant="filled" tone="brand" endIcon={<ArrowRightIcon size={16} weight="bold" />}>
          Open operator dashboard
        </Button>
      </section>
    </div>
  );
}

export default Home;