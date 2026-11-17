import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { AlertDialog, Button, Checkbox, Input, Message, Select } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import ActivityTabHeader from "./ActivityTabHeader";
import DocumentUploadModal from "../documents/DocumentUploadModal";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import { previewKindOf } from "../documents/previewable";
import { useActivity } from "./ActivityContext";
import { SetupNextStep } from "./ActivitySetupGuide";
import { useToast } from "../providers/ToastContext";
import $documents from "../../services/$documents";
import $projects from "../../services/$projects";
import $reference from "../../services/$reference";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import OGCRDocument from "../../models/document";
import { formatDate, parcelLabelOf } from "../projects/projectPresentation";

// The DS Select has no empty-string option; this stands in for "no kind filter".
const ALL_KINDS = "all";

/**
 * Every piece of evidence this activity relies on. A document hangs off either
 * the activity or one of its parcels — the API enforces exactly one — so both
 * are gathered here and shown as two groups rather than split across two tabs.
 */
function ActivityDocuments() {
  const { activityId, editable, documentsOpen, reload: reloadActivity } = useActivity();
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
  const [allVersions, setAllVersions] = useState(false);

  // `?upload=1` is the overview's setup guide asking for the upload form.
  const [searchParams, setSearchParams] = useSearchParams();
  const [uploading, setUploading] = useState(() => searchParams.has("upload") && documentsOpen);
  const [newVersionFor, setNewVersionFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Once read, the flag goes, so a reload or "Back" does not reopen the form.
  useEffect(() => {
    if (searchParams.has("upload")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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
          $documents.listAll({ project: activityId, ...params }),
          ...linkedParcels.map((parcel) =>
            $documents.listAll({ parcel: parcel.id, ...params }).catch(() => null)),
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

      if (search) {
        const needle = search.toLowerCase();
        const haystack = `${row.title || ""} ${row.description || ""} ${row.original_name || ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      return true;
    }),
    [kind, search],
  );

  const visibleActivityDocs = useMemo(() => applyFilters(activityDocs), [applyFilters, activityDocs]);
  const visibleParcelDocs = useMemo(() => applyFilters(parcelDocs), [applyFilters, parcelDocs]);

  const baseColumns = useMemo(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        // A previewable file opens from its title, the way a link would.
        cell: ({ row, getValue }) => (previewKindOf(row.original) ? (
          <button type="button" className="ogcr-doc-link" onClick={() => setViewing(row.original)}>
            {getValue() || row.original.original_name || "Untitled"}
          </button>
        ) : (
          <span>{getValue() || row.original.original_name || "Untitled"}</span>
        )),
      },
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
          <div className="flex flex-row gap-4">
            {previewKindOf(row.original) && (
              <Button
                variant="text"
                size="s"
                iconLeft={<EyeIcon size={16} />}
                onClick={() => setViewing(row.original)}
              >
                View
              </Button>
            )}
            <Button
              variant="text"
              size="s"
              disabled={downloadingId === row.original.id}
              iconLeft={<DownloadSimpleIcon size={16} />}
              onClick={() => handleDownload(row.original)}
            >
              {downloadingId === row.original.id ? "…" : "Download"}
            </Button>
            <Button
              variant="text"
              size="s"
              disabled={row.original.is_frozen || !documentsOpen}
              onClick={() => setNewVersionFor(row.original)}
            >
              New version
            </Button>
            {/* The API refuses deletes once the activity is submitted (409). */}
            {row.original.is_deletable !== false && !row.original.is_frozen && editable && (
              <Button
                variant="text"
                size="s"
                onClick={() => setDeleting(row.original)}
              >
                Delete
              </Button>
            )}
          </div>
        ),
      },
    ],
    // handleDownload closes over `downloadingId`, which is in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kindLabels, downloadingId, editable, documentsOpen],
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

  const hasFilters = Boolean(search || kind);

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="Evidence attached to this activity and to its parcels"
        actions={(
          <>
            <Button variant="text" onClick={reload} iconLeft={<ArrowClockwiseIcon size={16} />}>
              Refresh
            </Button>
            <Button
              variant="filled"
              iconLeft={<UploadSimpleIcon size={16} weight="bold" />}
              disabled={!documentsOpen}
              onClick={() => setUploading(true)}
            >
              Upload Document
            </Button>
          </>
        )}
      />

      {documentsOpen && (
        <Message
          state="neutral"
          title="Documents stay on this platform"
          description="Documents stay on the Operator Platform; certifiers fetch them from here during the audit, ownership proofs included. Upload them before the activity is assigned to an auditor."
        />
      )}

      <SetupNextStep covers={["documents"]} />

      {Boolean(error) && (
        <Message state="error" title="Could not load documents" description={error} onDismiss={() => setError("")} />
      )}

      {/*
        The toolbar is part of the tab, not part of the result: it stays put
        while the documents load, so filtering does not tear the page down and
        rebuild it. Only the rows below are unknown, and they say so in place.
      */}
      <section className="ogcr-projects__table-section">
        {/* Same toolbar as the activities list. It filters both tables below. */}
        <div className="ogcr-projects__toolbar">
          <Input
            className="ogcr-projects__search"
            type="search"
            value={search}
            placeholder="Search documents by title or description…"
            aria-label="Search documents"
            iconLeft={<MagnifyingGlassIcon size={16} />}
            onChange={(event) => setSearch(event.target.value)}
          />

          {/* Kinds come from the API and there are eight of them — too many
              for chips, so this one stays a select. */}
          <Select
            className="ogcr-projects__toolbar-select"
            value={kind || ALL_KINDS}
            aria-label="Filter by kind"
            options={[
              { value: ALL_KINDS, label: "All kinds" },
              ...kinds.map((item) => ({ value: item.value, label: item.label })),
            ]}
            onValueChange={(value) => setKind(value === ALL_KINDS ? "" : value)}
          />

          <Checkbox
            label="Superseded"
            checked={allVersions}
            onCheckedChange={(checked) => { setStatus("loading"); setAllVersions(checked); }}
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
            showToast({ variant: "success", title: "Document uploaded", description: "Certifiers fetch it from here during the audit." });
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

      {viewing && (
        <DocumentViewerModal
          key={viewing.id}
          document={viewing}
          kindLabel={kindLabels[viewing.kind] || viewing.kind}
          onClose={() => setViewing(null)}
        />
      )}

      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => { if (!open) setDeleting(null); }}
          tone="danger"
          title="Delete this document?"
          description="This cannot be undone. Documents on a submitted activity are frozen."
          confirmLabel="Delete"
          onConfirm={handleDelete}
        >
          <p className="text-body-s">{deleting.title}</p>
        </AlertDialog>
      )}
    </div>
  );
}

export default ActivityDocuments;
