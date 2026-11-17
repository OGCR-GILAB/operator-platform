import { useEffect, useState } from "react";
import $reference from "../../services/$reference";
import { euAndCandidateCountryOptions, syncLabelsWithReference } from "./activityConfig";

/**
 * The curated country select, checked against `GET reference/countries/` —
 * the list the API validates `country_code` against. Names come from the API
 * and codes it does not know are dropped. The curated list stands in until it
 * answers (or if it fails); `$reference` memoises the call for the page.
 */
export default function useCountryOptions() {
  const [options, setOptions] = useState(euAndCandidateCountryOptions);

  useEffect(() => {
    let cancelled = false;

    $reference.countries()
      .then((countries) => {
        if (!cancelled) setOptions(syncLabelsWithReference(countries));
      })
      .catch(() => {
        // Keep the curated list; the API still validates on save.
      });

    return () => { cancelled = true; };
  }, []);

  return options;
}
