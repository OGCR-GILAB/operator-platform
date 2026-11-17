import { useMemo, useState } from "react";
import { useToast } from "../providers/ToastContext";
import { Message, Pill, Select } from "@majistudio/ogcr-design-system";
import { getInitialActivityForm } from "./activityConfig";
import { activityDetailsPayload, validateActivityDetails } from "./activityDetails";
import ActivityDetailsFields from "./ActivityDetailsFields";
import useCertificationSchemes, { schemeHelperText } from "./useCertificationSchemes";
import $projects from "../../services/$projects";
import $auth from "../../services/$auth";
import { UNIT_TYPE_TO_ACTIVITY_TYPE } from "../../services/$reference";
import Project from "../../models/project";
import Dialog from "../ui/Dialog";

/**
 * Creating an activity asks only for what identifies it. Everything else —
 * parcels, both plans, documents, the longer description — is filled in inside
 * the activity, where the setup guide on its overview lists what is left.
 */
function CreateActivityModal(props) {
  const { isOpen, onClose, operatorId, onCreateActivity } = props;
  const { showToast } = useToast();

  const [form, setForm] = useState(() => getInitialActivityForm(operatorId));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // The certification schemes come from DCR through the API, never a local list:
  // the chosen id is what DCR registers the activity under.
  const schemes = useCertificationSchemes();
  const schemeOptions = schemes.options;

  const activityType = useMemo(
    () => UNIT_TYPE_TO_ACTIVITY_TYPE[form.unit_types] || null,
    [form.unit_types],
  );

  const handleClose = () => {
    if (!creating) onClose();
  };

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSchemeChange = (value) => {
    const scheme = schemeOptions.find((option) => option.value === value);

    setForm((current) => ({
      ...current,
      certification_scheme_id: value,
      certification_scheme_name: scheme?.label || "",
    }));
  };

  // Only the activity itself is created. The plans are created by their first
  // save (PUT creates or replaces), so `has_plan` means someone filled one in.
  const handleCreate = async () => {
    if (creating) return;

    const problem = validateActivityDetails(form);
    if (problem) {
      showToast({ variant: "error", ...problem });
      return;
    }

    setCreating(true);
    setError("");

    try {
      const created = await $projects.create(new Project({
        ...activityDetailsPayload(form, { activityType }),
        operator: operatorId,
        certification_scheme_id: form.certification_scheme_id || undefined,
        certification_scheme_name: form.certification_scheme_name || undefined,
      }).toPayload());

      onCreateActivity?.(created);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;
      setError($auth.getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open && !creating) handleClose(); }}
      size="l"
      title="New activity"
      description="Name it and say what it is. Parcels, plans and documents are added inside the activity, at your own pace."
      footerNote="Saved as a draft. Nothing is sent to DCR until you submit."
      primaryAction={{
        label: creating ? "Creating…" : "Create draft",
        onClick: handleCreate,
        disabled: creating || !operatorId,
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: creating }}
    >
      <div className="ogcr-project-wizard">
        {Boolean(error) && (
          <Message
            state="error"
            title="Could not create the activity"
            description={error}
            onDismiss={() => setError("")}
          />
        )}

        <div className="ogcr-project-wizard__body">
          <ActivityDetailsFields
            variant="essential"
            form={form}
            activityType={activityType}
            onFieldChange={handleFieldChange}
            disabled={creating}
          />

          <div className="ogcr-project-wizard__grid ogcr-project-wizard__grid--narrow">
            <Select
              label="Certification scheme"
              value={form.certification_scheme_id || null}
              onValueChange={(value) => handleSchemeChange(value)}
              options={schemeOptions.map(({ value, label, source }) => ({
                value,
                label: source === "sample"
                  ? <span className="flex flex-row items-center gap-4">{label}<Pill tone="warning">Sample</Pill></span>
                  : label,
              }))}
              placeholder="Select a scheme (optional)"
              helperText={schemeHelperText(schemes)}
              disabled={creating}
            />
          </div>
        </div>
      </div>

    </Dialog>
  );
}

export default CreateActivityModal;
