// Turning API records into things the table and the modals can render.
// The API fields are the DCR property names; nothing here invents data.

import { getCountryNameByCode } from "../../config/countries";
import { syncStateOf } from "../../models/document";

export const PROJECT_STATUS_LABELS = {
  draft: "Draft",
  ready: "Ready for submission",
  submitted: "Submitted to DCR",
  changes_requested: "Changes requested",
  accepted: "Accepted",
  rejected: "Rejected",
};

// Pill only has neutral / positive / warning / negative.
export const projectStatusTone = (status) => {
  if (status === "accepted") return "positive";
  if (status === "rejected") return "negative";
  // The certifier asked for changes: the one state that waits on the operator.
  if (status === "changes_requested") return "warning";
  if (status === "ready") return "positive";
  return "neutral";
};

export const ACTIVITY_TYPE_LABELS = {
  CARBON_FARMING: "Carbon farming",
  PERMANENT_REMOVAL: "Permanent carbon removal",
  CARBON_STORAGE_IN_PRODUCTS: "Carbon storage in products",
};

// Badges are driven by `dcr_sync_status` alone. `dcr_id` is handed out before
// anything is sent to DCR, so it identifies a record without saying where it is.
export const SYNC_LABELS = {
  local: "Local only",
  synced: "Synced with DCR",
  failed: "Sync failed",
};

/**
 * One badge for every record: mirrors report `dcr_sync_status`, documents report
 * `forward_status`. `syncStateOf` normalises both.
 */
export const syncTone = (record) => {
  const state = syncStateOf(record);
  if (state === "synced") return "positive";
  if (state === "failed") return "negative";
  return "neutral";
};

export const syncLabel = (record) => SYNC_LABELS[syncStateOf(record)] || SYNC_LABELS.local;

// Parcels are registered on DCR by the certification platform, not by our
// submit: it reads them from the partner API within a minute or so, and the
// next status refresh matches them to ours. Until then a parcel of a submitted
// activity is still `local` — that is a wait, not a missing sync.
export const PARCEL_WAITING_LABEL = "Waiting for registration";

/** `waiting`, or the plain sync state. `submitted` is the activity's. */
export const parcelSyncState = (parcel, { submitted = false } = {}) => {
  const state = syncStateOf(parcel);
  return submitted && state === "local" ? "waiting" : state;
};

export const parcelSyncLabel = (parcel, options) => {
  const state = parcelSyncState(parcel, options);
  return state === "waiting" ? PARCEL_WAITING_LABEL : (SYNC_LABELS[state] || SYNC_LABELS.local);
};

export const parcelSyncTone = (parcel, options) =>
  (parcelSyncState(parcel, options) === "waiting" ? "neutral" : syncTone(parcel));

/** Registered parcels are read-only on the API (`409` on any edit). */
export const isParcelRegistered = (parcel) => syncStateOf(parcel) === "synced";

export const OWNER_TYPE_LABELS = {
  natural_person: "Natural person",
  legal_person: "Legal person",
  public_entity: "Public entity",
};

/**
 * The declared owner's trip to DCR — a `parcels/{id}/owner/` record or a
 * `dcr-status` -> parcels[].owner entry. `{label, tone, detail}`; `detail` is
 * the error text of a failed send.
 */
export const ownerSyncOf = (owner, { submitted = false } = {}) => {
  if (!owner) return { label: "Not declared", tone: "neutral", detail: "" };

  const state = syncStateOf(owner);
  if (state === "synced") return { label: "Sent to DCR", tone: "positive", detail: "" };
  if (state === "failed") {
    return { label: "Sync failed", tone: "negative", detail: owner.error || "" };
  }
  return {
    label: submitted ? PARCEL_WAITING_LABEL : "Sent once registered",
    tone: "neutral",
    detail: "",
  };
};

/**
 * The declared owner against the land registry (`registry-owners` ->
 * `matches_declared`). `null` when there is nothing to compare: no declaration
 * yet, or no legal-person owner in the registry. `short` is for table badges
 * (the parcel list's `registry_match` carries the same values).
 */
