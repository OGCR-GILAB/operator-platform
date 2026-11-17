import { Select } from "@majistudio/ogcr-design-system";
import { parseList } from "./activityDetails";

/** An option's label, led by its `icon` when the vocabulary has one (SDGs). */
export function VocabularyLabel({ option, children }) {
  return (
    <span className="ogcr-vocabulary-field__label">
      {option?.icon && (
        <img src={option.icon} alt="" className="ogcr-vocabulary-field__icon" loading="lazy" />
      )}
      {children ?? option?.label}
    </span>
  );
}

/**
 * Several values from a DCR vocabulary. The form keeps them comma-separated,
 * like the free-text fields it replaces, so the payload code is unchanged.
 * Values saved before the vocabulary existed stay selected and removable; only
 * DCR ids become links on DCR, so those are marked as sent as plain text.
 */
function VocabularyField({ label, value, onChange, options, helperText, placeholder, disabled = false }) {
  const chosen = parseList(value);
  const offList = chosen
    .filter((entry) => !options.some((option) => option.value === entry))
    .map((entry) => ({
      value: entry,
      label: options.length > 0 ? `${entry} · not on DCR's list, sent as plain text` : entry,
    }));

  return (
    <Select
      multiple
      label={label}
      value={chosen}
      options={[
        ...options.map((option) => ({ value: option.value, label: <VocabularyLabel option={option} /> })),
        ...offList,
      ]}
      placeholder={placeholder}
      helperText={helperText}
      disabled={disabled}
      onValueChange={(next) => onChange(next.join(", "))}
    />
  );
}

export default VocabularyField;
