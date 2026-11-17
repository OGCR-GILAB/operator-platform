import { useEffect, useMemo, useState } from "react";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button, Input, Message, Pill, Select } from "@majistudio/ogcr-design-system";
import Dialog from "../ui/Dialog";
import { SkeletonField } from "../ui/Skeleton";
import DocumentUploadModal from "../documents/DocumentUploadModal";
import LandRegistryOwners from "./LandRegistryOwners";
import $parcels from "../../services/$parcels";
import $documents from "../../services/$documents";
import $reference from "../../services/$reference";
import $auth from "../../services/$auth";
import { otherFieldErrors } from "../../services/$api";
import { OwnerVerification, ParcelOwner } from "../../models/parcel";
import {
  OWNER_TYPE_LABELS,
  formatDate,
  ownerSyncOf,
  parcelLabelOf,
  registryMatchOf,
  syncLabel,
  syncTone,
  verificationLabel,
} from "../projects/projectPresentation";

// Inputs of the owner form that show their own error; the rest go in the banner.
const OWNER_FIELDS = ["legal_name", "owner_type", "country_code", "document"];

const EMPTY_OWNER = { legal_name: "", owner_type: "", country_code: "", document: "" };
const EMPTY_VERIFICATION = {
  status_code: "in_progress",
  authority: "",
  parcel_owner_legal_name: "",
  status_message: "",
};

const ownerTypeOptions = ParcelOwner.OWNER_TYPES.map((value) => ({
  value,
  label: OWNER_TYPE_LABELS[value],
}));

/**
 * The codes the operator can set. A verdict mirrored from DCR may be another
 * one (`pending`, `under_review`), which is added so the read-only select
 * still shows it.
 */
const statusOptionsFor = (current) => {
  const codes = [...OwnerVerification.STATUS_CODES];
  if (current && !codes.includes(current)) codes.push(current);
  return codes.map((value) => ({ value, label: verificationLabel(value) }));
};

const ownerFormOf = (record) => (record ? {
  legal_name: record.legal_name || "",
  owner_type: record.owner_type || "",
  country_code: record.country_code || "",
  document: record.document != null ? String(record.document) : "",
} : EMPTY_OWNER);

const verificationFormOf = (record) => (record ? {
  status_code: record.status_code || "in_progress",
  authority: record.authority || "",
  parcel_owner_legal_name: record.parcel_owner_legal_name || "",
  status_message: record.status_message || "",
} : EMPTY_VERIFICATION);

// The "no document" row: Select values cannot be empty.
const NO_DOCUMENT = "none";

const sameForm = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isBlank = (form) => Object.values(form).every((value) => !String(value || "").trim());

/** A `404` means nothing is recorded yet; anything else is a real failure. */
const softGet = (request) => request.catch((err) => {
  if (err?.response?.status === 404) return null;
  throw err;
});

/**
 * Everything about who owns a parcel, in one dialog:
 *
 * - **Declared owner** (`parcels/{id}/owner/`, DCR `parcel_owner`): who the
 *   operator says owns the parcel, backed by a deed or cadastre extract
 *   uploaded to it. It goes to DCR once the certification platform has
 *   registered the parcel, and stays editable until the certifier's
 *   verification is final (`409` after that) — also after submit.
 * - **Land registry** (`parcels/{id}/registry-owners/`, French parcels only):
 *   the legal-person holders the registry knows, read-only, with whether the
 *   declared owner matches — what the auditor will compare.
 * - **Owner verification** (`parcels/{id}/owner-verification/`): preparation
 *   data the certifier replaces with its own verdict. Once `dcr-status`
 *   mirrors that verdict back, it is shown read-only.
 */
