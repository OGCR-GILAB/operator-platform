import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CalendarDotsIcon,
  CertificateIcon,
  ClipboardTextIcon,
  ClockCountdownIcon,
  PaperPlaneTiltIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useGlobal } from "../providers/GlobalContext";
import { Button, Card, Message, Pill, ProgressBar, Select } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import StatStrip from "../ui/StatStrip";
import { SkeletonStats } from "../ui/Skeleton";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import {
  PROJECT_STATUS_LABELS,
  formatDateTime,
  formatRelative,
  localCompleteness,
  projectLocation,
  projectStatusTone,
  syncLabel,
  syncTone,
  verificationLabel,
  verificationTone,
} from "../projects/projectPresentation";
import { syncStateOf } from "../../models/document";

const scopeOptions = [
  { value: "all", label: "All activities" },
  { value: "open", label: "Still editable" },
  { value: "submitted", label: "With DCR" },
];

const AMENDMENT_CODES = ["validation_amendment_required", "verification_amendment_required"];

/** Can still be changed here: a draft, or one the certifier sent back. */
const isEditable = (project) => project.is_editable !== false
  && !["submitted", "accepted", "rejected"].includes(project.status);

/** Has been submitted at least once, so DCR and the certifier have it. */
const isWithDcr = (project) => Boolean(project.submitted_at);

/** The activity-level verification code `dcr-status` last read from DCR. */
const verificationCodeOf = (project) => project.dcr_verification?.status_code || "";

/** The certifier asked for changes, by status or by the verification code. */
const changesRequested = (project) => project.status === "changes_requested"
  || AMENDMENT_CODES.includes(verificationCodeOf(project));

/**
 * What is still missing before an activity can be submitted — the required
 * steps of the setup guide. Documents are recommended there, not required.
 */
function missingPieces(project) {
  const missing = [];

  if (!project.start_date || !project.end_date) missing.push("dates");
  if (!project.type && !project.unit_types) missing.push("type");
  if (!project.country_code) missing.push("country");
  if (!project.has_plan) missing.push("activity plan");
  if (!project.has_monitoring_plan) missing.push("monitoring plan");
  if (!Number(project.parcel_count)) missing.push("parcels");

  return missing;
}

