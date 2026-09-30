import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Message from "../ui/Message";
import Pill from "../ui/Pill";
import { SkeletonField } from "../ui/Skeleton";
import Select from "../ui/Select";
import TextField from "../ui/TextField";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import { OwnerVerification } from "../../models/parcel";
import { formatDate, syncLabel, syncTone } from "../projects/projectPresentation";

const statusOptions = [
  { value: "in_progress", label: "In progress" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
];

/**
 * `parcels/{id}/owner-verification/` — a single object; no field is required.
 * Preparation data only: submit does not send it (the certifier writes it on
 * DCR), so it is never frozen by a submit. Once `dcr-status` mirrors DCR's
 * verdict back, the record is DCR's and is shown read-only.
 */
function OwnerVerificationModal({ isOpen, onClose, parcel, onSaved }) {
  const [form, setForm] = useState({
    status_code: "in_progress",
    authority: "",
    parcel_owner_legal_name: "",
    status_message: "",
  });
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !parcel?.id) return;

    let cancelled = false;

    $parcels.ownerVerification(parcel.id)
      .then((record) => {
        if (cancelled) return;
        setRecord(record || null);
        if (record) {
          setForm({
            status_code: record.status_code || "in_progress",
            authority: record.authority || "",
            parcel_owner_legal_name: record.parcel_owner_legal_name || "",
            status_message: record.status_message || "",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 just means nothing has been recorded yet.
        if (err?.response?.status !== 404 && err?.response?.status !== 401) {
          setError($auth.getErrorMessage(err));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, parcel?.id]);

  // Mirrored from DCR: the certifier's record, not ours to edit.
  const fromDcr = record?.dcr_sync_status === "synced";

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const saved = await $parcels.saveOwnerVerification(
        parcel.id,
        new OwnerVerification(form).toPayload(),
      );
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;
      setError($auth.getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      size="md"
      title="Ownership verification"
      subtitle={parcel?.name || parcel?.cadastral_reference || `Parcel ${parcel?.id ?? ""}`}
      secondaryAction={{ label: "Cancel", onClick: onClose, disabled: saving }}
      primaryAction={{
        label: saving ? "Saving…" : "Save",
        onClick: handleSave,
        disabled: saving || loading || fromDcr,
      }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message variant="error" floating title="Could not save" description={error} onClose={() => setError("")} />
        )}

        {/*
          Four placeholder fields, not a spinner: the dialog is already sized
          for the form, so it does not grow out from under the cursor when the
          verification lands.
        */}
        {!loading && (fromDcr ? (
          <Message
            variant="info"
            title="Recorded on DCR"
            description={`These values come from the registry's verdict${record?.dcr_synced_at ? ` (${formatDate(record.dcr_synced_at)})` : ""} and can no longer be edited here.`}
          />
        ) : (
          <Message
            variant="info"
            title="Preparation data"
            description="This is not sent to DCR on submit. The certifier records the owner verification on DCR, and its verdict replaces these values once it comes back."
          />
        ))}

        {!loading && record && (
          <div>
            <Pill tone={syncTone(record)}>{syncLabel(record)}</Pill>
          </div>
        )}

        {loading ? (
          <>
            <SkeletonField />
            <SkeletonField delay={80} />
            <SkeletonField delay={160} />
            <SkeletonField delay={240} />
          </>
        ) : (
          <>
            <Select
              label="Status"
              value={form.status_code}
              disabled={fromDcr}
              options={statusOptions}
              onChange={(event) => setForm({ ...form, status_code: event.target.value })}
            />
            <TextField
              label="Authority"
              placeholder="Who verified the ownership?"
              value={form.authority}
              disabled={fromDcr}
              onChange={(event) => setForm({ ...form, authority: event.target.value })}
            />
            <TextField
              label="Owner legal name"
              placeholder="As it appears on the record"
              value={form.parcel_owner_legal_name}
              disabled={fromDcr}
              onChange={(event) => setForm({ ...form, parcel_owner_legal_name: event.target.value })}
            />
            <TextField
              label="Notes"
              placeholder="Anything the certifier should know"
              value={form.status_message}
              disabled={fromDcr}
              onChange={(event) => setForm({ ...form, status_message: event.target.value })}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

export default OwnerVerificationModal;
