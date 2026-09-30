import { useState } from "react";
import Modal from "../ui/Modal";
import Message from "../ui/Message";
import TextField from "../ui/TextField";
import ParcelCadastrePicker from "./ParcelCadastrePicker";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import Parcel from "../../models/parcel";

const parseCodes = (value) =>
  String(value || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

/** Create or edit a parcel. `parcel` null means create. */
function ParcelFormModal({ isOpen, onClose, onSaved, operatorId, parcel = null }) {
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
      setError(Object.keys(fields).length ? "" : $auth.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="xl"
      title={isEdit ? "Edit parcel" : "Add parcel"}
      subtitle="Parcels stay on the Operator Platform until the activity they belong to is submitted."
      secondaryAction={{ label: "Cancel", onClick: onClose, disabled: saving }}
      primaryAction={{
        label: saving ? "Saving…" : (isEdit ? "Save changes" : "Add parcel"),
        onClick: handleSave,
        disabled: saving || !selection,
      }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message variant="error" floating title="Could not save the parcel" description={error} onClose={() => setError("")} />
        )}

        <ParcelCadastrePicker
          value={selection}
          onChange={setSelection}
          error={fieldErrors.geometry}
          disabled={saving}
        />

        <TextField
          label="Name"
          placeholder="e.g., Field 4"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name || ""}
        />
        <TextField
          label="Cadastral reference"
          placeholder="Confirm a parcel to fill this in"
          value={selection?.idu || ""}
          disabled
          readOnly
          onChange={() => {}}
          error={Boolean(fieldErrors.cadastral_reference)}
          helperText={fieldErrors.cadastral_reference || "Pulled from the cadastre when you confirm a parcel."}
        />
        <TextField
          label="IACS codes"
          placeholder="Comma-separated"
          value={form.iacs_codes}
          onChange={(event) => setForm({ ...form, iacs_codes: event.target.value })}
          error={Boolean(fieldErrors.iacs_codes)}
          helperText={fieldErrors.iacs_codes || ""}
        />
        <TextField
          label="LPIS codes"
          placeholder="Comma-separated"
          value={form.lpis_codes}
          onChange={(event) => setForm({ ...form, lpis_codes: event.target.value })}
          error={Boolean(fieldErrors.lpis_codes)}
          helperText={fieldErrors.lpis_codes || ""}
        />
      </div>
    </Modal>
  );
}

export default ParcelFormModal;
