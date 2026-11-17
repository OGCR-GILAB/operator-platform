import { useEffect, useState } from "react";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";

/**
 * `GET auth/dcr/certification-schemes/` returns a bare array of
 * `{certification_scheme_id, name, source, ...}`. `source` is `dcr` for real
 * registry data or `sample` for the placeholder list served while DCR does not
 * expose schemes yet — the shape is identical either way.
 */
export const toSchemeOptions = (schemes) =>
  toList(schemes)
    .map((scheme) => {
      const value = scheme.certification_scheme_id ?? scheme.id ?? scheme.value;
      if (value == null) return null;

      return {
        value: String(value),
        label: String(scheme.name ?? value),
        source: scheme.source || null,
        description: scheme.description || "",
        methodology: scheme.certification_methodology || "",
        versionNumber: scheme.scheme_version_number || "",
        decisionReference: scheme.commission_decision_reference || "",
      };
    })
    .filter(Boolean);

/**
 * The scheme list from the API. There is deliberately no hard-coded fallback:
 * whatever is picked here is sent as `certification_scheme_id`, the field DCR
 * matches on, so an invented id would register the activity under a scheme
 * that does not exist. `allSamples` is true when nothing real came back, which
 * is worth saying out loud — DCR does not publish its schemes yet, and an
 * account without the `reference` capability sees the same thing.
 */
export default function useCertificationSchemes({ enabled = true } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    $auth.certificationSchemes()
      .then((schemes) => {
        if (cancelled) return;
        setOptions(toSchemeOptions(schemes));
        setFailed(false);
        setLoading(false);
      })
      .catch(() => {
        // The scheme is optional and can be set later, so this is not fatal.
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [enabled]);

  const allSamples = options.length > 0 && options.every((option) => option.source === "sample");

  return { options, loading, failed, allSamples };
}

/** One helper line for every scheme select, so the wording stays in step. */
export function schemeHelperText({ loading, failed, allSamples, options }) {
  if (loading) return "Loading schemes from DCR… Optional — it can be set later.";
  if (failed) return "Schemes could not be loaded. Optional — it can be set later.";
  if (!options.length) return "DCR lists no schemes yet. Optional — it can be set later.";
  if (allSamples) return "Sample schemes are placeholders — DCR does not publish its schemes yet. Optional; it can be set later.";
  return "Loaded from DCR. Optional — it can be set later.";
}