export const registryMatchOf = (matchesDeclared) => {
  if (matchesDeclared === true) {
    return { label: "Matches the land registry", short: "Matches registry", tone: "positive" };
  }
  if (matchesDeclared === false) {
    return { label: "Differs from the land registry", short: "Differs from registry", tone: "warning" };
  }
  return null;
};

// `P` is the owner; the other rights (usufructuary, bare owner, manager…) follow.
export const REGISTRY_OWNER_RIGHT = "P";

export const sortRegistryOwners = (owners) => [...(Array.isArray(owners) ? owners : [])]
  .sort((a, b) => Number(b?.right_code === REGISTRY_OWNER_RIGHT) - Number(a?.right_code === REGISTRY_OWNER_RIGHT));
// Verification codes, as `dcr-status` reports them. The certification platform
// verifies the activity as a whole (`verification`); a parcel only has a result
// of its own when the certifier records one for it. `validated` means the
// validation passed and the verification is still to come. The codes are
// `GET reference/` -> verification_statuses, which carries no labels.
export const VERIFICATION_LABELS = {
  draft: "Draft",
  pending: "Pending",
  under_review: "Under review",
  validated: "Validated",
  in_progress: "In progress",
  verified: "Verified",
  failed: "Failed",
  denied: "Denied",
  validation_amendment_required: "Changes requested (validation)",
  verification_amendment_required: "Changes requested (verification)",
};

export const verificationTone = (statusCode) => {
  if (statusCode === "verified") return "positive";
  // `denied` is a failed validation.
  if (["failed", "denied"].includes(statusCode)) return "negative";
  if ([
    "validated",
    "in_progress",
    "under_review",
    "validation_amendment_required",
    "verification_amendment_required",
  ].includes(statusCode)) return "warning";
  return "neutral";
};

// An unknown code is shown as DCR sent it rather than passed off as pending.
export const verificationLabel = (statusCode) => {
  if (!statusCode) return VERIFICATION_LABELS.pending;
  const text = String(statusCode).replace(/_/g, " ");
  return VERIFICATION_LABELS[statusCode] || text[0].toUpperCase() + text.slice(1);
};

/**
 * Whether a `dcr-status` -> parcels[] entry is the certifier's own verdict on
 * that parcel. Every linked parcel is listed; `has_verdict` is true only when
 * the certifier recorded a verdict for that parcel itself.
 */
export const parcelHasOwnVerdict = (entry) => entry?.has_verdict === true;

export const parcelLabelOf = (parcel) =>
  parcel?.name || parcel?.cadastral_reference || (parcel?.id ? `Parcel ${parcel.id}` : "—");

