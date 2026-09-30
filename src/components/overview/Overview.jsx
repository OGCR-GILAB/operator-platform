import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CalendarDotsIcon,
  ClockCountdownIcon,
  ShieldCheckIcon,
  IdentificationCardIcon,
  FileIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useGlobal } from "../providers/GlobalContext";
import Button from "../ui/Button";
import Card from "../ui/Card";
import DataTable from "../ui/DataTable";
import Message from "../ui/Message";
import Pill from "../ui/Pill";
import ProgressBar from "../ui/ProgressBar";
import Select from "../ui/Select";
import StatStrip from "../ui/StatStrip";
import { SkeletonStats } from "../ui/Skeleton";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import {
  PROJECT_STATUS_LABELS,
  localCompleteness,
  projectLocation,
  projectStatusTone,
  syncLabel,
  syncTone,
} from "../projects/projectPresentation";
import { syncStateOf } from "../../models/document";

const scopeOptions = [
  { value: "all", label: "All activities" },
  { value: "open", label: "Still editable" },
  { value: "submitted", label: "With DCR" },
];

/** What is still missing before an activity can be submitted. */
function missingPieces(project) {
  const missing = [];

  if (!project.start_date || !project.end_date) missing.push("dates");
  if (!project.type && !project.unit_types) missing.push("type");
  if (!project.has_plan) missing.push("activity plan");
  if (!project.has_monitoring_plan) missing.push("monitoring plan");
  if (!Number(project.parcel_count)) missing.push("parcels");
  if (!Number(project.document_count)) missing.push("documents");

  return missing;
}

