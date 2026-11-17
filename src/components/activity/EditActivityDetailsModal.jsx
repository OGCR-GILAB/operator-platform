import { useState } from "react";
import { Message } from "@majistudio/ogcr-design-system";
import ActivityDetailsFields from "../projects/ActivityDetailsFields";
import {
  activityDetailsFormFrom,
  activityDetailsPayload,
  validateActivityDetails,
} from "../projects/activityDetails";
import $projects from "../../services/$projects";
import $auth from "../../services/$auth";
import { UNIT_TYPE_TO_ACTIVITY_TYPE } from "../../services/$reference";
import Dialog from "../ui/Dialog";

/**
 * Edit the descriptive fields of a draft or ready activity — the same fields
 * the create wizard asks for. A PATCH, so the plans, parcels and scheme are
 * left alone; a submitted activity answers 409.
 */
function EditActivityDetailsModal({ activity, onClose, onSaved }) {
  const [form, setForm] = useState(() => activityDetailsFormFrom(activity));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState(null);

  // `unit_types` implies `type`; an activity with no unit type keeps its own.
  const activityType = UNIT_TYPE_TO_ACTIVITY_TYPE[form.unit_types] || activity.type || null;

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const invalid = validateActivityDetails(form);
    if (invalid) {
      setProblem(invalid);
      return;
    }

    setSaving(true);
    setProblem(null);

    try {
      const saved = await $projects.patch(
        activity.id,
        activityDetailsPayload(form, { activityType, clearEmpty: true }),
      );
      onSaved?.(saved);
    } catch (err) {
      if (err?.response?.status === 401) return;

      const fields = $auth.getFieldErrors(err);
      const fieldMessages = Object.entries(fields).map(([field, message]) => `${field}: ${message}`);

      setProblem(err?.response?.status === 409
        ? {
          title: "This activity is read-only",
          description: "It has been submitted to DCR, so its details can no longer be changed.",
        }
        : {
          title: "Could not save the details",
          description: fieldMessages.length ? fieldMessages.join(" · ") : $auth.getErrorMessage(err),
        });
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open && !saving) onClose(); }}
      size="xl"
      title="Edit activity details"
      description="Changes stay on this platform until the activity is submitted to DCR."
      primaryAction={{
        label: saving ? "Saving…" : "Save details",
        onClick: handleSave,
        disabled: saving,
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: saving }}
    >
      <div className="ogcr-project-wizard__body">
        {problem && (
          <Message
            state="error"
            title={problem.title}
            description={problem.description}
            onDismiss={() => setProblem(null)}
          />
        )}

        <ActivityDetailsFields
          form={form}
          activityType={activityType}
          onFieldChange={handleFieldChange}
          disabled={saving}
        />
      </div>
    </Dialog>
  );
}

export default EditActivityDetailsModal;
