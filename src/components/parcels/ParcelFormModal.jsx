import { useState } from "react";
import { Input, Message } from "@majistudio/ogcr-design-system";
import Dialog from "../ui/Dialog";
import ParcelCadastrePicker from "./ParcelCadastrePicker";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import Parcel from "../../models/parcel";
import { otherFieldErrors } from "../../services/$api";

// Inputs that show their own error; anything else goes in the banner.
const SHOWN_FIELDS = ["geometry", "name", "cadastral_reference", "iacs_codes", "lpis_codes"];

const parseCodes = (value) =>
  String(value || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

const READ_ONLY_SUBTITLES = {
  registered: "This parcel is registered on DCR and can no longer be changed. Its documents and owner stay editable.",
  submitted: "This parcel belongs to a submitted activity and can no longer be changed.",
};

/**
 * Create or edit a parcel. `parcel` null means create. `readOnly` shows a
 * parcel the API would answer 409 to any change for; `lockedReason` says why:
 * `registered` (the certification platform registered it on DCR) or
 * `submitted` (its activity is submitted and not open for changes).
 */
function ParcelFormModal({
  isOpen,
  onClose,
  onSaved,
  operatorId,
  parcel = null,
  readOnly = false,
  lockedReason = "submitted",
}) {
  const isEdit = Boolean(parcel?.id);

  const [form, setForm] = useState(() => ({
    name: parcel?.name || "",
    iacs_codes: (parcel?.iacs_codes || []).join(", "),
    lpis_codes: (parcel?.lpis_codes || []).join(", "),
  }));
  // Geometry and cadastral reference travel together — both come off the same
  // cadastre feature, so they can never disagree.
  const [selection, setSelection] = useState(() => (parcel?.geometry
    // No label: the stored cadastral reference is the full id, and the summary
    // falls back to it.
    ? { geometry: parcel.geometry, idu: parcel.cadastral_reference || "", label: "" }
    : null));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    setFieldErrors({});

    const model = new Parcel({
      operator: operatorId,
      geometry: selection?.geometry || null,
      name: form.name,
      cadastral_reference: selection?.idu || "",
      iacs_codes: parseCodes(form.iacs_codes),
      lpis_codes: parseCodes(form.lpis_codes),
    });

    const missing = model.missingRequired();
    if (missing.length) {
      setError(missing.includes("geometry")
        ? "Find a parcel on the cadastre and confirm the selection."
        : "A parcel needs an Operator.");
      return;
    }

    setSaving(true);

    try {
      const saved = isEdit
        ? await $parcels.patch(parcel.id, model.toPayload())
        : await $parcels.create(model.toPayload());

      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;

      const fields = $auth.getFieldErrors(err);
      setFieldErrors(fields);
      // Invalid geometries (self-intersections) come back with an explanation.
      setError(Object.keys(fields).length
        ? otherFieldErrors(fields, SHOWN_FIELDS)
        : $auth.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open && !saving) onClose(); }}
      size="xl"
      title={readOnly ? "Parcel" : (isEdit ? "Edit parcel" : "Add parcel")}
      description={readOnly
        ? (READ_ONLY_SUBTITLES[lockedReason] || READ_ONLY_SUBTITLES.submitted)
        : "Parcels stay on the Operator Platform until their activity is submitted; the certification platform then registers them on DCR."}
      primaryAction={readOnly ? undefined : {
        label: saving ? "Saving…" : (isEdit ? "Save changes" : "Add parcel"),
        onClick: handleSave,
        disabled: saving || !selection,
        closeOnClick: false,
      }}
      secondaryAction={{ label: readOnly ? "Close" : "Cancel", disabled: saving }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message state="error" type="floating" title="Could not save the parcel" description={error} onDismiss={() => setError("")} />
        )}

        <ParcelCadastrePicker
          value={selection}
          onChange={setSelection}
          error={fieldErrors.geometry}
          disabled={saving || readOnly}
        />

        <Input
          label="Name"
          placeholder="e.g., Field 4"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          disabled={readOnly}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name || ""}
        />
        <Input
          label="Cadastral reference"
          placeholder="Confirm a parcel to fill this in"
          value={selection?.idu || ""}
          disabled
          readOnly
          onChange={() => {}}
          error={Boolean(fieldErrors.cadastral_reference)}
          helperText={fieldErrors.cadastral_reference || "Pulled from the cadastre when you confirm a parcel."}
        />
        <Input
          label="IACS codes"
          placeholder="Comma-separated"
          value={form.iacs_codes}
          onChange={(event) => setForm({ ...form, iacs_codes: event.target.value })}
          disabled={readOnly}
          error={Boolean(fieldErrors.iacs_codes)}
          helperText={fieldErrors.iacs_codes || ""}
        />
        <Input
          label="LPIS codes"
          placeholder="Comma-separated"
          value={form.lpis_codes}
          onChange={(event) => setForm({ ...form, lpis_codes: event.target.value })}
          disabled={readOnly}
          error={Boolean(fieldErrors.lpis_codes)}
          helperText={fieldErrors.lpis_codes || ""}
        />
      </div>
    </Dialog>
  );
}

export default ParcelFormModal;