function Overview() {
  const { me, operator } = useGlobal();
  const navigate = useNavigate();
  const certificationRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [totalAreaHa, setTotalAreaHa] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [scope, setScope] = useState("all");
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = () => {
    setStatus("loading");
    setReloadToken((current) => current + 1);
  };

  const scrollToCertification = () => {
    certificationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    let cancelled = false;

    // The dashboard summarises the whole portfolio, so both lists are read in full.
    Promise.all([
      $projects.listAll({ ordering: "-updated_at" }),
      $parcels.listAll().catch(() => []),
    ])
      .then(([projectRows, parcelRows]) => {
        if (cancelled) return;
        setProjects(projectRows);
        setTotalAreaHa(parcelRows.reduce((sum, parcel) => sum + (Number(parcel.area_ha) || 0), 0));
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [reloadToken]);

  const userName = useMemo(() => {
    if (me?.first_name) return me.first_name;
    if (me?.username) return me.username;
    return "Operator";
  }, [me]);

  const rows = useMemo(() => {
    if (scope === "open") {
      return projects.filter((project) => ["draft", "ready"].includes(project.status));
    }

    if (scope === "submitted") {
      return projects.filter((project) => ["submitted", "accepted", "rejected"].includes(project.status));
    }

    return projects;
  }, [projects, scope]);

  const stats = useMemo(() => {
    const needingAttention = rows.filter((project) => (
      project.status === "rejected"
      || project.dcr_sync_status === "failed"
      || (project.status === "draft" && missingPieces(project).length > 0)
    )).length;

    const inReview = rows.filter((project) => project.status === "submitted").length;

    const completeness = rows.length
      ? Math.round(rows.reduce((sum, project) => sum + localCompleteness(project), 0) / rows.length)
      : 0;

    return {
      portfolio: rows.length,
      needingAttention,
      inReview,
      completeness,
    };
  }, [rows]);

  // The snapshot that sits in the greeting. Tone is read off the number itself,
  // so "need attention" only shouts when there is something to shout about.
  const heroMetrics = useMemo(() => [
    {
      id: "portfolio",
      label: "Activities",
      value: stats.portfolio,
      tone: "brand",
    },
    {
      id: "area",
      label: "Managed land",
      value: totalAreaHa.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      unit: "ha",
      tone: "neutral",
    },
    {
      id: "attention",
      label: "Need attention",
      value: stats.needingAttention,
      tone: stats.needingAttention > 0 ? "warning" : "positive",
    },
    {
      id: "completeness",
      label: "Avg completeness",
      value: stats.completeness,
      unit: "%",
      tone: stats.completeness >= 80 ? "positive" : (stats.completeness >= 40 ? "brand" : "warning"),
    },
  ], [stats, totalAreaHa]);

  // Three real measures, each the share of activities that have that piece.
  const readinessDistribution = useMemo(() => {
    if (!rows.length) {
      return [
        { label: "Plans created", value: 0, tone: "warning" },
        { label: "Parcels linked", value: 0, tone: "warning" },
        { label: "Evidence attached", value: 0, tone: "warning" },
      ];
    }

    const share = (predicate) =>
      Math.round((rows.filter(predicate).length / rows.length) * 100);

    const toneFor = (value) => (value >= 80 ? "positive" : (value >= 40 ? "default" : "warning"));

    const plans = share((project) => project.has_plan && project.has_monitoring_plan);
    const parcels = share((project) => Number(project.parcel_count) > 0);
    const documents = share((project) => Number(project.document_count) > 0);

    return [
      { label: "Plans created", value: plans, tone: toneFor(plans) },
      { label: "Parcels linked", value: parcels, tone: toneFor(parcels) },
      { label: "Evidence attached", value: documents, tone: toneFor(documents) },
    ];
  }, [rows]);

  const upcomingTasks = useMemo(
    () =>
      rows
        .filter((project) => project.status === "draft" || project.status === "rejected")
        .map((project) => ({ project, missing: missingPieces(project) }))
        .filter((entry) => entry.missing.length > 0)
        .sort((a, b) => a.missing.length - b.missing.length)
        .slice(0, 3)
        .map(({ project, missing }) => ({
          id: project.id,
          title: project.name,
          detail: `Missing: ${missing.join(", ")}`,
          tone: missing.length > 3 ? "negative" : (missing.length > 1 ? "warning" : "positive"),
          count: missing.length,
        })),
    [rows],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Activity",
        meta: { align: "left" },
        cell: ({ row }) => (
          <div className="ogcr-overview__project-cell">
            <strong>{row.original.name}</strong>
            <span>{projectLocation(row.original)}</span>
          </div>
        ),
      },
      {
        accessorKey: "parcel_count",
        header: "Parcels",
        meta: { align: "right", numeric: true },
        cell: ({ getValue }) => Number(getValue() || 0).toLocaleString(),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { align: "left" },
        cell: ({ getValue }) => (
          <Pill tone={projectStatusTone(getValue())}>
            {PROJECT_STATUS_LABELS[getValue()] || getValue() || "—"}
          </Pill>
        ),
      },
      {
        id: "completeness",
        accessorFn: (row) => localCompleteness(row),
        header: "Completeness",
        meta: { align: "left" },
        cell: ({ getValue }) => (
          <span className="ogcr-overview__readiness-value">{getValue()}%</span>
        ),
      },
      {
        id: "dcr",
        accessorFn: (row) => syncStateOf(row),
        header: "DCR",
        meta: { align: "left" },
        cell: ({ row }) => (
          <Pill tone={syncTone(row.original)}>{syncLabel(row.original)}</Pill>
        ),
      },
    ],
    [],
  );

  return (
    <div className="ogcr-overview">
      <section className="ogcr-overview__hero">
        <div className="ogcr-overview__hero-top">
          <div className="ogcr-overview__hero-content">
            <Pill tone="positive">Operations snapshot</Pill>
            <h2 className="ogcr-overview__title">Welcome back, {userName}</h2>
            <p className="ogcr-overview__subtitle">
              {operator?.legal_name
                ? `Portfolio for ${operator.legal_name}. Everything stays on the Operator Platform until an activity is submitted to DCR.`
                : "Track portfolio readiness, identify activity risk, and move reporting actions forward from one dashboard."}
            </p>
          </div>

          <div className="ogcr-overview__hero-controls">
            <button
              type="button"
              className="ogcr-overview__workflow-help"
              onClick={scrollToCertification}
              aria-label="Scroll to certification workflow"
            >
              <span className="ogcr-overview__workflow-help-mark" aria-hidden="true">
                ?
              </span>
              <span>Workflow guide</span>
            </button>
            <Select
              label="Scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              options={scopeOptions}
            />
            <Button
              variant="outlined"
              startIcon={<ArrowClockwiseIcon size={16} weight="bold" />}
              onClick={refresh}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* The snapshot belongs to the greeting, not to four cards of its own. */}
        {status === "loading" && !rows.length ? (
          <SkeletonStats variant="bare" items={heroMetrics.length || 4} />
        ) : (
          <StatStrip
            variant="bare"
            ariaLabel="Portfolio metrics"
            items={heroMetrics}
          />
        )}
      </section>

      {Boolean(error) && (
        <Message
          variant="error"
          title="Could not load the portfolio"
          description={error}
          onClose={() => setError("")}
        />
      )}

      <Card
        title="Activity health board"
        subtitle="Sortable portfolio list for quick triage"
        trailing={<Pill tone="positive">{rows.length} records</Pill>}
      >
        <DataTable
          data={rows}
          columns={columns}
          loading={status === "loading"}
          skeletonRows={6}
          caption="Portfolio health and reporting readiness"
          ariaLabel="Overview activity health table"
          emptyText="No activities in this scope yet."
        />
      </Card>

      <section className="ogcr-overview__grid">
        <Card
          title="Readiness pipeline"
          subtitle="Share of activities that have each piece in place"
          trailing={<Pill tone="neutral">{stats.inReview} with DCR</Pill>}
        >
          <div className="ogcr-overview__pipeline">
            {readinessDistribution.map((item) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </div>
        </Card>

        <Card
          title="Upcoming actions"
          subtitle="Drafts with the least left to do"
          trailing={<CalendarDotsIcon size={18} weight="duotone" />}
        >
          <ul className="ogcr-overview__tasks" aria-label="Upcoming activity tasks">
            {upcomingTasks.length ? upcomingTasks.map((task) => (
              <li key={task.id} className="ogcr-overview__task-item">
                <div>
                  <p className="ogcr-overview__task-title">{task.title}</p>
                  <p className="ogcr-overview__task-detail">{task.detail}</p>
                </div>
                <Pill tone={task.tone}>{task.count} left</Pill>
              </li>
            )) : (
              <li className="ogcr-overview__task-item">
                <div>
                  <p className="ogcr-overview__task-detail">
                    {rows.length ? "Nothing outstanding on your drafts." : "No activities yet."}
                  </p>
                </div>
              </li>
            )}
          </ul>

          <div className="ogcr-overview__task-actions">
            <Button
              variant="text"
              endIcon={<ArrowRightIcon size={14} weight="bold" />}
              onClick={() => navigate("/activities")}
            >
              Open activities
            </Button>
          </div>
        </Card>
      </section>

      <Card
        title="Submission cadence"
        subtitle="Current operations signal"
        trailing={<ClockCountdownIcon size={18} weight="duotone" />}
      >
        <p className="ogcr-overview__footnote">
          {stats.needingAttention > 0
            ? `${stats.needingAttention} activit${stats.needingAttention === 1 ? "y needs" : "ies need"} attention before they can be submitted.`
            : "Every activity in this scope is complete enough to submit."}
        </p>
        <Button
          variant="outlined"
          endIcon={<ArrowRightIcon size={14} weight="bold" />}
          onClick={() => navigate("/activities")}
        >
          Review evidence
        </Button>
      </Card>

      <section
        ref={certificationRef}
        className="ogcr-overview__certification-phases"
        aria-label="Certification workflow phases"
      >
        <div className="ogcr-overview__section-header">
          <div>
            <h3 className="ogcr-overview__section-title">Certification Workflow</h3>
            <p className="ogcr-overview__section-subtitle">
              A simple four-step guide to how activities move from ownership validation to recurring re-certification.
            </p>
          </div>
          <Pill tone="brand">4-step guide</Pill>
        </div>

        <div className="ogcr-overview__phases-grid">
          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase1">
            <span className="ogcr-overview__phase-step">01</span>
            <div className="ogcr-overview__phase-icon">
              <IdentificationCardIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Ownership Verification</h4>
            <p className="ogcr-overview__phase-description">
              Verify parcel boundaries and land ownership against national LPIS and cadastres to establish the legal activity foundation.
            </p>
            <Pill tone="positive">Automated & Manual</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase2">
            <span className="ogcr-overview__phase-step">02</span>
            <div className="ogcr-overview__phase-icon">
              <FileIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Scheme Recognition</h4>
            <p className="ogcr-overview__phase-description">
              Confirm that the selected certification scheme is recognised and matched to the activity methodology requirements.
            </p>
            <Pill tone="warning">Requires Approval</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase3">
            <span className="ogcr-overview__phase-step">03</span>
            <div className="ogcr-overview__phase-icon">
              <ShieldCheckIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Certification</h4>
            <p className="ogcr-overview__phase-description">
              An accredited Certification Body reviews Activity and Monitoring Plans, calculates carbon removal, and issues compliance results.
            </p>
            <Pill tone="neutral">Expert Audit</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase4">
            <span className="ogcr-overview__phase-step">04</span>
            <div className="ogcr-overview__phase-icon">
              <ArrowClockwiseIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Re-Certification</h4>
            <p className="ogcr-overview__phase-description">
              Monitoring restarts when the reporting period closes, keeping the activity compliant and ready to issue new credits.
            </p>
            <Pill tone="brand">Cyclical</Pill>
          </Card>
        </div>

        <Card className="ogcr-overview__conformity-notice">
          <div className="ogcr-overview__conformity-copy">
            <h4 className="ogcr-overview__conformity-title">Non-Conformity Types</h4>
            <p className="ogcr-overview__conformity-description">
              Findings can appear during audit or re-certification. Each level has a different remediation timeline and impact on activity status.
            </p>
          </div>
          <div className="ogcr-overview__conformity-list">
            <div className="ogcr-overview__conformity-item">
              <Pill tone="critical">Critical</Pill>
              <span>Immediate withdrawal due to fraud or data falsification.</span>
            </div>
            <div className="ogcr-overview__conformity-item">
              <Pill tone="warning">Major</Pill>
              <span>Suspension issued; remediate within 90 days or withdraw.</span>
            </div>
            <div className="ogcr-overview__conformity-item">
              <Pill tone="neutral">Minor</Pill>
              <span>Up to 12 months allowed before re-audit remediation closes.</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

export default Overview;