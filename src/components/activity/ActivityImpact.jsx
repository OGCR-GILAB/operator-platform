import { Card, Pill } from "@majistudio/ogcr-design-system";
import useVocabularies from "../projects/useVocabularies";
import { VocabularyLabel } from "../projects/VocabularyField";
import { mediaRowsFrom } from "../projects/activityDetails";
import { toList } from "../../services/$api";

const OFF_LIST_HINT = "Not on DCR's list — sent as plain text";

// Only DCR ids become links on DCR, so where DCR publishes the list, anything
// else goes over as plain text.
const isOffList = (entry, options) => options.length > 0 && !options.some((item) => item.value === entry);

/** Chips for one list field; off-list values keep the warning tone. */
function VocabularyChips({ values, options }) {
  const entries = toList(values);
  if (!entries.length) return "—";

  return (
    <div className="ogcr-vocabulary-field__chosen">
      {entries.map((entry) => {
        const option = options.find((item) => item.value === entry);
        const offList = isOffList(entry, options);

        return (
          <Pill key={entry} tone={offList ? "warning" : "neutral"} className="ogcr-vocabulary-field__chip">
            <span title={offList ? OFF_LIST_HINT : undefined}>
              <VocabularyLabel option={option}>{option?.label || entry}</VocabularyLabel>
            </span>
          </Pill>
        );
      })}
    </div>
  );
}

/**
 * Practices, co-benefits, SDGs and media links. On submit DCR receives the
 * vocabulary ids as link records and each media link as an `activity_media`.
 * Labels sit beside their chips, so a long list of SDGs does not push the
 * next label out of sight.
 */
function ActivityImpact({ activity }) {
  const { practices, coBenefits, sdgs } = useVocabularies();
  const media = mediaRowsFrom(activity.media_links).filter((row) => row.link);

  const lists = [
    ["Technologies, practices and processes", activity.technologies_practices_processes, practices],
    ["Co-benefits", activity.cobenefits, coBenefits],
    ["Sustainable Development Goals", activity.sustainable_development_goals, sdgs],
  ];
  const anyOffList = lists.some(([, values, options]) => (
    toList(values).some((entry) => isOffList(entry, options))
  ));

  return (
    <Card title="Practices & impact">
      <dl className="ogcr-impact-list">
        {lists.map(([label, values, options]) => (
          <div key={label} className="ogcr-impact-list__row">
            <dt className="ogcr-project-detail__label">{label}</dt>
            <dd className="ogcr-project-detail__value">
              <VocabularyChips values={values} options={options} />
            </dd>
          </div>
        ))}
        <div className="ogcr-impact-list__row">
          <dt className="ogcr-project-detail__label">Media links</dt>
          <dd className="ogcr-project-detail__value">
            {media.length ? (
              <ul className="ogcr-activity-impact__media">
                {media.map((row) => (
                  <li key={row.link}>
                    <Pill tone="neutral">{row.type || "link"}</Pill>
                    <a href={row.link} target="_blank" rel="noreferrer noopener" title={row.link}>
                      {row.title || row.link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : "—"}
          </dd>
        </div>
      </dl>

      {anyOffList && (
        <p className="text-body-s ogcr-card__subtitle">
          Highlighted values are not on DCR&apos;s list and go over as plain text.
        </p>
      )}
    </Card>
  );
}

export default ActivityImpact;
