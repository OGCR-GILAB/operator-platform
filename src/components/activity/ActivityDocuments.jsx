import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import DataTable from "../ui/DataTable";
import Message from "../ui/Message";
import Modal from "../ui/Modal";
import Pill from "../ui/Pill";
import Select from "../ui/Select";
import TextField from "../ui/TextField";
import ActivityTabHeader from "./ActivityTabHeader";
import DocumentUploadModal from "../documents/DocumentUploadModal";
import { useActivity } from "./ActivityContext";
import { useToast } from "../providers/ToastContext";
import $documents from "../../services/$documents";
import $projects from "../../services/$projects";
import $reference from "../../services/$reference";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import OGCRDocument, { syncStateOf } from "../../models/document";
import { formatDate, syncLabel, syncTone } from "../projects/projectPresentation";

const forwardStatusOptions = [
  { value: "", label: "Any DCR state" },
  { value: "local", label: "Local only" },
  { value: "forwarded", label: "Forwarded" },
  { value: "failed", label: "Failed" },
];

const parcelLabelOf = (parcel) =>
  parcel?.name || parcel?.cadastral_reference || (parcel?.id ? `Parcel ${parcel.id}` : "—");

/**
 * Every piece of evidence this activity relies on. A document hangs off either
 * the activity or one of its parcels — the API enforces exactly one — so both
 * are gathered here and shown as two groups rather than split across two tabs.
 */
