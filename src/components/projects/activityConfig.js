// Country options live in one place now — they used to be duplicated byte-for-byte
// between this file and projectConfig.js (deleted).
export {
  euAndCandidateCountryOptions,
  getCountryNameByCode,
  stripFlag,
  validateCountryCode,
  syncLabelsWithReference,
} from "../../config/countries";

// `unit_types` is sent to the API as these exact human-readable strings, and
// each one implies an activity `type` (never the reverse — two map to
// CARBON_FARMING). Authoritative copy: `GET reference/` -> unit_types.
export const unitTypeOptions = [
  { value: "Permanent Removal", label: "Permanent Removal" },
  { value: "Carbon Farming Sequestration", label: "Carbon Farming Sequestration" },
  { value: "Soil Emission Reduction", label: "Soil Emission Reduction" },
  { value: "Carbon Storage in Product", label: "Carbon Storage in Product" },
];

export const getInitialActivityForm = (operatorId) => ({
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
  media_links: [],
  technologies_practices_processes: "",
  cobenefits: "",
  sustainable_development_goals: "",
  city: "",
  country_code: "",
  term_commitment: "",
  methodologies: "",
  monitoring_period_years: "",
  monitoring_period_start_date: "",
  monitoring_period_end_date: "",
  certification_scheme_id: "",
  certification_scheme_name: "",
});

export const getPhaseLabel = (phase) => {
  if (phase === "initialization") return "Initialization";
  if (phase === "monitoring") return "Monitoring";
  if (phase === "recertification") return "Re-certification";
  return phase;
};
