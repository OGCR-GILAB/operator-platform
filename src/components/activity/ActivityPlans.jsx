import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { SkeletonField } from "../ui/Skeleton";
import Message from "../ui/Message";
import TextField from "../ui/TextField";
import DatePicker from "../ui/DatePicker";
import ActivityTabHeader from "./ActivityTabHeader";
import { useActivity } from "./ActivityContext";
import $projects from "../../services/$projects";
import $auth from "../../services/$auth";
import ActivityPlan from "../../models/activity_plan";
import MonitoringPlan, { emptyMonitoredParameter } from "../../models/monitoring_plan";

const parseCodes = (value) =>
  String(value || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

/**
 * Tonnes carry up to three decimals. Parsing has to survive half-typed input, so
 * it runs on blur and on save — never on keystroke, where `Number("6.")` is `6`
 * and the decimal point disappears as it is typed.
 */
const toDecimal = (raw) => {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return undefined;

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;

  return Math.round(parsed * 1000) / 1000;
};

/**
 * Twenty-odd fields in one column is a wall nobody reads. Grouping them by the
 * question each set answers turns the form into five short tasks, and lets a
 * group say up front when it does not apply.
 *
 * Long-form fields render as textareas; the rest as single-line inputs.
 */
const ACTIVITY_GROUPS = [
  {
    id: "eligibility",
    title: "Eligibility and ownership",
    hint: "Why this activity qualifies, and on what legal basis it holds the land.",
    text: [
      ["activity_eligibility", "Activity eligibility"],
      ["legal_parcel_ownership", "Legal parcel ownership"],
      ["article_8_1_information", "Article 8(1) information"],
    ],
  },
  {
    id: "methodology",
    title: "Methodology",
    hint: "How removals are quantified, and why they would not have happened anyway.",
    text: [
      ["methodology_quantification_baseline", "Quantification baseline"],
      ["methodology_additionality_funding_sources", "Additionality and funding sources"],
      ["methodology_long_term_storage", "Long-term storage"],
      ["methodology_sustainability", "Sustainability"],
    ],
  },
  {
    id: "expected",
    title: "Expected outcomes",
    hint: "Your own estimates for the whole activity period, in tonnes CO₂e. Fractions are accepted, to three decimals.",
    numbers: [
      ["expected_total_carbon_removals", "Total carbon removals"],
      ["expected_total_soil_emissions", "Total soil emissions"],
      ["expected_total_ghg_emissions_associated", "Associated GHG emissions"],
      ["expected_net_benefit", "Net benefit"],
    ],
  },
  {
    id: "group",
    title: "Group certification",
    hint: "Only for activities certified as a group. Leave blank if yours is not.",
    text: [
      ["group_advisory_services_description", "Advisory services"],
      ["group_internal_control_system_description", "Internal control system"],
    ],
  },
];

const MONITORING_TEXT_FIELDS = [
  ["emission_sources_and_sinks", "Emission sources and sinks"],
  ["data_source", "Data source"],
  ["measurement_methods_procedures_accuracy_calibration", "Measurement methods, accuracy and calibration"],
  ["quality_assessment_or_quality_control_procedures", "Quality assessment / control procedures"],
  ["responsibility_for_collection_and_archiving", "Responsibility for collection and archiving"],
];

/** A titled block of related fields, with one line saying what it is for. */
function FieldGroup({ title, hint, columns = 1, children }) {
  return (
    <fieldset className="ogcr-fieldgroup">
      <legend className="ogcr-fieldgroup__legend">{title}</legend>
      {hint ? <p className="ogcr-fieldgroup__hint">{hint}</p> : null}
      <div className={`ogcr-fieldgroup__fields ogcr-fieldgroup__fields--${columns === 2 ? "two" : "one"}`}>
        {children}
      </div>
    </fieldset>
  );
}

/**
 * The visible box of a field comes from `.ogcr-input__field`, not from
 * `.ogcr-input__control` — the control itself is borderless and transparent. A
 * textarea dropped straight into `.ogcr-input` therefore renders with no box at
 * all, which is how every long-form plan field used to look.
 */
function TextArea({ label, value, onChange, disabled = false, rows = 3, placeholder }) {
  return (
    <div className="ogcr-input">
      {label ? <label className="ogcr-input__label">{label}</label> : null}
      <div className="ogcr-input__field ogcr-input__field--textarea">
        <textarea
          className="ogcr-input__control"
          rows={rows}
          value={value || ""}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * A tonnage field.
 *
 * Deliberately `type="text"` rather than `type="number"`: the number input's
 * value sanitiser reports anything that is not a valid floating-point number as
 * the empty string, so the keystroke that produces "6." arrives as "" and 6.5
 * can never be typed. `inputMode="decimal"` still brings up the numeric keypad.
 *
 * While a draft string is held the model cannot overwrite what is on screen;
 * the value is parsed into the plan on blur.
 */
function DecimalField({ label, value, draft, disabled, onDraft, onCommit }) {
  return (
    <TextField
      type="text"
      inputMode="decimal"
      label={label}
      placeholder="0"
      helperText="tCO₂e · up to 3 decimals"
      value={draft ?? (value ?? "")}
      disabled={disabled}
      onChange={(event) => onDraft(event.target.value)}
      onBlur={onCommit}
    />
  );
}

/**
 * `projects/{id}/plan/` and `projects/{id}/monitoring-plan/` are single objects,
 * created or replaced with PUT. No field is required on either. Both live on one
 * page: the activity plan states the intent, the monitoring plan states how it
 * will be measured, and they are saved together.
 */
function ActivityPlans() {
  const { activityId, editable, reload: reloadActivity } = useActivity();

  const [plan, setPlan] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  // Raw strings for the tonnage fields, held only while one is being typed into.
  const [numberDrafts, setNumberDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activityId) return undefined;

    let cancelled = false;

    Promise.all([
      $projects.plan(activityId).catch(() => ({})),
      $projects.monitoringPlan(activityId).catch(() => ({})),
    ])
      .then(([planRecord, monitoringRecord]) => {
        if (cancelled) return;
        setPlan(new ActivityPlan(planRecord || {}));
        setMonitoring(new MonitoringPlan(monitoringRecord || {}));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [activityId]);

  const updatePlan = (field, value) => {
    setPlan((current) => Object.assign(new ActivityPlan(current), { [field]: value }));
    setSaved(false);
  };

  const draftNumber = (field, raw) => {
    setNumberDrafts((current) => ({ ...current, [field]: raw }));
    setSaved(false);
  };

  /** Parse one draft into the plan and let the model own the value again. */
  const commitNumber = (field) => {
    if (!(field in numberDrafts)) return;

    updatePlan(field, toDecimal(numberDrafts[field]));

    setNumberDrafts((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateMonitoring = (field, value) => {
    setMonitoring((current) => Object.assign(new MonitoringPlan(current), { [field]: value }));
    setSaved(false);
  };

  const updateParameter = (index, field, value) => {
    setMonitoring((current) => {
      const parameters = [...(current.monitored_data_parameters || [])];
      parameters[index] = { ...parameters[index], [field]: value };
      return Object.assign(new MonitoringPlan(current), { monitored_data_parameters: parameters });
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    // Saving with the keyboard never blurs the focused field, so any tonnage
    // still held as a draft is parsed here rather than trusted to `onBlur`.
    const flushed = Object.entries(numberDrafts).reduce(
      (next, [field, raw]) => Object.assign(next, { [field]: toDecimal(raw) }),
      new ActivityPlan(plan),
    );

    try {
      // PUT creates or replaces; both plans are saved together so a half-saved
      // activity is never left behind.
      await $projects.savePlan(activityId, flushed.toPayload());
      await $projects.saveMonitoringPlan(activityId, monitoring.toPayload());

      setPlan(flushed);
      setNumberDrafts({});
      setSaved(true);
      // `has_plan` / `has_monitoring_plan` feed the readiness checks on Overview.
      reloadActivity();
    } catch (err) {
      if (err?.response?.status === 401) return;
      // A submitted activity is read-only: changes come back 409.
      setError(err?.response?.status === 409
        ? "This activity has been submitted, so its plans are read-only."
        : $auth.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /*
    The two cards are always the same two cards, so they are drawn before their
    values arrive. The tab used to collapse to a single spinner and then unfold
    two full forms underneath it, which moved everything on the page twice.
  */
  if (loading) {
    return (
      <div className="ogcr-activity-tab" aria-busy="true">
        <ActivityTabHeader description="Loading the activity and monitoring plans…" />

        {["Activity plan", "Monitoring plan"].map((title, cardIndex) => (
          <Card key={title} title={title}>
            <div className="ogcr-fieldgroup-stack">
              <FieldGroup title="Reference data">
                <SkeletonField delay={cardIndex * 120} />
                <SkeletonField delay={cardIndex * 120 + 80} />
              </FieldGroup>

              <FieldGroup title="Detail" columns={2}>
                <SkeletonField delay={cardIndex * 120 + 160} />
                <SkeletonField delay={cardIndex * 120 + 240} />
              </FieldGroup>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description={editable
          ? "The activity plan states the intent; the monitoring plan states how it will be measured. Neither reaches DCR until the activity is submitted."
          : "This activity has been submitted — its plans are read-only."}
      />

      {Boolean(error) && (
        <Message variant="error" title="Could not save" description={error} onClose={() => setError("")} />
      )}
      {saved && (
        <Message variant="success" title="Plans saved" description="Both plans have been stored." onClose={() => setSaved(false)} />
      )}

      <Card title="Activity plan" subtitle="What this activity is and what it expects to achieve.">
        <div className="ogcr-fieldgroup-stack">
          <FieldGroup
            title="Reference data"
            hint="How the geometry is expressed, and the scheme codes the parcels fall under."
            columns={2}
          >
            <DatePicker
              label="Date submitted"
              value={plan.date_submitted || ""}
              disabled={!editable}
              onChange={(value) => updatePlan("date_submitted", value)}
            />
            <TextField
              label="Coordinate reference system"
              placeholder="e.g., EPSG:4326"
              value={plan.coordinate_reference_system || ""}
              disabled={!editable}
              onChange={(event) => updatePlan("coordinate_reference_system", event.target.value)}
            />
            <TextField
              label="IACS codes"
              placeholder="Comma-separated"
              value={(plan.iacs_codes || []).join(", ")}
              disabled={!editable}
              onChange={(event) => updatePlan("iacs_codes", parseCodes(event.target.value))}
            />
            <TextField
              label="LPIS codes"
              placeholder="Comma-separated"
              value={(plan.lpis_codes || []).join(", ")}
              disabled={!editable}
              onChange={(event) => updatePlan("lpis_codes", parseCodes(event.target.value))}
            />
          </FieldGroup>

          {ACTIVITY_GROUPS.map((group) => (
            <FieldGroup
              key={group.id}
              title={group.title}
              hint={group.hint}
              columns={group.numbers ? 2 : 1}
            >
              {(group.text || []).map(([field, label]) => (
                <TextArea
                  key={field}
                  label={label}
                  value={plan[field]}
                  disabled={!editable}
                  onChange={(value) => updatePlan(field, value)}
                />
              ))}

              {(group.numbers || []).map(([field, label]) => (
                <DecimalField
                  key={field}
                  label={label}
                  value={plan[field]}
                  draft={numberDrafts[field]}
                  disabled={!editable}
                  onDraft={(raw) => draftNumber(field, raw)}
                  onCommit={() => commitNumber(field)}
                />
              ))}
            </FieldGroup>
          ))}
        </div>
      </Card>

      <Card title="Monitoring plan" subtitle="How the activity will be measured, and by whom.">
        <div className="ogcr-fieldgroup-stack">
          <FieldGroup title="Schedule" hint="When monitoring reports are due." columns={2}>
            <DatePicker
              label="Date submitted"
              value={monitoring.date_submitted || ""}
              disabled={!editable}
              onChange={(value) => updateMonitoring("date_submitted", value)}
            />
            <TextField
              label="Monitoring frequency"
              placeholder="e.g., Annually"
              value={monitoring.monitoring_frequency || ""}
              disabled={!editable}
              onChange={(event) => updateMonitoring("monitoring_frequency", event.target.value)}
            />
          </FieldGroup>

          <FieldGroup
            title="Monitored parameters"
            hint="Each measurement this activity collects, with its unit and scope."
          >
            <div className="ogcr-parameter-list">
              {(monitoring.monitored_data_parameters || []).length === 0 && (
                <p className="ogcr-fieldgroup__empty">
                  No parameters yet — add the first measurement this activity records.
                </p>
              )}

              {(monitoring.monitored_data_parameters || []).map((parameter, index) => (
                // Rows have no stable id; the position is the identity here.
                <div key={`parameter-${index}`} className="ogcr-parameter-list__row">
                  <TextField
                    label={index === 0 ? "Name" : undefined}
                    aria-label="Parameter name"
                    placeholder="e.g., Soil organic carbon"
                    value={parameter.name || ""}
                    disabled={!editable}
                    onChange={(event) => updateParameter(index, "name", event.target.value)}
                  />
                  <TextField
                    label={index === 0 ? "Unit" : undefined}
                    aria-label="Parameter unit"
                    placeholder="e.g., t/ha"
                    value={parameter.unit || ""}
                    disabled={!editable}
                    onChange={(event) => updateParameter(index, "unit", event.target.value)}
                  />
                  <TextField
                    label={index === 0 ? "Scope" : undefined}
                    aria-label="Parameter scope"
                    placeholder="e.g., Per parcel"
                    value={parameter.scope || ""}
                    disabled={!editable}
                    onChange={(event) => updateParameter(index, "scope", event.target.value)}
                  />
                  <Button
                    variant="text"
                    tone="warning"
                    size="sm"
                    disabled={!editable}
                    ariaLabel={`Remove parameter ${index + 1}`}
                    startIcon={<TrashIcon size={16} />}
                    onClick={() => updateMonitoring(
                      "monitored_data_parameters",
                      monitoring.monitored_data_parameters.filter((_, position) => position !== index),
                    )}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div>
                <Button
                  variant="outlined"
                  size="sm"
                  disabled={!editable}
                  startIcon={<PlusIcon size={16} />}
                  onClick={() => updateMonitoring(
                    "monitored_data_parameters",
                    [...(monitoring.monitored_data_parameters || []), emptyMonitoredParameter()],
                  )}
                >
                  Add parameter
                </Button>
              </div>
            </div>
          </FieldGroup>

          <FieldGroup
            title="Methods and quality"
            hint="Where the data comes from, how it is measured, and who is answerable for it."
          >
            {MONITORING_TEXT_FIELDS.map(([field, label]) => (
              <TextArea
                key={field}
                label={label}
                value={monitoring[field]}
                disabled={!editable}
                onChange={(value) => updateMonitoring(field, value)}
              />
            ))}
          </FieldGroup>
        </div>
      </Card>

      {editable && (
        // Both plans save together, and the form is long — so the action rides
        // along at the bottom of the viewport rather than only at the very end.
        <div className="ogcr-form-actionbar">
          <span className="ogcr-form-actionbar__note">
            Saves the activity plan and the monitoring plan together.
          </span>
          <Button
            variant="filled"
            tone="brand"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save plans"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ActivityPlans;
