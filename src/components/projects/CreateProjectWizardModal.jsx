import { useEffect, useMemo, useState } from "react";
import { CheckCircleIcon, MapTrifoldIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useToast } from "../providers/ToastContext";
import Button from "../ui/Button";
import Card from "../ui/Card";
import DatePicker from "../ui/DatePicker";
import Loader from "../ui/Loader";
import Message from "../ui/Message";
import Modal from "../ui/Modal";
import Pill from "../ui/Pill";
import Select from "../ui/Select";
import TextField from "../ui/TextField";
import {
  euAndCandidateCountryOptions,
  getInitialWizardForm,
  planTemplateFor,
  setupStages,
  unitTypeOptions,
  wizardSteps,
} from "./activityConfig";
import useCertificationSchemes from "./useCertificationSchemes";
import ImportParcels from "./ImportParcels";
import $projects from "../../services/$projects";
import $auth from "../../services/$auth";
import $reference, { UNIT_TYPE_TO_ACTIVITY_TYPE } from "../../services/$reference";
import { toList } from "../../services/$api";
import Project from "../../models/project";
import ActivityPlan from "../../models/activity_plan";
import MonitoringPlan from "../../models/monitoring_plan";

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toNumberOrUndefined = (value) => {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function CreateActivityWizardModal(props) {
  const { isOpen, onClose, operatorId, onCreateActivity } = props;
  const { showToast } = useToast();

  const [createWizardStep, setCreateWizardStep] = useState(0);
  const [isInitializingActivity, setIsInitializingActivity] = useState(false);
  const [setupStageIndex, setSetupStageIndex] = useState(-1);
  const [setupError, setSetupError] = useState("");
  const [newActivityForm, setNewActivityForm] = useState(() => getInitialWizardForm(operatorId));

  // The certification schemes come from DCR through the API; the hard-coded list
  // in activityConfig is only the fallback while this is in flight.
  const { options: schemeOptions, allSamples: allSchemesAreSamples } = useCertificationSchemes();
  const [unitTypeChoices, setUnitTypeChoices] = useState(unitTypeOptions);

  useEffect(() => {
    let cancelled = false;

    $reference.all()
      .then((reference) => {
        if (cancelled) return;
        const choices = toList(reference?.unit_types)
          .map((item) => ({ value: item.value, label: item.value }));
        if (choices.length) setUnitTypeChoices(choices);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const activityType = useMemo(
    () => UNIT_TYPE_TO_ACTIVITY_TYPE[newActivityForm.unit_types] || null,
    [newActivityForm.unit_types],
  );

  const handleClose = () => {
    if (isInitializingActivity) {
      return;
    }

    onClose();
  };

  const handleWizardFieldChange = (field, value) => {
    setNewActivityForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // `unit_types` implies the activity `type` — never the other way round, since
  // two unit types map to CARBON_FARMING.
  const handleUnitTypeChange = (value) => {
    const template = planTemplateFor(UNIT_TYPE_TO_ACTIVITY_TYPE[value]);

    setNewActivityForm((current) => ({
      ...current,
      unit_types: value,
      activityPlanTitle: template.activityPlanTitle,
      monitoringPlanTitle: template.monitoringPlanTitle,
    }));
  };

  const handleCertificationSchemeChange = (value) => {
    const scheme = schemeOptions.find((option) => option.value === value);

    setNewActivityForm((current) => ({
      ...current,
      certification_scheme_id: value,
      certification_scheme_name: scheme?.label || "",
    }));
  };

  const selectedScheme = schemeOptions.find(
    (option) => option.value === newActivityForm.certification_scheme_id,
  );

  const validateBasicInfoStep = () => {
    const missing = [];

    if (!newActivityForm.name) missing.push("activity name");
    if (!newActivityForm.country_code) missing.push("country");
    if (!newActivityForm.start_date) missing.push("start date");
    if (!newActivityForm.end_date) missing.push("end date");
    if (!newActivityForm.unit_types) missing.push("unit type");

    if (missing.length) {
      showToast({
        variant: "error",
        title: "Missing required field",
        description: `Please provide the ${missing.join(", ")}.`,
      });

      return false;
    }

    if (newActivityForm.end_date < newActivityForm.start_date) {
      showToast({
        variant: "error",
        title: "Dates are the wrong way round",
        description: "The end date must come after the start date.",
      });

      return false;
    }

    return true;
  };

  const handleNextWizardStep = () => {
    if (createWizardStep === 0 && !validateBasicInfoStep()) {
      return;
    }

    setCreateWizardStep((current) =>
      Math.min(current + 1, wizardSteps.length - 1)
    );
  };

  const handlePreviousWizardStep = () => {
    setCreateWizardStep((current) => Math.max(current - 1, 0));
  };

  const buildProject = () => new Project({
    name: newActivityForm.name,
    operator: operatorId,
    start_date: newActivityForm.start_date,
    end_date: newActivityForm.end_date,
    unit_types: newActivityForm.unit_types,
    type: activityType,
    summary: newActivityForm.summary,
    description: newActivityForm.description,
    website: newActivityForm.website,
    image: newActivityForm.image,
    hero_image: newActivityForm.hero_image || undefined,
    media_links: parseList(newActivityForm.media_links),
    technologies_practices_processes: parseList(newActivityForm.technologies_practices_processes),
    cobenefits: parseList(newActivityForm.cobenefits),
    city: newActivityForm.city,
    country_code: newActivityForm.country_code,
    term_commitment: toNumberOrUndefined(newActivityForm.term_commitment),
    methodologies: newActivityForm.methodologies,
    monitoring_period_years: toNumberOrUndefined(newActivityForm.monitoring_period_years),
    monitoring_period_start_date: newActivityForm.monitoring_period_start_date || undefined,
    monitoring_period_end_date: newActivityForm.monitoring_period_end_date || undefined,
    certification_scheme_id: newActivityForm.certification_scheme_id || undefined,
    certification_scheme_name: newActivityForm.certification_scheme_name || undefined,
  });

  /**
   * Four real requests, in order. Everything stays local to this API — nothing
   * reaches DCR until the activity is submitted from its detail view.
   */
  const handleInitializeActivity = async () => {
    if (isInitializingActivity) {
      return;
    }

    setIsInitializingActivity(true);
    setSetupError("");

    let created = null;

    try {
      setSetupStageIndex(0);
      created = await $projects.create(buildProject().toPayload());

      // The plans are created as empty stubs so the activity has somewhere to
      // put its detail; PUT creates or replaces and requires no field.
      setSetupStageIndex(1);
      await $projects.savePlan(created.id, new ActivityPlan({
        coordinate_reference_system: "EPSG:4326",
      }).toPayload());

      setSetupStageIndex(2);
      await $projects.saveMonitoringPlan(created.id, new MonitoringPlan({
        monitoring_frequency: newActivityForm.monitoring_period_years
          ? `Every ${newActivityForm.monitoring_period_years} year(s)`
          : undefined,
      }).toPayload());

      setSetupStageIndex(3);
      await $projects.readiness(created.id).catch(() => null);

      setSetupStageIndex(setupStages.length);
      onCreateActivity?.(created);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;

      setSetupStageIndex(-1);
      setSetupError(
        created
          ? `The activity was created, but the rest of the setup failed: ${$auth.getErrorMessage(err)} You can finish it from the activity's detail view.`
          : $auth.getErrorMessage(err),
      );

      if (created) {
        // A partly-built activity is still a usable draft — surface it.
        onCreateActivity?.(created);
      }
    } finally {
      setIsInitializingActivity(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Activity"
      description={wizardSteps[createWizardStep].description}
      size="xl"
      closeOnOverlayClick={!isInitializingActivity}
    >
      <div className="ogcr-project-wizard">
        <ol
          className="ogcr-project-wizard__steps"
          aria-label="Activity creation wizard steps"
        >
          {wizardSteps.map((step, index) => {
            const state =
              index < createWizardStep
                ? "done"
                : index === createWizardStep
                  ? "active"
                  : "upcoming";

            return (
              <li
                key={step.title}
                className={`ogcr-project-wizard__step ogcr-project-wizard__step--${state}`}
              >
                <span
                  className="ogcr-project-wizard__step-index"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="ogcr-project-wizard__step-title">{step.title}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="ogcr-project-wizard__body">
          {createWizardStep === 0 && (
            <div className="ogcr-project-wizard__grid">
              <TextField
                label="Activity name"
                placeholder="e.g., Nile Delta Mangrove Restoration"
                value={newActivityForm.name}
                onChange={(event) =>
                  handleWizardFieldChange("name", event.target.value)
                }
                required
              />
              <Select
                label="Unit type"
                value={newActivityForm.unit_types}
                onChange={(event) => handleUnitTypeChange(event.target.value)}
                options={unitTypeChoices}
                placeholder="Select unit type"
                helperText={activityType ? `Activity type: ${activityType}` : "Determines the activity type."}
                required
              />
              <DatePicker
                label="Start date"
                value={newActivityForm.start_date}
                onChange={(value) => handleWizardFieldChange("start_date", value)}
                required
              />
              <DatePicker
                label="End date"
                value={newActivityForm.end_date}
                onChange={(value) => handleWizardFieldChange("end_date", value)}
                required
              />
              <Select
                label="Country"
                value={newActivityForm.country_code}
                onChange={(event) =>
                  handleWizardFieldChange("country_code", event.target.value)
                }
                options={euAndCandidateCountryOptions}
                placeholder="Select country"
                required
              />
              <TextField
                label="City"
                placeholder="e.g., Lille"
                value={newActivityForm.city}
                onChange={(event) =>
                  handleWizardFieldChange("city", event.target.value)
                }
              />
              <TextField
                label="Summary"
                placeholder="Short activity summary"
                value={newActivityForm.summary}
                onChange={(event) =>
                  handleWizardFieldChange("summary", event.target.value)
                }
              />
              <TextField
                label="Description"
                placeholder="Detailed activity description"
                value={newActivityForm.description}
                onChange={(event) =>
                  handleWizardFieldChange("description", event.target.value)
                }
              />
              <TextField
                label="Website"
                type="url"
                placeholder="https://"
                value={newActivityForm.website}
                onChange={(event) =>
                  handleWizardFieldChange("website", event.target.value)
                }
              />
              <TextField
                label="Cover image URL"
                type="url"
                placeholder="Image URL"
                value={newActivityForm.image}
                onChange={(event) =>
                  handleWizardFieldChange("image", event.target.value)
                }
              />
              <TextField
                label="Hero image URL"
                type="url"
                placeholder="Wide banner image URL"
                value={newActivityForm.hero_image}
                onChange={(event) =>
                  handleWizardFieldChange("hero_image", event.target.value)
                }
              />
              <TextField
                label="Media links"
                placeholder="Comma-separated media URLs"
                value={newActivityForm.media_links}
                onChange={(event) =>
                  handleWizardFieldChange("media_links", event.target.value)
                }
              />
              <TextField
                label="Technologies, practices and processes"
                placeholder="Comma-separated practices"
                value={newActivityForm.technologies_practices_processes}
                onChange={(event) =>
                  handleWizardFieldChange(
                    "technologies_practices_processes",
                    event.target.value
                  )
                }
              />
              <TextField
                label="Term commitment (years)"
                type="number"
                placeholder="Integer"
                value={newActivityForm.term_commitment}
                onChange={(event) =>
                  handleWizardFieldChange("term_commitment", event.target.value)
                }
              />
              <TextField
                label="Co-benefits"
                placeholder="Comma-separated co-benefits"
                value={newActivityForm.cobenefits}
                onChange={(event) =>
                  handleWizardFieldChange("cobenefits", event.target.value)
                }
              />
              <TextField
                label="Methodologies"
                placeholder="Comma-separated methodologies"
                value={newActivityForm.methodologies}
                onChange={(event) =>
                  handleWizardFieldChange("methodologies", event.target.value)
                }
              />
              <TextField
                label="Monitoring period (years)"
                type="number"
                placeholder="Integer"
                value={newActivityForm.monitoring_period_years}
                onChange={(event) =>
                  handleWizardFieldChange(
                    "monitoring_period_years",
                    event.target.value
                  )
                }
              />
              <DatePicker
                label="Monitoring period start date"
                value={newActivityForm.monitoring_period_start_date}
                onChange={(value) =>
                  handleWizardFieldChange("monitoring_period_start_date", value)
                }
              />
              <DatePicker
                label="Monitoring period end date"
                value={newActivityForm.monitoring_period_end_date}
                onChange={(value) =>
                  handleWizardFieldChange("monitoring_period_end_date", value)
                }
              />
            </div>
          )}

          {createWizardStep === 1 && (
            <Card>
              <div className="ogcr-project-wizard__placeholder">
                <div className="flex flex-row items-center gap-1">
                  <MapTrifoldIcon size={26} weight="duotone" />
                  <h4>Import parcels from cadastre</h4>
                </div>
                <Message
                  variant="warning"
                  title="Parcels are linked after the activity exists"
                  description="Create the activity first, then add its parcels from the Parcels tab inside it."
                />
                <ImportParcels />
              </div>
            </Card>
          )}

          {createWizardStep === 2 && (
            <div className="ogcr-project-wizard__grid ogcr-project-wizard__grid--narrow">
              <Select
                label="Certification scheme"
                value={newActivityForm.certification_scheme_id}
                onChange={(event) =>
                  handleCertificationSchemeChange(event.target.value)
                }
                options={schemeOptions.map(({ value, label }) => ({ value, label }))}
                placeholder="Select a scheme"
                helperText={allSchemesAreSamples
                  ? "Placeholder data — DCR does not publish its schemes yet. Optional; it can be set later."
                  : "Loaded from DCR. Optional — it can be set later."}
              />
              <TextField
                label="Activity plan title"
                placeholder="What will be done on the land?"
                value={newActivityForm.activityPlanTitle}
                onChange={(event) =>
                  handleWizardFieldChange("activityPlanTitle", event.target.value)
                }
              />
              <TextField
                label="Monitoring plan title"
                placeholder="How will progress be measured?"
                value={newActivityForm.monitoringPlanTitle}
                onChange={(event) =>
                  handleWizardFieldChange("monitoringPlanTitle", event.target.value)
                }
              />
              <Card
                trailing={selectedScheme?.source === "sample"
                  ? <Pill tone="warning">Sample</Pill>
                  : (selectedScheme?.source === "dcr" ? <Pill tone="positive">DCR</Pill> : null)}
              >
                <h4 className="ogcr-modal__section-title">Selected scheme summary</h4>
                <p className="ogcr-project-wizard__summary-text">
                  {newActivityForm.certification_scheme_name || "No scheme selected yet."}
                </p>
                {Boolean(selectedScheme?.description) && (
                  <p className="text-body-s ogcr-card__subtitle">{selectedScheme.description}</p>
                )}
                {Boolean(selectedScheme?.methodology) && (
                  <p className="text-body-s ogcr-card__subtitle">
                    Methodology: {selectedScheme.methodology}
                  </p>
                )}
                {Boolean(selectedScheme?.versionNumber) && (
                  <p className="text-body-s ogcr-card__subtitle">
                    Version {selectedScheme.versionNumber}
                    {selectedScheme.decisionReference ? ` · ${selectedScheme.decisionReference}` : ""}
                  </p>
                )}
              </Card>
            </div>
          )}

          {createWizardStep === 3 && (
            <Card>
              <div className="ogcr-project-wizard__finish">
                <h4>Finish setup</h4>
                <p>
                  This creates the activity and its two plan records on the Operator
                  Platform. Nothing is sent to DCR until you submit the activity.
                </p>

                {Boolean(setupError) && (
                  <Message
                    variant="error"
                    title="Setup failed"
                    description={setupError}
                    onClose={() => setSetupError("")}
                  />
                )}

                <div
                  className="ogcr-project-wizard__setup-list"
                  role="status"
                  aria-live="polite"
                >
                  {setupStages.map((stage, index) => {
                    const isComplete = setupStageIndex > index;
                    const isActive = setupStageIndex === index;
                    const isFailed = setupError && setupStageIndex === -1;

                    return (
                      <div
                        key={stage}
                        className={[
                          "ogcr-project-wizard__setup-item",
                          isComplete ? "is-complete" : "",
                          isActive ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isComplete ? (
                          <CheckCircleIcon size={18} weight="fill" />
                        ) : isActive ? (
                          <Loader
                            variant="dots"
                            size="s"
                            label={`Running: ${stage}`}
                          />
                        ) : isFailed ? (
                          <WarningCircleIcon size={18} weight="fill" />
                        ) : (
                          <span
                            className="ogcr-project-wizard__setup-dot"
                            aria-hidden="true"
                          />
                        )}
                        <span>{stage}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="ogcr-modal__footer">
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isInitializingActivity}
        >
          Cancel
        </Button>

        {createWizardStep > 0 && (
          <Button
            variant="outlined"
            onClick={handlePreviousWizardStep}
            disabled={isInitializingActivity}
          >
            Back
          </Button>
        )}

        {createWizardStep < wizardSteps.length - 1 ? (
          <Button
            variant="filled"
            tone="brand"
            onClick={handleNextWizardStep}
            disabled={isInitializingActivity}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="filled"
            tone="brand"
            onClick={handleInitializeActivity}
            disabled={isInitializingActivity || !operatorId}
            startIcon={
              isInitializingActivity ? (
                <Loader variant="spinner" size="s" label="Initializing activity" />
              ) : null
            }
          >
            {isInitializingActivity ? "Initializing..." : "Initialize Activity"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default CreateActivityWizardModal;