function ActivityDocuments() {
  const { activityId, editable, reload: reloadActivity } = useActivity();
  const { showToast } = useToast();

  const [activityDocs, setActivityDocs] = useState([]);
  const [parcelDocs, setParcelDocs] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [kinds, setKinds] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [forwardStatus, setForwardStatus] = useState("");
  const [allVersions, setAllVersions] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [newVersionFor, setNewVersionFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    $reference.all()
      .then((reference) => { if (!cancelled) setKinds(toList(reference?.document_kinds)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activityId) return undefined;

    let cancelled = false;

    const params = { ordering: "-uploaded_at", ...(allVersions ? { all_versions: 1 } : {}) };

    // The parcels have to land first: their ids are what the second wave of
    // document requests is keyed on.
    $projects.allParcels(activityId)
      .then(async (links) => {
        const linkedParcels = links.map((link) => link.parcel_detail || { id: link.parcel });

        const [own, ...perParcel] = await Promise.all([
          $documents.list({ project: activityId, ...params }),
          ...linkedParcels.map((parcel) =>
            $documents.list({ parcel: parcel.id, ...params }).catch(() => null)),
        ]);

        if (cancelled) return;

        setParcels(linkedParcels);
        setActivityDocs(toList(own).map((row) => new OGCRDocument(row)));
        setParcelDocs(
          perParcel.flatMap((data, index) =>
            toList(data).map((row) => Object.assign(new OGCRDocument(row), {
              parcelLabel: parcelLabelOf(linkedParcels[index]),
            }))),
        );
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [activityId, allVersions, reloadToken]);

  // Files are private, so a download is a fetch with the auth header, not a link.
  const handleDownload = async (row) => {
    setDownloadingId(row.id);

    try {
      await $documents.saveToDisk(row.id, row.original_name || row.title || "document");
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({ variant: "error", title: "Download failed", description: $auth.getErrorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await $documents.remove(deleting.id);
      showToast({ variant: "success", title: "Document deleted", description: `${deleting.title} has been removed.` });
      setDeleting(null);
      reload();
      reloadActivity();
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({ variant: "error", title: "Could not delete", description: $auth.getErrorMessage(err) });
      setDeleting(null);
    }
  };

  const kindLabels = useMemo(
    () => Object.fromEntries(kinds.map((item) => [item.value, item.label])),
    [kinds],
  );

  // Both groups are small — filtering in the browser beats a round trip per
  // keystroke, and keeps the two lists in step with one another.
  const applyFilters = useCallback(
    (rows) => rows.filter((row) => {
      if (kind && row.kind !== kind) return false;
      if (forwardStatus && syncStateOf(row) !== forwardStatus) return false;

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${row.title || ""} ${row.description || ""} ${row.original_name || ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    }),
    [kind, forwardStatus, search],
  );

  const visibleActivityDocs = useMemo(() => applyFilters(activityDocs), [applyFilters, activityDocs]);
  const visibleParcelDocs = useMemo(() => applyFilters(parcelDocs), [applyFilters, parcelDocs]);

  const baseColumns = useMemo(
    () => [
      { id: "title", accessorKey: "title", header: "Title" },
      {
        id: "kind",
        accessorKey: "kind",
        header: "Kind",
        cell: ({ getValue }) => <span>{kindLabels[getValue()] || getValue() || "—"}</span>,
      },
      {
        id: "version",
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => (
          <span>
            v{row.original.version ?? 1}
            {row.original.is_current === false ? " (superseded)" : ""}
          </span>
        ),
      },
      {
        id: "size",
        accessorKey: "size",
        header: "Size",
        cell: ({ row }) => <span>{row.original.sizeLabel || "—"}</span>,
      },
      {
        id: "sync",
        accessorFn: (row) => syncStateOf(row),
        header: "DCR",
        cell: ({ row }) => <Pill tone={syncTone(row.original)}>{syncLabel(row.original)}</Pill>,
      },
      {
        id: "uploaded",
        accessorKey: "uploaded_at",
        header: "Uploaded",
        cell: ({ getValue }) => <span>{formatDate(getValue())}</span>,
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-row gap-1">
            <Button
              variant="text"
              size="sm"
              disabled={downloadingId === row.original.id}
              startIcon={<DownloadSimpleIcon size={16} />}
              onClick={() => handleDownload(row.original)}
            >
              {downloadingId === row.original.id ? "…" : "Download"}
            </Button>
            <Button
              variant="text"
              size="sm"
              disabled={row.original.is_frozen || !editable}
              onClick={() => setNewVersionFor(row.original)}
            >
              New version
            </Button>
            <Button
              variant="text"
              size="sm"
              tone="warning"
              disabled={row.original.is_frozen || !editable}
              onClick={() => setDeleting(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    // handleDownload closes over `downloadingId`, which is in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kindLabels, downloadingId, editable],
  );

  // The parcel group needs one column the activity group does not.
  const parcelColumns = useMemo(
    () => [
      baseColumns[0],
      { id: "parcel", accessorKey: "parcelLabel", header: "Parcel" },
      ...baseColumns.slice(1),
    ],
    [baseColumns],
  );

  const hasFilters = Boolean(search || kind || forwardStatus);

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="Evidence attached to this activity and to its parcels"
        actions={(
          <>
            <Button variant="text" onClick={reload} startIcon={<ArrowClockwiseIcon size={16} />}>
              Refresh
            </Button>
            <Button
              variant="filled"
              tone="brand"
              startIcon={<UploadSimpleIcon size={16} weight="bold" />}
              disabled={!editable}
              onClick={() => setUploading(true)}
            >
              Upload Document
            </Button>
          </>
        )}
      />

      {editable && (
        <Message
          variant="info"
          title="Documents travel with the submission"
          description="On submit, every current document on this activity and its parcels is attached to the parcel–activity verification, including ownership proofs. Upload what the verifiers need before you submit — files added afterwards are not part of it."
        />
      )}

      {Boolean(error) && (
        <Message variant="error" title="Could not load documents" description={error} onClose={() => setError("")} />
      )}

      {/*
        The toolbar is part of the tab, not part of the result: it stays put
        while the documents load, so filtering does not tear the page down and
        rebuild it. Only the rows below are unknown, and they say so in place.
      */}
      <section className="ogcr-projects__table-section">
        {/* Same toolbar as the activities list: search, then the state
            filter as chips. It filters both tables below. */}
        <div className="ogcr-projects__toolbar">
          <TextField
            className="ogcr-projects__search"
            value={search}
            placeholder="Search documents by title or description…"
            aria-label="Search documents"
            startIcon={<MagnifyingGlassIcon size={16} />}
            endIcon={search ? (
              <button
                type="button"
                className="ogcr-projects__search-clear"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <XIcon size={14} weight="bold" />
              </button>
            ) : null}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="ogcr-projects__view-toggle" role="group" aria-label="Filter by DCR state">
            {forwardStatusOptions.map((option) => (
              <button
                key={option.value || "any"}
                type="button"
                className={`ogcr-projects__view-btn${forwardStatus === option.value ? " active" : ""}`}
                aria-pressed={forwardStatus === option.value}
                onClick={() => setForwardStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Kinds come from the API and there are eight of them — too many
              for chips, so this one stays a select. */}
          <Select
            className="ogcr-projects__toolbar-select"
            value={kind}
            aria-label="Filter by kind"
            options={[
              { value: "", label: "All kinds" },
              ...kinds.map((item) => ({ value: item.value, label: item.label })),
            ]}
            onChange={(event) => setKind(event.target.value)}
          />

          <Checkbox
            label="Superseded"
            checked={allVersions}
            onChange={(event) => { setStatus("loading"); setAllVersions(event.target.checked); }}
          />
        </div>

        <h3 className="ogcr-activity-tab__section-title">
          Attached to the activity
          <span className="ogcr-activity-tab__count">({visibleActivityDocs.length})</span>
        </h3>
        <DataTable
          columns={baseColumns}
          data={visibleActivityDocs}
          loading={status === "loading"}
          ariaLabel="Activity documents table"
          emptyText={hasFilters
            ? "No activity documents match those filters."
            : "No documents attached to this activity yet."}
        />
      </section>

      <section className="ogcr-projects__table-section">
        <h3 className="ogcr-activity-tab__section-title">
          Attached to parcels
          <span className="ogcr-activity-tab__count">({visibleParcelDocs.length})</span>
        </h3>
        <DataTable
          columns={parcelColumns}
          data={visibleParcelDocs}
          loading={status === "loading"}
          skeletonRows={3}
          ariaLabel="Parcel documents table"
          emptyText={hasFilters
            ? "No parcel documents match those filters."
            : "No documents attached to this activity's parcels yet."}
        />
      </section>

      {uploading && (
        <DocumentUploadModal
          isOpen
          defaultProject={activityId}
          scopeParcels={parcels}
          onClose={() => setUploading(false)}
          onUploaded={() => {
            showToast({ variant: "success", title: "Document uploaded", description: "It will be attached to the DCR verification when this activity is submitted." });
            reload();
            reloadActivity();
          }}
        />
      )}

      {newVersionFor && (
        <DocumentUploadModal
          key={newVersionFor.id}
          isOpen
          newVersionFor={newVersionFor}
          onClose={() => setNewVersionFor(null)}
          onUploaded={() => {
            showToast({ variant: "success", title: "New version uploaded", description: "The previous version is kept and superseded." });
            reload();
          }}
        />
      )}

      {deleting && (
        <Modal
          isOpen
          onClose={() => setDeleting(null)}
          size="sm"
          title="Delete this document?"
          subtitle="This cannot be undone. Documents on a submitted activity are frozen."
          secondaryAction={{ label: "Cancel", onClick: () => setDeleting(null) }}
          primaryAction={{ label: "Delete", onClick: handleDelete, tone: "warning" }}
        >
          <p className="text-body-s">{deleting.title}</p>
        </Modal>
      )}
    </div>
  );
}

export default ActivityDocuments;
