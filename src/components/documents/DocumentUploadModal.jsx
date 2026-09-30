import { useEffect, useRef, useState } from "react";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import Message from "../ui/Message";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import TextField from "../ui/TextField";
import $documents, { DEFAULT_ALLOWED_EXTENSIONS, DEFAULT_MAX_SIZE_MB } from "../../services/$documents";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $reference from "../../services/$reference";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";

const attachOptions = [
  { value: "project", label: "An activity" },
  { value: "parcel", label: "A parcel" },
];

/**
 * Upload is multipart: file, kind, title and exactly one of project / parcel.
 * `newVersionFor` switches the modal to `documents/{id}/versions/` instead.
 *
 * `scopeParcels` pins the modal to one activity: the activity is fixed and the
 * parcel choice is limited to that activity's own parcels, so an upload started
 * inside an activity cannot silently land on something outside it.
 */
function DocumentUploadModal({
  isOpen,
  onClose,
  onUploaded,
  newVersionFor = null,
  defaultProject = "",
  defaultParcel = "",
  scopeParcels = null,
}) {
  const isNewVersion = Boolean(newVersionFor);
  const isScoped = Array.isArray(scopeParcels);
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    kind: "other",
    title: "",
    description: "",
    attachTo: defaultParcel ? "parcel" : "project",
    project: String(defaultProject || ""),
    parcel: String(defaultParcel || ""),
  });

  const [kinds, setKinds] = useState([]);
  const [limits, setLimits] = useState({
    maxSizeMb: DEFAULT_MAX_SIZE_MB,
    allowedExtensions: DEFAULT_ALLOWED_EXTENSIONS,
  });
  const [projects, setProjects] = useState([]);
  const [operatorParcels, setOperatorParcels] = useState([]);

  // Scoped to an activity, the parcel choices are handed in; otherwise they are
  // every parcel the Operator holds.
  const parcels = isScoped ? scopeParcels : operatorParcels;

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    // The size limit and extension list are served by the API — never hard-coded.
    $reference.all()
      .then((reference) => {
        if (cancelled) return;
        setKinds(toList(reference?.document_kinds));
        setLimits({
          maxSizeMb: reference?.document_max_size_mb ?? DEFAULT_MAX_SIZE_MB,
          allowedExtensions: toList(reference?.document_allowed_extensions).length
            ? reference.document_allowed_extensions
            : DEFAULT_ALLOWED_EXTENSIONS,
        });
      })
      .catch(() => {});

    // Scoped to an activity, the options are already known — no need to pull
    // every project and parcel the Operator has.
    if (!isNewVersion && !isScoped) {
      $projects.listAll({ ordering: "name" })
        .then((rows) => { if (!cancelled) setProjects(rows); })
        .catch(() => {});
      $parcels.listAll({ ordering: "name" })
        .then((rows) => { if (!cancelled) setOperatorParcels(rows); })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [isOpen, isNewVersion, isScoped]);

  const pickFile = (event) => {
    const picked = event.target.files?.[0] || null;
    setFile(picked);
    setError("");

    // Offer the filename as the title so the field is rarely left empty.
    if (picked && !form.title) {
      setForm((current) => ({ ...current, title: picked.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleUpload = async () => {
    setError("");
    setFieldErrors({});

    const problem = $documents.validate(file, limits);
    if (problem) {
      setError(problem);
      return;
    }

    if (!isNewVersion) {
      if (!form.title.trim()) {
        setFieldErrors({ title: "Give the document a title." });
        return;
      }

      const target = form.attachTo === "parcel" ? form.parcel : form.project;
      if (!target) {
        setError(`Choose which ${form.attachTo === "parcel" ? "parcel" : "activity"} this document belongs to.`);
        return;
      }
    }

    setBusy(true);
    setProgress(0);

    const onUploadProgress = (event) => {
      if (!event.total) return;
      setProgress(Math.round((event.loaded / event.total) * 100));
    };

    try {
      const saved = isNewVersion
        ? await $documents.addVersion(newVersionFor.id, file, { onUploadProgress })
        : await $documents.upload({
          file,
          kind: form.kind,
          title: form.title.trim(),
          description: form.description,
          ...(form.attachTo === "parcel"
            ? { parcel: form.parcel }
            : { project: form.project }),
        }, { onUploadProgress });

      onUploaded?.(saved);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;

      const fields = $auth.getFieldErrors(err);
      setFieldErrors(fields);
      setError(Object.keys(fields).length ? "" : $auth.getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const kindOptions = kinds.length
    ? kinds.map((kind) => ({ value: kind.value, label: kind.label }))
    : [{ value: "other", label: "Other" }];

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      size="md"
      title={isNewVersion ? "Upload a new version" : "Upload document"}
      subtitle={isNewVersion
        ? `${newVersionFor.title} — the current version is kept and superseded.`
        : "Documents are private: they are only ever fetched through the API."}
      secondaryAction={{ label: "Cancel", onClick: onClose, disabled: busy }}
      primaryAction={{
        label: busy ? `Uploading… ${progress}%` : "Upload",
        onClick: handleUpload,
        disabled: busy || !file,
      }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message variant="error" floating title="Upload failed" description={error} onClose={() => setError("")} />
        )}

        <div className="flex flex-row items-center gap-2">
          <Button
            variant="outlined"
            size="sm"
            disabled={busy}
            startIcon={<UploadSimpleIcon size={16} />}
            onClick={() => fileInput.current?.click()}
          >
            Choose file
          </Button>
          <span className="ogcr-input__helper">
            {file
              ? `${file.name} — ${(file.size / (1024 * 1024)).toFixed(2)} MB`
              : `Max ${limits.maxSizeMb} MB · ${limits.allowedExtensions.join(", ")}`}
          </span>
        </div>

        <input
          ref={fileInput}
          type="file"
          style={{ display: "none" }}
          accept={limits.allowedExtensions.map((extension) => `.${extension}`).join(",")}
          onChange={pickFile}
        />

        {!isNewVersion && (
          <>
            <TextField
              required
              label="Title"
              placeholder="What is this document?"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              error={Boolean(fieldErrors.title)}
              helperText={fieldErrors.title || ""}
            />
            <Select
              label="Kind"
              value={form.kind}
              options={kindOptions}
              onChange={(event) => setForm({ ...form, kind: event.target.value })}
              helperText={fieldErrors.kind || ""}
            />
            <TextField
              label="Description"
              placeholder="Optional"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <Select
              label="Attach to"
              value={form.attachTo}
              options={attachOptions}
              onChange={(event) => setForm({ ...form, attachTo: event.target.value })}
              helperText={isScoped
                ? "A document belongs to exactly one record — this activity, or one of its parcels."
                : "A document belongs to exactly one activity or one parcel."}
            />
            {form.attachTo === "project" ? (
              isScoped ? null : (
                <Select
                  label="Activity"
                  value={form.project}
                  placeholder={projects.length ? "Select an activity" : "No activities yet"}
                  options={projects.map((project) => ({ value: String(project.id), label: project.name }))}
                  onChange={(event) => setForm({ ...form, project: event.target.value })}
                />
              )
            ) : (
              <Select
                label="Parcel"
                value={form.parcel}
                placeholder={parcels.length
                  ? "Select a parcel"
                  : (isScoped ? "This activity has no parcels yet" : "No parcels yet")}
                options={parcels.map((parcel) => ({
                  value: String(parcel.id),
                  label: parcel.name || parcel.cadastral_reference || `Parcel ${parcel.id}`,
                }))}
                onChange={(event) => setForm({ ...form, parcel: event.target.value })}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export default DocumentUploadModal;
