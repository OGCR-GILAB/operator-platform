// Country options live in one place now — they used to be duplicated byte-for-byte
// between this file and projectConfig.js (deleted).
export {
  euAndCandidateCountryOptions,
  getCountryNameByCode,
  stripFlag,
  validateCountryCode,
  syncLabelsWithReference,
} from "../../config/countries";

// Fallback only. The real schemes come from `GET auth/dcr/certification-schemes/`
// via `$auth.certificationSchemes()`; this list is what the selects show until
// that call resolves (or if it fails).
export const certificationSchemes = [
  { value: "PERMANENT_REMOVAL", label: "Permanent Carbon Removal Units" },
  { value: "CARBON_FARMING", label: "Carbon Farming Sequestration Units" },
  { value: "PRODUCT_STORAGE", label: "Carbon Storage in Product Units" },
  { value: "SOIL_EMISSION_REDUCTION", label: "Soil Emission Reduction Units" },
];

// `unit_types` is sent to the API as these exact human-readable strings, and
// each one implies an activity `type` (never the reverse — two map to
// CARBON_FARMING). Authoritative copy: `GET reference/` -> unit_types.
export const unitTypeOptions = [
  { value: "Permanent Removal", label: "Permanent Removal" },
  { value: "Carbon Farming Sequestration", label: "Carbon Farming Sequestration" },
  { value: "Soil Emission Reduction", label: "Soil Emission Reduction" },
  { value: "Carbon Storage in Product", label: "Carbon Storage in Product" },
];

export const planTemplatesByActivityType = {
  PERMANENT_REMOVAL: {
    activityPlanTitle: "Durable Carbon Removal Activity Plan",
    monitoringPlanTitle: "Long-Term Storage Monitoring Plan",
  },
  CARBON_FARMING: {
    activityPlanTitle: "Regenerative Farming Activity Plan",
    monitoringPlanTitle: "Soil & Biomass Monitoring Plan",
  },
  CARBON_STORAGE_IN_PRODUCTS: {
    activityPlanTitle: "Product Carbon Storage Activity Plan",
    monitoringPlanTitle: "Product Lifecycle Monitoring Plan",
  },
};

export const planTemplateFor = (activityType) =>
  planTemplatesByActivityType[activityType] || {
    activityPlanTitle: "Activity Plan",
    monitoringPlanTitle: "Monitoring Plan",
  };

export const wizardSteps = [
  {
    title: "Basic activity info",
    description: "Capture mandatory activity and metadata.",
  },
  {
    title: "Import parcels from cadastre",
    description: "Cadastre parcel import and selection step placeholder.",
  },
  {
    title: "Certification and plans",
    description: "Select certification scheme and define activity/monitoring plans.",
  },
  {
    title: "Finish",
    description: "Initialize activity and create setup records.",
  },
];

// Each stage is a real request, in order. See CreateProjectWizardModal.
export const setupStages = [
  "Creating the activity",
  "Creating the activity plan",
  "Creating the monitoring plan",
  "Checking submission readiness",
];

export const getInitialWizardForm = (operatorId) => ({
  // Mirrors the POST /projects/ payload. The schema only requires `name`, but
  // readiness blocks submission without operator, dates and a type.
  name: "",
  operator: operatorId || "",
  start_date: "",
  end_date: "",
  unit_types: "",
  summary: "",
  description: "",
  website: "",
  image: "",
  hero_image: "",
  media_links: "",
  technologies_practices_processes: "",
  cobenefits: "",
  city: "",
  country_code: "",
  term_commitment: "",
  methodologies: "",
  monitoring_period_years: "",
  monitoring_period_start_date: "",
  monitoring_period_end_date: "",
  certification_scheme_id: "",
  certification_scheme_name: "",
  activityPlanTitle: planTemplateFor(null).activityPlanTitle,
  monitoringPlanTitle: planTemplateFor(null).monitoringPlanTitle,
});

export const getRiskColor = (risk) => {
  if (risk === "Low") return "positive";
  if (risk === "Medium") return "warning";
  return "critical";
};

export const getCertStatusPill = (status) => {
  if (status.includes("Certified")) return "positive";
  if (status.includes("Review")) return "warning";
  if (status.includes("Pending")) return "neutral";
  return "critical";
};

export const getPhaseLabel = (phase) => {
  if (phase === "initialization") return "Initialization";
  if (phase === "monitoring") return "Monitoring";
  if (phase === "recertification") return "Re-certification";
  return phase;
};