function ParcelOwnershipModal({ isOpen, onClose, parcel, submitted = false, onSaved }) {
  const [owner, setOwner] = useState(null);
  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER);
  const [ownerSaved, setOwnerSaved] = useState(EMPTY_OWNER);
  const [ownerErrors, setOwnerErrors] = useState({});
  // The certifier's verification is final: the API refuses any change.
  const [ownerLocked, setOwnerLocked] = useState(false);

  const [verification, setVerification] = useState(null);
  const [verificationForm, setVerificationForm] = useState(EMPTY_VERIFICATION);
  const [verificationSaved, setVerificationSaved] = useState(EMPTY_VERIFICATION);

  // `null` hides the section: no French cadastral reference (`404`), or not loaded yet.
  const [registry, setRegistry] = useState(null);
  const [registryError, setRegistryError] = useState("");

  const [documents, setDocuments] = useState([]);
  const [countries, setCountries] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !parcel?.id) return undefined;

    let cancelled = false;

    Promise.all([
      softGet($parcels.owner(parcel.id)),
      softGet($parcels.ownerVerification(parcel.id)),
      // Current versions only: an owner can only point at a current document.
      $documents.listAll({ parcel: parcel.id }).catch(() => []),
    ])
      .then(([ownerRecord, verificationRecord, parcelDocuments]) => {
        if (cancelled) return;
        setOwner(ownerRecord);
        setOwnerForm(ownerFormOf(ownerRecord));
        setOwnerSaved(ownerFormOf(ownerRecord));
        setVerification(verificationRecord);
        setVerificationForm(verificationFormOf(verificationRecord));
        setVerificationSaved(verificationFormOf(verificationRecord));
        setDocuments(parcelDocuments || []);
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Information only: its failure never stands in the way of the declaration.
    softGet($parcels.registryOwners(parcel.id))
      .then((record) => {
        if (cancelled) return;
        setRegistry(record);
        setRegistryError("");
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setRegistry({});
        setRegistryError($auth.getErrorMessage(err));
      });

    // Every ISO country, not the curated activity list: an owner can live anywhere.
    $reference.countries()
      .then((rows) => {
        if (cancelled) return;
        setCountries(rows
          .map((country) => ({ value: country.code, label: country.name || country.code }))
          .sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [isOpen, parcel?.id]);

  // Deeds and cadastre extracts — plus whatever the owner already points at,
  // so a declaration made against another kind still shows its document.
  const documentOptions = useMemo(() => {
    const options = documents
      .filter((doc) => ParcelOwner.PROOF_KINDS.includes(doc.kind)
        || String(doc.id) === ownerForm.document)
      .map((doc) => ({ value: String(doc.id), label: doc.title || doc.original_name || `Document ${doc.id}` }));

    if (ownerForm.document && !options.some((option) => option.value === ownerForm.document)) {
      options.push({ value: ownerForm.document, label: owner?.document_title || `Document ${ownerForm.document}` });
    }

    return [{ value: NO_DOCUMENT, label: "None yet" }, ...options];
  }, [documents, ownerForm.document, owner?.document_title]);

  // Mirrored from DCR: the certifier's record, not ours to edit.
  const verificationFromDcr = verification?.dcr_sync_status === "synced";

  const ownerDirty = !sameForm(ownerForm, ownerSaved);
  const verificationDirty = !verificationFromDcr && !sameForm(verificationForm, verificationSaved);

  const ownerSync = ownerSyncOf(owner, { submitted });
  // The registry compares the saved declaration, so unsaved edits hide it.
  const registryMatch = !ownerDirty && !registryError ? registryMatchOf(registry?.matches_declared) : null;

  const setOwnerField = (field, value) => {
    setOwnerForm((current) => ({ ...current, [field]: value }));
    setOwnerErrors((current) => ({ ...current, [field]: "" }));
  };

  // A registry owner (`P`) as the declaration; the deed stays the operator's choice.
  const applyRegistryOwner = (holder) => {
    setOwnerForm((current) => ({
      ...current,
      legal_name: holder.legal_name || "",
      owner_type: holder.suggested_owner_type || "",
      country_code: "FR",
    }));
    setOwnerErrors((current) => ({ ...current, legal_name: "", owner_type: "", country_code: "" }));
  };

  // `matches_declared` follows the declaration; read it again once that changes.
  const refreshRegistry = () => {
    softGet($parcels.registryOwners(parcel.id))
      .then((record) => {
        setRegistry(record);
        setRegistryError("");
      })
      .catch(() => {});
  };

  const saveOwner = async () => {
    // Nothing declared and nothing typed: there is no owner to save.
    if (!owner && isBlank(ownerForm)) return null;

    const model = new ParcelOwner({
      legal_name: ownerForm.legal_name.trim(),
      owner_type: ownerForm.owner_type,
      country_code: ownerForm.country_code,
      document: ownerForm.document ? Number(ownerForm.document) : null,
    });

    const missing = ParcelOwner.REQUIRED.filter((field) => !model[field]);
    if (missing.length) {
      setOwnerErrors(Object.fromEntries(missing.map((field) => [field, "Required for the declaration."])));
      throw new Error("Fill in the owner's name, type and country, or clear the owner fields.");
    }

    try {
      const saved = await $parcels.saveOwner(parcel.id, model.toPayload());
      setOwner(saved);
      setOwnerForm(ownerFormOf(saved));
      setOwnerSaved(ownerFormOf(saved));
      if (registry) refreshRegistry();
      return saved;
    } catch (err) {
      if (err?.response?.status === 409) {
        setOwnerLocked(true);
        throw new Error(
          "The certifier's verification of this parcel is final, so its owner can no longer be changed.",
          { cause: err },
        );
      }

      const fields = $auth.getFieldErrors(err);
      setOwnerErrors(fields);
      if (Object.keys(fields).length) {
        throw new Error(
          otherFieldErrors(fields, OWNER_FIELDS) || "Check the highlighted owner fields.",
          { cause: err },
        );
      }
      throw err;
    }
  };

  const saveVerification = async () => {
    const saved = await $parcels.saveOwnerVerification(
      parcel.id,
      new OwnerVerification(verificationForm).toPayload(),
    );
    setVerification(saved);
    setVerificationForm(verificationFormOf(saved));
    setVerificationSaved(verificationFormOf(saved));
    return saved;
  };

  const handleSave = async () => {
    if (!ownerDirty && !verificationDirty) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");

    let savedOwner = null;

    try {
      if (ownerDirty) savedOwner = await saveOwner();
    } catch (err) {
      setSaving(false);
      if (err?.response?.status === 401) return;
      setError(err?.response ? $auth.getErrorMessage(err) : err.message);
      return;
    }

    try {
      const savedVerification = verificationDirty ? await saveVerification() : null;
      onSaved?.({ owner: savedOwner, verification: savedVerification });
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;
      const message = $auth.getErrorMessage(err);
      setError(savedOwner
        ? `The owner was saved, but the verification was not: ${message}`
        : message);
      // The owner is in; the list behind the dialog should say so.
      if (savedOwner) onSaved?.({ owner: savedOwner, verification: null, partial: true });
    } finally {
      setSaving(false);
    }
  };

  const ownerDisabled = saving || ownerLocked;
  const verificationDisabled = saving || verificationFromDcr;

  return (
    <Dialog
      open={isOpen}
      // The deed upload is nested inside; closing it must not close this one.
      onOpenChange={(open) => { if (!open && !saving && !uploading) onClose(); }}
      size="l"
      title="Ownership"
      description={parcelLabelOf(parcel)}
      primaryAction={{
        label: saving ? "Saving…" : "Save",
        onClick: handleSave,
        disabled: saving || loading || (!ownerDirty && !verificationDirty),
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: saving }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message state="error" type="floating" title="Could not save" description={error} onDismiss={() => setError("")} />
        )}

        {loading ? (
          <>
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </>
        ) : (
          <>
            <section className="ogcr-form-section" aria-labelledby="ownership-owner-title">
              <div className="ogcr-form-section__header">
                <h4 id="ownership-owner-title" className="ogcr-form-section__title">Declared owner</h4>
                <span className="ogcr-form-section__badges">
                  {registryMatch && <Pill tone={registryMatch.tone}>{registryMatch.label}</Pill>}
                  {owner && owner.is_complete === false && <Pill tone="warning">Incomplete</Pill>}
                  <Pill tone={ownerSync.tone}>{ownerSync.label}</Pill>
                </span>
              </div>

              {ownerLocked ? (
                <Message
                  state="neutral"
                  title="Verification is final"
                  description="The certifier has concluded the verification of this parcel, so its owner can no longer be changed."
                />
              ) : (
                <p className="text-body-s ogcr-card__subtitle">
                  Who owns this parcel, with the deed or cadastre extract that shows it. It goes to DCR
                  once the parcel is registered there, and the certifier verifies it later. You can
                  change it until that verification is final.
                </p>
              )}

              <Input
                label="Legal name"
                placeholder="As it appears on the deed"
                value={ownerForm.legal_name}
                disabled={ownerDisabled}
                onChange={(event) => setOwnerField("legal_name", event.target.value)}
                errorText={ownerErrors.legal_name || undefined}
              />
              <Select
                label="Owner type"
                value={ownerForm.owner_type || null}
                placeholder="Select a type"
                disabled={ownerDisabled}
                options={ownerTypeOptions}
                onValueChange={(value) => setOwnerField("owner_type", value || "")}
                errorText={ownerErrors.owner_type || undefined}
              />
              <Select
                label="Country"
                value={ownerForm.country_code || null}
                placeholder={countries.length ? "Select a country" : "Loading countries…"}
                disabled={ownerDisabled}
                options={countries}
                onValueChange={(value) => setOwnerField("country_code", value || "")}
                helperText="Of the owner's address."
                errorText={ownerErrors.country_code || undefined}
              />
              <Select
                label="Supporting document"
                value={ownerForm.document || NO_DOCUMENT}
                disabled={ownerDisabled}
                options={documentOptions}
                onValueChange={(value) => setOwnerField("document", value && value !== NO_DOCUMENT ? value : "")}
                helperText="A deed (ownership proof) or cadastral extract uploaded to this parcel. It can be added later."
                errorText={ownerErrors.document || undefined}
              />
              <div>
                <Button
                  variant="text"
                  size="s"
                  disabled={ownerDisabled}
                  iconLeft={<UploadSimpleIcon size={16} />}
                  onClick={() => setUploading(true)}
                >
                  Upload a deed
                </Button>
              </div>
            </section>

            {registry && (
              <LandRegistryOwners
                registry={registry}
                error={registryError}
                canUse={!ownerDisabled}
                onUse={applyRegistryOwner}
              />
            )}

            <section className="ogcr-form-section" aria-labelledby="ownership-verification-title">
              <div className="ogcr-form-section__header">
                <h4 id="ownership-verification-title" className="ogcr-form-section__title">
                  Verification (preparation data)
                </h4>
                {verification && <Pill tone={syncTone(verification)}>{syncLabel(verification)}</Pill>}
              </div>

              <p className="text-body-s ogcr-card__subtitle">
                {verificationFromDcr
                  ? `The certifier's verdict, mirrored from DCR${verification?.dcr_synced_at ? ` (${formatDate(verification.dcr_synced_at)})` : ""}. It can no longer be edited here.`
                  : "Not sent to DCR. The certifier records the verification on DCR, and its verdict replaces these values once it comes back."}
              </p>

              <Select
                label="Status"
                value={verificationForm.status_code || null}
                disabled={verificationDisabled}
                options={statusOptionsFor(verificationForm.status_code)}
                onValueChange={(value) => setVerificationForm({ ...verificationForm, status_code: value || "" })}
              />
              <Input
                label="Authority"
                placeholder="Who verified the ownership?"
                value={verificationForm.authority}
                disabled={verificationDisabled}
                onChange={(event) => setVerificationForm({ ...verificationForm, authority: event.target.value })}
              />
              <Input
                label="Owner legal name"
                placeholder="As it appears on the record"
                value={verificationForm.parcel_owner_legal_name}
                disabled={verificationDisabled}
                onChange={(event) => setVerificationForm({
                  ...verificationForm,
                  parcel_owner_legal_name: event.target.value,
                })}
              />
              <Input
                label="Notes"
                placeholder="Anything the certifier should know"
                value={verificationForm.status_message}
                disabled={verificationDisabled}
                onChange={(event) => setVerificationForm({ ...verificationForm, status_message: event.target.value })}
              />
            </section>
          </>
        )}
      </div>

      {uploading && (
        <DocumentUploadModal
          isOpen
          onClose={() => setUploading(false)}
          scopeParcels={[parcel]}
          defaultParcel={parcel.id}
          defaultKind="ownership_proof"
          onUploaded={(saved) => {
            if (!saved?.id) return;
            setDocuments((current) => [saved, ...current.filter((doc) => doc.id !== saved.id)]);
            setOwnerField("document", String(saved.id));
          }}
        />
      )}
    </Dialog>
  );
}

export default ParcelOwnershipModal;