function Overview() {
  const { me, operator } = useGlobal();
  const navigate = useNavigate();
  const certificationRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [scope, setScope] = useState("all");
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = () => {
    setStatus("loading");
    setReloadToken((current) => current + 1);
  };

  const openActivity = useCallback(
    (activityId) => navigate(`/activities/${activityId}/overview`),
    [navigate],
  );

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
        setParcels(parcelRows);
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

  // A parcel in the list does not say which activity it is in, only how many,
  // so these two are for the whole portfolio, whatever the scope.
  const parcelSummary = useMemo(() => {
    const linked = parcels.filter((parcel) => Number(parcel.project_count) > 0);
    return {
      areaHa: linked.reduce((sum, parcel) => sum + (Number(parcel.area_ha) || 0), 0),
      withoutOwner: linked.filter((parcel) => parcel.has_owner === false).length,
    };
  }, [parcels]);

  const rows = useMemo(() => {
    if (scope === "open") return projects.filter(isEditable);
    if (scope === "submitted") return projects.filter(isWithDcr);
    return projects;
  }, [projects, scope]);

  const drafts = useMemo(() => rows.filter(isEditable), [rows]);
  const withDcr = useMemo(() => rows.filter(isWithDcr), [rows]);

  const needingAttention = useMemo(() => rows.filter((project) => (
    project.status === "rejected"
    || changesRequested(project)
    || project.dcr_sync_status === "failed"
    || (project.status === "draft" && missingPieces(project).length > 0)
  )).length, [rows]);

  // The snapshot that sits in the greeting. Tone is read off the number itself,
  // so "need attention" only shouts when there is something to shout about.
  const heroMetrics = useMemo(() => [
    {
      id: "portfolio",
      label: "Activities",
      value: rows.length,
      tone: "brand",
    },
    {
      id: "area",
      label: "Land in activities",
      value: parcelSummary.areaHa.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      unit: "ha",
      sublabel: "Across all activities",
      tone: "neutral",
    },
    {
      id: "attention",
      label: "Need attention",
      value: needingAttention,
      tone: needingAttention > 0 ? "warning" : "positive",
    },
    {
      id: "dcr",
      label: "With DCR",
      value: withDcr.length,
      tone: "neutral",
    },
  ], [rows, parcelSummary, needingAttention, withDcr]);

  // Three real measures, each the share of drafts that have that piece.
  // Submitted activities had all of them, so they would only pad the bars.
  const readinessDistribution = useMemo(() => {
    const share = (predicate) => (drafts.length
      ? Math.round((drafts.filter(predicate).length / drafts.length) * 100)
      : 0);

    const toneFor = (value) => (value >= 80 ? "default" : (value >= 40 ? "blue" : "orange"));

    const plans = share((project) => project.has_plan && project.has_monitoring_plan);
    const linked = share((project) => Number(project.parcel_count) > 0);
    const documents = share((project) => Number(project.document_count) > 0);

    return [
      { label: "Plans created", value: plans, tone: toneFor(plans) },
      { label: "Parcels linked", value: linked, tone: toneFor(linked) },
      { label: "Documents uploaded", value: documents, tone: toneFor(documents) },
    ];
  }, [drafts]);

  // What the operator can act on: the certifier's change requests first, then
  // the drafts closest to done, then the owners still to declare.
  const upcomingTasks = useMemo(() => {
    const amendments = rows
      .filter(changesRequested)
      .map((project) => ({
        id: `amendment-${project.id}`,
        title: project.name,
        detail: "Changes requested by the certifier",
        tone: "warning",
        badge: "Changes",
        onOpen: () => openActivity(project.id),
      }));

    const unfinished = rows
      .filter((project) => isEditable(project) && !changesRequested(project))
      .map((project) => ({ project, missing: missingPieces(project) }))
      .filter((entry) => entry.missing.length > 0)
      .sort((a, b) => a.missing.length - b.missing.length)
      .map(({ project, missing }) => ({
        id: `draft-${project.id}`,
        title: project.name,
        detail: `Missing: ${missing.join(", ")}`,
        tone: missing.length > 3 ? "negative" : (missing.length > 1 ? "warning" : "positive"),
        badge: `${missing.length} left`,
        onOpen: () => openActivity(project.id),
      }));

    const owners = parcelSummary.withoutOwner > 0 ? [{
      id: "owners",
      title: "Declared owners",
      detail: `${parcelSummary.withoutOwner} parcel${parcelSummary.withoutOwner === 1 ? " in your activities has" : "s in your activities have"} no declared owner. Owners can be added until the verification is final.`,
      tone: "warning",
      badge: String(parcelSummary.withoutOwner),
      onOpen: () => navigate("/activities"),
    }] : [];

    return [...amendments, ...unfinished].slice(0, 3).concat(owners);
  }, [rows, parcelSummary, openActivity, navigate]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Activity",
        meta: { align: "left" },
        cell: ({ row }) => (
          <div className="ogcr-overview__project-cell">
            <button
              type="button"
              className="ogcr-overview__link"
              onClick={() => openActivity(row.original.id)}
            >
              <strong>{row.original.name}</strong>
            </button>
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
      {
        id: "verification",
        accessorFn: (row) => (isWithDcr(row) ? verificationCodeOf(row) : ""),
        header: "Verification",
        meta: { align: "left" },
        cell: ({ row }) => {
          if (!isWithDcr(row.original)) return null;
          const code = verificationCodeOf(row.original);
          return (
            <Pill tone={code ? verificationTone(code) : "neutral"}>
              {code ? verificationLabel(code) : "Not started"}
            </Pill>
          );
        },
      },
    ],
    [openActivity],
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
                : "Set up your Operator profile to start adding activities."}
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
            <div className="ogcr-overview__scope">
              <Select
                label="Scope"
                value={scope || null}
                onValueChange={(value) => setScope(value)}
                options={scopeOptions}
              />
            </div>
            <Button
              variant="outlined"
              iconLeft={<ArrowClockwiseIcon size={16} weight="bold" />}
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
          state="error"
          title="Could not load the portfolio"
          description={error}
          onDismiss={() => setError("")}
        />
      )}

      <Card
        title="Activity health board"
        subtitle="Every activity, where it stands"
        trailing={<Pill tone="neutral">{rows.length} {rows.length === 1 ? "activity" : "activities"}</Pill>}
      >
        <DataTable
          data={rows}
          columns={columns}
          loading={status === "loading"}
          skeletonRows={6}
          caption="Status, completeness and verification of each activity"
          ariaLabel="Overview activity health table"
          emptyText="No activities in this scope yet."
        />
      </Card>

      <section className="ogcr-overview__grid">
        <Card
          title="Readiness pipeline"
          subtitle="Drafts that have each piece in place"
          trailing={<Pill tone="neutral">{drafts.length} {drafts.length === 1 ? "draft" : "drafts"}</Pill>}
        >
          {drafts.length ? (
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
          ) : (
            <p className="ogcr-overview__footnote">No drafts in this scope.</p>
          )}
        </Card>

        <Card
          title="Upcoming actions"
          subtitle="Change requests first, then the drafts closest to done"
          trailing={<CalendarDotsIcon size={18} weight="duotone" />}
        >
          <ul className="ogcr-overview__tasks" aria-label="Upcoming activity tasks">
            {upcomingTasks.length ? upcomingTasks.map((task) => (
              <li key={task.id} className="ogcr-overview__task-item">
                <div>
                  <button type="button" className="ogcr-overview__link" onClick={task.onOpen}>
                    <span className="ogcr-overview__task-title">{task.title}</span>
                  </button>
                  <p className="ogcr-overview__task-detail">{task.detail}</p>
                </div>
                <Pill tone={task.tone}>{task.badge}</Pill>
              </li>
            )) : (
              <li className="ogcr-overview__task-item">
                <div>
                  <p className="ogcr-overview__task-detail">
                    {rows.length ? "Nothing to do right now." : "No activities yet."}
                  </p>
                </div>
              </li>
            )}
          </ul>

          <div className="ogcr-overview__task-actions">
            <Button
              variant="text"
              iconRight={<ArrowRightIcon size={14} weight="bold" />}
              onClick={() => navigate("/activities")}
            >
              Open activities
            </Button>
          </div>
        </Card>
      </section>

      <Card
        title="With the certifier"
        subtitle="Submitted activities and their verification on DCR"
        trailing={<ClockCountdownIcon size={18} weight="duotone" />}
      >
        {withDcr.length ? (
          <ul className="ogcr-overview__tasks" aria-label="Activities with the certifier">
            {withDcr.map((project) => {
              const code = verificationCodeOf(project);
              return (
                <li key={project.id} className="ogcr-overview__task-item">
                  <div>
                    <button type="button" className="ogcr-overview__link" onClick={() => openActivity(project.id)}>
                      <span className="ogcr-overview__task-title">{project.name}</span>
                    </button>
                    {project.dcr_status_checked_at && (
                      <p className="ogcr-overview__task-detail" title={formatDateTime(project.dcr_status_checked_at)}>
                        Checked {formatRelative(project.dcr_status_checked_at)}
                      </p>
                    )}
                  </div>
                  <Pill tone={code ? verificationTone(code) : "neutral"}>
                    {code ? verificationLabel(code) : "Not started"}
                  </Pill>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ogcr-overview__footnote">Nothing submitted yet.</p>
        )}
        <p className="ogcr-overview__footnote">
          The server reads the outcome from DCR every 15 minutes; an activity&apos;s Refresh asks right away.
        </p>
        <Button
          variant="outlined"
          iconRight={<ArrowRightIcon size={14} weight="bold" />}
          onClick={() => navigate("/activities")}
        >
          Open activities
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
              How an activity moves from a draft here to a certificate on DCR.
            </p>
          </div>
          <Pill tone="progress">4 steps</Pill>
        </div>

        <div className="ogcr-overview__phases-grid">
          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase1">
            <span className="ogcr-overview__phase-step">01</span>
            <div className="ogcr-overview__phase-icon">
              <ClipboardTextIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Prepare</h4>
            <p className="ogcr-overview__phase-description">
              Fill in the activity details, add its parcels from the cadastre, declare their owners, write the activity and monitoring plans and upload the documents.
            </p>
            <Pill tone="positive">Operator</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase2">
            <span className="ogcr-overview__phase-step">02</span>
            <div className="ogcr-overview__phase-icon">
              <PaperPlaneTiltIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Submit to DCR</h4>
            <p className="ogcr-overview__phase-description">
              The activity and its plans go to DCR. The certification platform then registers the parcels, and each declared owner follows as soon as their parcel is registered.
            </p>
            <Pill tone="warning">Operator + certification platform</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase3">
            <span className="ogcr-overview__phase-step">03</span>
            <div className="ogcr-overview__phase-icon">
              <ShieldCheckIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Validation and verification</h4>
            <p className="ogcr-overview__phase-description">
              The certifier validates the plans and verifies the activity and its ownership. If they ask for changes, the activity opens up here again until you resubmit.
            </p>
            <Pill tone="neutral">Certifier</Pill>
          </Card>

          <Card className="ogcr-overview__phase-card ogcr-overview__phase-card--phase4">
            <span className="ogcr-overview__phase-step">04</span>
            <div className="ogcr-overview__phase-icon">
              <CertificateIcon size={28} weight="duotone" />
            </div>
            <h4 className="ogcr-overview__phase-title">Certificate and re-certification</h4>
            <p className="ogcr-overview__phase-description">
              The certificate and audit reports appear in the activity. Monitoring carries on, and re-certification renews the certificate when it runs out.
            </p>
            <Pill tone="progress">Cyclical</Pill>
          </Card>
        </div>

        <Card className="ogcr-overview__conformity-notice">
          <div className="ogcr-overview__conformity-copy">
            <h4 className="ogcr-overview__conformity-title">Non-Conformity Types</h4>
            <p className="ogcr-overview__conformity-description">
              Findings can appear during audit or re-certification. Each level has a different remediation timeline and impact on activity status. They are listed with the audit reports in the activity's Certification card.
            </p>
          </div>
          <div className="ogcr-overview__conformity-list">
            <div className="ogcr-overview__conformity-item">
              <Pill tone="negative">Critical</Pill>
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