/** tCO2e amounts from DCR — up to 3 decimals, never hectares. */
export const formatTonnes = (value) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 3 })} tCO2e`;
};

// The amounts a certificate or an activity verification can carry (CO2e
// tonnes, each optional), as a short label and the kind of removal it is.
// Any other `*_benefit` DCR adds later is still shown, under its humanised key.
const BENEFITS = {
  permanent_net_carbon_removal_benefit: { label: "Permanent removal", sublabel: "Net carbon removal" },
  carbon_farming_net_soil_emission_reduction_benefit: { label: "Soil emission reduction", sublabel: "Net, carbon farming" },
  carbon_farming_temporary_net_carbon_removal_benefit: { label: "Temporary removal", sublabel: "Carbon farming" },
  carbon_storage_temporary_net_carbon_removal_benefit: { label: "Temporary removal", sublabel: "Storage in products" },
};

const benefitLabel = (key) => {
  const text = key.replace(/_benefit$/, "").replace(/_/g, " ");
  return text[0].toUpperCase() + text.slice(1);
};

/** `StatStrip` items for the filled `*_benefit` fields of a DCR record. */
export const benefitItems = (record, tone = "positive") => Object.entries(record || {})
  .filter(([key, value]) => key.endsWith("_benefit") && value != null && value !== "")
  .map(([key, value]) => ({
    id: key,
    label: BENEFITS[key]?.label || benefitLabel(key),
    sublabel: BENEFITS[key]?.sublabel,
    value: formatTonnes(value),
    tone,
  }));

export const projectLocation = (project) => {
  const country = project?.country_code ? getCountryNameByCode(project.country_code) : "";
  return [project?.city, country].filter(Boolean).join(", ") || "—";
};

/**
 * A cheap local completeness signal for the list, built only from fields the
 * list endpoint already returns — no N+1 readiness calls. The authoritative
 * answer is `GET projects/{id}/readiness/`, shown in the detail modal.
 */
export const localCompleteness = (project) => {
  if (!project) return 0;

  const checks = [
    Boolean(project.name),
    Boolean(project.operator),
    Boolean(project.start_date && project.end_date),
    Boolean(project.type || project.unit_types),
    Boolean(project.has_plan),
    Boolean(project.has_monitoring_plan),
    Number(project.parcel_count) > 0,
    Number(project.document_count) > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

// The descriptive fields an activity can do without. Counted, never required.
const OPTIONAL_DETAIL_FIELDS = [
  "summary",
  "description",
  "city",
  "website",
  "image",
  "technologies_practices_processes",
  "cobenefits",
  "sustainable_development_goals",
  "media_links",
  "methodologies",
  "term_commitment",
  "monitoring_period_years",
  "certification_scheme_id",
];

const isFilled = (value) => (Array.isArray(value)
  ? value.length > 0
  : value !== undefined && value !== null && String(value).trim() !== "");

// Readiness codes are free-form (`parcels.owner`, `plan.missing`, `dcr.roles`…),
// so a problem is placed on a step by what its code or message names.
// `monitoring` goes first: its codes contain "plan" too.
const STEP_KEYWORDS = [
  ["monitoring", ["monitoring"]],
  ["plan", ["plan"]],
  ["parcels", ["parcel", "owner", "geometry"]],
  ["documents", ["document"]],
  ["details", [
    "name", "date", "type", "unit", "country", "city", "summary", "description",
    "website", "image", "vocabulary", "technolog", "practice", "cobenefit",
    "sustainable", "media", "methodolog", "term", "scheme", "certification",
  ]],
];

const stepOfProblem = ({ code, message }) => {
  const haystack = String(code || message || "").toLowerCase();
  const match = STEP_KEYWORDS.find(([, words]) => words.some((word) => haystack.includes(word)));
  return match ? match[0] : "submit";
};

/**
 * Every open readiness problem, each once: failing checks first, then the
 * errors / warnings no check already covers (plain strings or `{code, message}`).
 */
const openProblems = (readiness) => {
  const asEntry = (entry, level) => (typeof entry === "string"
    ? { message: entry, level }
    : { level, ...(entry || {}) });

  const failing = (Array.isArray(readiness?.checks) ? readiness.checks : [])
    .filter((check) => check && check.ok === false);
  // Errors usually repeat a check, by code or only by message — match either.
  const seen = new Set();
  const remember = (entry) => [entry.code, entry.message].filter(Boolean).forEach((key) => seen.add(key));
  failing.forEach(remember);

  const loose = [
    ...(Array.isArray(readiness?.errors) ? readiness.errors : []).map((entry) => asEntry(entry, "error")),
    ...(Array.isArray(readiness?.warnings) ? readiness.warnings : []).map((entry) => asEntry(entry, "warning")),
  ].filter((entry) => {
    const keys = [entry.code, entry.message].filter(Boolean);
    if (!keys.length || keys.some((key) => seen.has(key))) return false;
    remember(entry);
    return true;
  });

  return [...failing, ...loose];
};

/**
 * The setup guide on the activity overview: what an activity still needs before
 * it can be submitted, in the order it is usually filled in. Built from the
 * activity record and its readiness alone, so progress survives a reload and
 * nothing has to be done in order.
 *
 * Each step is `{id, title, state, summary, issues[], notes[]}`, where `state`
 * is `done`, `attention` (there, but readiness blocks on it) or `todo`.
 * `issues` are the blocking problems; `notes` the warnings, which never hold a
 * step back.
 * `documentTotal` counts the parcels' documents too; without it only the
 * activity's own are counted.
 */
export const setupSteps = (activity, readiness, { documentTotal } = {}) => {
  if (!activity) return [];

  const issuesByStep = openProblems(readiness).reduce((groups, problem) => {
    const step = stepOfProblem(problem);
    (groups[step] ||= []).push(problem);
    return groups;
  }, {});

  const isBlocking = (problem) => problem.level === "error";

  const stateOf = (present, id) => {
    if (!present) return "todo";
    return (issuesByStep[id] || []).some(isBlocking) ? "attention" : "done";
  };

  const requiredDetails = [
    activity.name,
    activity.start_date,
    activity.end_date,
    activity.type || activity.unit_types,
    activity.country_code,
  ];
  const optionalFilled = OPTIONAL_DETAIL_FIELDS.filter((field) => isFilled(activity[field])).length;
  const parcelCount = Number(activity.parcel_count) || 0;
  const documentCount = Number(documentTotal ?? activity.document_count) || 0;
  const blocking = (issuesByStep.submit || []).filter(isBlocking).length;

  const steps = [
    {
      id: "details",
      title: "Activity details",
      state: stateOf(requiredDetails.every(isFilled), "details"),
      summary: requiredDetails.every(isFilled)
        ? `${optionalFilled} of ${OPTIONAL_DETAIL_FIELDS.length} optional details filled in`
        : "Name, unit type, dates and country are needed",
    },
    {
      id: "parcels",
      title: "Parcels",
      state: stateOf(parcelCount > 0, "parcels"),
      summary: parcelCount > 0
        ? `${parcelCount} parcel${parcelCount === 1 ? "" : "s"} linked`
        : "The land this activity covers — pick it from the cadastre",
    },
    {
      id: "plan",
      title: "Activity plan",
      state: stateOf(Boolean(activity.has_plan), "plan"),
      summary: activity.has_plan
        ? "Saved"
        : "Eligibility, methodology and expected removals",
    },
    {
      id: "monitoring",
      title: "Monitoring plan",
      state: stateOf(Boolean(activity.has_monitoring_plan), "monitoring"),
      summary: activity.has_monitoring_plan
        ? "Saved"
        : "What is measured, how often, and by whom",
    },
    {
      id: "documents",
      title: "Documents",
      state: stateOf(documentCount > 0, "documents"),
      summary: documentCount > 0
        ? `${documentCount} document${documentCount === 1 ? "" : "s"} attached`
        // Documents are not sent to DCR; the certifier fetches them from here.
        : "Recommended — certifiers fetch them from here during the audit",
      optional: true,
    },
    {
      id: "submit",
      title: "Review and submit",
      state: readiness?.ready ? "done" : (blocking ? "attention" : "todo"),
      summary: readiness
        ? (readiness.ready ? "Ready to submit to DCR" : "Clear the blocking checks first")
        : "The submission checklist is unavailable",
    },
  ];

  return steps.map((step) => {
    const problems = issuesByStep[step.id] || [];
    return {
      ...step,
      issues: problems.filter(isBlocking),
      notes: problems.filter((problem) => !isBlocking(problem)),
    };
  });
};

/** The first step still open, or null once everything is done. */
export const nextSetupStep = (steps) => steps.find((step) => step.state !== "done") || null;

/**
 * Readiness checks (`{ok, level, code, message, values}`) split into what
 * blocks a submit, what only warns, and what already passes.
 */
export const groupChecks = (checks) => ({
  blocking: checks.filter((check) => !check.ok && check.level === "error"),
  warnings: checks.filter((check) => !check.ok && check.level !== "error"),
  passed: checks.filter((check) => check.ok),
});

/** Maps the project status onto the three-phase lifecycle indicator. */
export const lifecyclePhase = (status) => {
  if (status === "accepted") return "recertification";
  if (["submitted", "changes_requested", "rejected"].includes(status)) return "monitoring";
  return "initialization";
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

const RELATIVE_UNITS = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago" — for timestamps the server refreshes on its own. */
export const formatRelative = (value, now = Date.now()) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const seconds = Math.round((date.getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const [unit, size] = RELATIVE_UNITS.find(([, length]) => Math.abs(seconds) >= length) || [];

  return unit ? format.format(Math.round(seconds / size), unit) : "just now";
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export const formatArea = (hectares) => {
  const value = Number(hectares);
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
};
