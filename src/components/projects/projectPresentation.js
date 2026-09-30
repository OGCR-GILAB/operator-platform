// Turning API records into things the table and the modals can render.
// The API fields are the DCR property names; nothing here invents data.

import { getCountryNameByCode } from "../../config/countries";
import { syncStateOf } from "../../models/document";

export const PROJECT_STATUS_LABELS = {
  draft: "Draft",
  ready: "Ready for submission",
  submitted: "Submitted to DCR",
  accepted: "Accepted",
  rejected: "Rejected",
};

// Pill only has neutral / positive / warning / negative.
export const projectStatusTone = (status) => {
  if (status === "accepted") return "positive";
  if (status === "rejected") return "negative";
  if (status === "submitted") return "warning";
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

// Per-parcel verification, as `dcr-status` reports it. The project is accepted
// only once every parcel is verified, and rejected as soon as one fails.
export const VERIFICATION_LABELS = {
  verified: "Verified",
  failed: "Failed",
  in_progress: "In progress",
};

export const verificationTone = (statusCode) => {
  if (statusCode === "verified") return "positive";
  if (statusCode === "failed") return "negative";
  if (statusCode === "in_progress") return "warning";
  return "neutral";
};

export const verificationLabel = (statusCode) => VERIFICATION_LABELS[statusCode] || "Pending";

/** tCO2e amounts from DCR — up to 3 decimals, never hectares. */
export const formatTonnes = (value) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 3 })} tCO2e`;
};

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

/** Maps the project status onto the three-phase lifecycle indicator. */
export const lifecyclePhase = (status) => {
  if (status === "accepted") return "recertification";
  if (status === "submitted" || status === "rejected") return "monitoring";
  return "initialization";
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

export const formatArea = (hectares) => {
  const value = Number(hectares);
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
};
