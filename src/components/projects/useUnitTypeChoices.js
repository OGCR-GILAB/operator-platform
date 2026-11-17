import { useEffect, useState } from "react";
import $reference from "../../services/$reference";
import { toList } from "../../services/$api";
import { unitTypeOptions } from "./activityConfig";

/** Unit types from `GET reference/`, with the built-in list until it answers. */
export default function useUnitTypeChoices() {
  const [choices, setChoices] = useState(unitTypeOptions);

  useEffect(() => {
    let cancelled = false;

    $reference.all()
      .then((reference) => {
        if (cancelled) return;
        const loaded = toList(reference?.unit_types)
          .map((item) => ({ value: item.value, label: item.value }));
        if (loaded.length) setChoices(loaded);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return choices;
}
