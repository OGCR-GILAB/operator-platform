import { useEffect, useState } from "react";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import { certificationSchemes as fallbackSchemes } from "./activityConfig";

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
 * The scheme list, with the hard-coded fallback standing in until the API
 * answers. `allSamples` is true when nothing real came back, which is worth
 * saying out loud — DCR does not publish its schemes yet, and an account
 * without the `reference` capability sees the same thing.
 */
export default function useCertificationSchemes({ enabled = true } = {}) {
  const [options, setOptions] = useState(() => fallbackSchemes.map(
    (scheme) => ({ ...scheme, source: null }),
  ));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    $auth.certificationSchemes()
      .then((schemes) => {
        if (cancelled) return;
        const loaded = toSchemeOptions(schemes);
        if (loaded.length) setOptions(loaded);
        setLoading(false);
      })
      .catch(() => {
        // Keep the fallback list; the user can still pick something.
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [enabled]);

  const allSamples = options.length > 0 && options.every((option) => option.source === "sample");

  return { options, loading, allSamples };
}
