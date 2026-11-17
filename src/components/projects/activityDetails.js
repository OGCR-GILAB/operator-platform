// The activity's descriptive fields — shared by the create wizard and the
// "Edit details" modal, so both send the same payload shape.

// Deduplicated: the API drops repeats anyway, and the chips key on the value.
export const parseList = (value) => [...new Set(
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
)];

const toNumberOr = (value, empty) => {
  if (value === "" || value == null) return empty;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : empty;
};

const joinList = (value) => (Array.isArray(value) ? value.join(", ") : String(value || ""));

// `media_links` takes plain URLs or `{link, title, type, author,
// published_date, image}`; DCR files each as an `activity_media` record (type
// `link` and the URL as title when they are left out).
export const MEDIA_DETAIL_KEYS = ["title", "type", "author", "published_date", "image"];

/** One editable row per media link. Details the form has no input for are kept. */
export const mediaRowsFrom = (value) => (Array.isArray(value) ? value : parseList(value))
  .map((entry) => (typeof entry === "string" ? { link: entry } : { ...entry, link: entry?.link || "" }));

const mediaPayload = (rows) => (Array.isArray(rows) ? rows : mediaRowsFrom(rows))
  .map((row) => {
    const link = String(row.link || "").trim();
    if (!link) return null;

    const details = Object.fromEntries(MEDIA_DETAIL_KEYS
      .map((key) => [key, String(row[key] ?? "").trim()])
      .filter(([, detail]) => detail));

    return Object.keys(details).length ? { link, ...details } : link;
  })
  .filter(Boolean);

const isWebUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(new Date(value).getTime());

/** The form state for an existing activity; lists are edited comma-separated. */
export const activityDetailsFormFrom = (activity = {}) => ({
  name: activity.name || "",
  start_date: activity.start_date || "",
  end_date: activity.end_date || "",
  unit_types: activity.unit_types || "",
  summary: activity.summary || "",
  description: activity.description || "",
  website: activity.website || "",
  image: activity.image || "",
  hero_image: activity.hero_image || "",
  media_links: mediaRowsFrom(activity.media_links),
  technologies_practices_processes: joinList(activity.technologies_practices_processes),
  cobenefits: joinList(activity.cobenefits),
  sustainable_development_goals: joinList(activity.sustainable_development_goals),
  city: activity.city || "",
  country_code: activity.country_code || "",
  term_commitment: activity.term_commitment ?? "",
  methodologies: activity.methodologies || "",
  monitoring_period_years: activity.monitoring_period_years ?? "",
  monitoring_period_start_date: activity.monitoring_period_start_date || "",
  monitoring_period_end_date: activity.monitoring_period_end_date || "",
});

/**
 * The descriptive fields as the API takes them. On create an empty optional
 * field is left out; on a PATCH it is sent as `null` so clearing it sticks.
 * `hero_image` refuses `null`: a PATCH clears it with an empty string instead.
 */
export const activityDetailsPayload = (form, { activityType, clearEmpty = false } = {}) => {
  const empty = clearEmpty ? null : undefined;

  return {
    name: form.name,
    start_date: form.start_date,
    end_date: form.end_date,
    unit_types: form.unit_types,
    type: activityType,
    summary: form.summary,
    description: form.description,
    website: form.website,
    image: form.image,
    hero_image: form.hero_image || (clearEmpty ? "" : undefined),
    media_links: mediaPayload(form.media_links),
    technologies_practices_processes: parseList(form.technologies_practices_processes),
    cobenefits: parseList(form.cobenefits),
    sustainable_development_goals: parseList(form.sustainable_development_goals),
    city: form.city,
    country_code: form.country_code,
    term_commitment: toNumberOr(form.term_commitment, empty),
    methodologies: form.methodologies,
    monitoring_period_years: toNumberOr(form.monitoring_period_years, empty),
    monitoring_period_start_date: form.monitoring_period_start_date || empty,
    monitoring_period_end_date: form.monitoring_period_end_date || empty,
  };
};

/** `null` when the form can be saved, otherwise a toast-ready `{ title, description }`. */
export const validateActivityDetails = (form) => {
  const missing = [];

  if (!form.name) missing.push("activity name");
  if (!form.country_code) missing.push("country");
  if (!form.start_date) missing.push("start date");
  if (!form.end_date) missing.push("end date");
  if (!form.unit_types) missing.push("unit type");

  if (missing.length) {
    return {
      title: "Missing required field",
      description: `Please provide the ${missing.join(", ")}.`,
    };
  }

  if (form.end_date < form.start_date) {
    return {
      title: "Dates are the wrong way round",
      description: "The end date must come after the start date.",
    };
  }

  const mediaRows = mediaRowsFrom(form.media_links).filter((row) => String(row.link).trim());
  const badMedia = mediaRows.find((row) => !isWebUrl(String(row.link).trim())
    || (row.image && !isWebUrl(String(row.image).trim()))
    || (row.published_date && !isIsoDate(String(row.published_date).trim())));

  if (badMedia) {
    return {
      title: "Check the media links",
      description: `"${badMedia.link}" needs a full http(s) URL${badMedia.image || badMedia.published_date ? ", an image URL and a YYYY-MM-DD date" : ""}.`,
    };
  }

  return null;
};
