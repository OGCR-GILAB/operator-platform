import DateField from "../ui/DateField";
import { Input, NumberField, Select } from "@majistudio/ogcr-design-system";
import useCountryOptions from "./useCountryOptions";
import useUnitTypeChoices from "./useUnitTypeChoices";
import useVocabularies from "./useVocabularies";
import VocabularyField from "./VocabularyField";
import MediaLinksField from "./MediaLinksField";

/**
 * The activity's descriptive fields, as one grid. `essential` is what creating
 * an activity asks for — the fields readiness needs, plus a summary; `full` is
 * the "Edit details" modal on the activity overview.
 */
function ActivityDetailsFields({
  form,
  activityType,
  onFieldChange,
  onUnitTypeChange,
  disabled = false,
  variant = "full",
}) {
  const countryOptions = useCountryOptions();
  const unitTypeChoices = useUnitTypeChoices();
  // DCR ids where DCR publishes a list; free text where it does not (yet).
  // Only the ids become links on DCR — free text is sent as plain text.
  const { loading: vocabulariesLoading, practices, coBenefits, sdgs } = useVocabularies();

  const text = (field) => ({
    value: form[field],
    onChange: (event) => onFieldChange(field, event.target.value),
    disabled,
  });

  const choice = (field) => ({
    value: form[field] || null,
    onValueChange: (value) => onFieldChange(field, value),
    disabled,
  });

  // Whole years. The form keeps every field as a string, so it converts both ways.
  const years = (field) => ({
    value: form[field] === "" || form[field] == null ? null : Number(form[field]),
    onValueChange: (value) => onFieldChange(field, value == null ? "" : String(value)),
    min: 0,
    step: 1,
    format: { maximumFractionDigits: 0 },
    disabled,
  });

  const date = (field) => ({
    value: form[field],
    onChange: (value) => onFieldChange(field, value),
    disabled,
  });

  return (
    <div className="ogcr-project-wizard__grid">
      <Input
        label="Activity name"
        placeholder="e.g., Nile Delta Mangrove Restoration"
        {...text("name")}
        required
      />
      <Select
        label="Unit type"
        value={form.unit_types || null}
        onValueChange={(value) => (onUnitTypeChange
          ? onUnitTypeChange(value)
          : onFieldChange("unit_types", value))}
        options={unitTypeChoices}
        placeholder="Select unit type"
        helperText={activityType ? `Activity type: ${activityType}` : "Determines the activity type."}
        disabled={disabled}
        required
      />
      <DateField label="Start date" {...date("start_date")} required />
      <DateField label="End date" {...date("end_date")} required />
      <Select
        label="Country"
        options={countryOptions}
        placeholder="Select country"
        {...choice("country_code")}
        required
      />
      {variant === "essential" ? (
        <Input label="Summary" placeholder="Short activity summary" {...text("summary")} />
      ) : (
        <>
          <Input label="City" placeholder="e.g., Lille" {...text("city")} />
          <Input label="Summary" placeholder="Short activity summary" {...text("summary")} />
          <Input label="Description" placeholder="Detailed activity description" {...text("description")} />
          <Input label="Website" type="url" placeholder="https://" {...text("website")} />
          <Input label="Cover image URL" type="url" placeholder="Image URL" {...text("image")} />
          <Input label="Hero image URL" type="url" placeholder="Wide banner image URL" {...text("hero_image")} />
          {vocabulariesLoading || practices.length > 0 ? (
            <VocabularyField
              label="Technologies, practices and processes"
              placeholder={vocabulariesLoading ? "Loading DCR list…" : "Add a practice"}
              options={practices}
              value={form.technologies_practices_processes}
              onChange={(value) => onFieldChange("technologies_practices_processes", value)}
              helperText="From DCR's list. Pick as many as apply."
              disabled={disabled || vocabulariesLoading}
            />
          ) : (
            <Input
              label="Technologies, practices and processes"
              placeholder="Comma-separated practices"
              helperText="Sent to DCR as plain text while DCR's practice list is unavailable."
              {...text("technologies_practices_processes")}
            />
          )}
          <NumberField label="Term commitment (years)" placeholder="Integer" {...years("term_commitment")} />
          {coBenefits.length > 0 ? (
            <VocabularyField
              label="Co-benefits"
              placeholder="Add a co-benefit"
              options={coBenefits}
              value={form.cobenefits}
              onChange={(value) => onFieldChange("cobenefits", value)}
              helperText="From DCR's list. Pick as many as apply."
              disabled={disabled}
            />
          ) : (
            <Input
              label="Co-benefits"
              placeholder="Comma-separated co-benefits"
              helperText="Sent to DCR as plain text until DCR publishes its co-benefit list."
              {...text("cobenefits")}
            />
          )}
          {vocabulariesLoading || sdgs.length > 0 ? (
            <VocabularyField
              label="Sustainable Development Goals"
              placeholder={vocabulariesLoading ? "Loading DCR list…" : "Add a goal"}
              options={sdgs}
              value={form.sustainable_development_goals}
              onChange={(value) => onFieldChange("sustainable_development_goals", value)}
              helperText="The UN goals this activity contributes to."
              disabled={disabled || vocabulariesLoading}
            />
          ) : (
            <Input
              label="Sustainable Development Goals"
              placeholder="Comma-separated goals"
              helperText="Sent to DCR as plain text while DCR's goal list is unavailable."
              {...text("sustainable_development_goals")}
            />
          )}
          <Input label="Methodologies" placeholder="Comma-separated methodologies" {...text("methodologies")} />
          <NumberField
            label="Monitoring period (years)"
            placeholder="Integer"
            {...years("monitoring_period_years")}
          />
          <DateField label="Monitoring period start date" {...date("monitoring_period_start_date")} />
          <DateField label="Monitoring period end date" {...date("monitoring_period_end_date")} />
          <div className="ogcr-project-wizard__grid-full">
            <MediaLinksField
              value={form.media_links}
              onChange={(value) => onFieldChange("media_links", value)}
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ActivityDetailsFields;
