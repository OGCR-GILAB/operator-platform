import { useEffect, useState } from "react";
import $reference from "../../services/$reference";
import { toList } from "../../services/$api";

// DCR fills a list it has not defined yet with one placeholder entry, which may
// carry a real id under the label `sample`.
const isSample = (text) => String(text ?? "").trim().toLowerCase() === "sample";
const isPlaceholderList = (items) => items.length === 0
  || items.every((item) => isSample(item?.value) || isSample(item?.label));

/**
 * `GET reference/vocabularies/`, memoised by `$reference`. A list that is
 * missing, unavailable or only DCR's placeholder comes back empty, so callers
 * fall back to free text for it.
 */
export default function useVocabularies() {
  const [vocabularies, setVocabularies] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    $reference.vocabularies()
      .then((data) => { if (!cancelled) setVocabularies(data); })
      .catch(() => {
        // Free text stays available; the API accepts it for these lists.
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, []);

  const listOf = (name) => {
    if (vocabularies?.sources?.[name] === "unavailable") return [];
    const items = toList(vocabularies?.[name]);
    return isPlaceholderList(items) ? [] : items;
  };

  return {
    loaded: Boolean(vocabularies),
    // Still waiting: not yet a reason to fall back to free text.
    loading: !vocabularies && !failed,
    practices: listOf("technologies_practices_processes"),
    coBenefits: listOf("co_benefits"),
    sdgs: listOf("sustainable_development_goals"),
  };
}
