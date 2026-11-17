import { useId } from "react";
import { DatePicker, FormField } from "@majistudio/ogcr-design-system";

/** "YYYY-MM-DD" as a local date, so the day never shifts across time zones. */
const fromIsoDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};

const toIsoDate = (date) => {
  if (!date) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * The DS DatePicker with a label, reading and writing the API's "YYYY-MM-DD"
 * strings. An empty value is "".
 */
function DateField({ label, value, onChange, helperText, required = false, disabled = false }) {
  const id = useId();

  return (
    <FormField label={label} htmlFor={id} helperText={helperText} required={required}>
      <DatePicker
        id={id}
        value={fromIsoDate(value)}
        onChange={(date) => onChange(toIsoDate(date))}
        clearable={!required}
        required={required}
        disabled={disabled}
      />
    </FormField>
  );
}

export default DateField;
