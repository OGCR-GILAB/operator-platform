import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowClockwiseIcon, LinkIcon, PlusIcon } from "@phosphor-icons/react";
import { AlertDialog, Button, Message, Pill, Select } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import StatStrip from "../ui/StatStrip";
import { SkeletonStats } from "../ui/Skeleton";
import ActivityTabHeader from "./ActivityTabHeader";
import ParcelFormModal from "../parcels/ParcelFormModal";
import ParcelOwnershipModal from "../parcels/ParcelOwnershipModal";
import { useActivity } from "./ActivityContext";
import { SetupNextStep } from "./ActivitySetupGuide";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import Dialog from "../ui/Dialog";
import {
  formatArea,
  formatTonnes,
  isParcelRegistered,
  ownerSyncOf,
  parcelHasOwnVerdict,
  parcelSyncLabel,
  registryMatchOf,
  parcelSyncTone,
  verificationLabel,
  verificationTone,
} from "../projects/projectPresentation";

// The link is not ours to sync any more: the certification platform registers
// the parcel itself, so the parcel's own status is what counts.
const syncRecordOf = (row) => (row.parcel_detail?.dcr_sync_status ? row.parcel_detail : row);

/**
 * Attach a parcel the Operator already holds. Parcels belong to the Operator,
 * not to one activity, so the same parcel can back several — and this is the
 * only way to reach one that is not linked anywhere yet.
 */
function LinkExistingParcelModal({ isOpen, onClose, operatorId, linkedIds, onLinked }) {
  const [available, setAvailable] = useState([]);
  const [parcelId, setParcelId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    $parcels.listAll({ ...(operatorId ? { operator: operatorId } : {}), ordering: "name" })
      .then((rows) => {
        if (cancelled) return;
        setAvailable(rows.filter((parcel) => !linkedIds.includes(String(parcel.id))));
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
      });

    return () => { cancelled = true; };
  }, [isOpen, operatorId, linkedIds]);

  const handleLink = async () => {
    if (!parcelId) return;

    setBusy(true);
    setError("");

    try {
      await onLinked(parcelId);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;
      setError($auth.getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="m"
      title="Link an existing parcel"
      description="Parcels already registered to this Operator that are not yet part of this activity."
      primaryAction={{
        label: busy ? "Linking…" : "Link",
        onClick: handleLink,
        disabled: busy || !parcelId,
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: busy }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message state="error" type="floating" title="Could not link" description={error} onDismiss={() => setError("")} />
        )}
        <Select
          label="Parcel"
          value={parcelId || null}
          placeholder={available.length ? "Select a parcel" : "No unlinked parcels"}
          options={available.map((parcel) => ({
            value: String(parcel.id),
            label: parcel.name || parcel.cadastral_reference || `Parcel ${parcel.id}`,
          }))}
          onValueChange={(value) => setParcelId(value)}
        />
      </div>
    </Dialog>
  );
}

function ActivityParcels() {
  const { activityId, activity, editable, reload: reloadActivity } = useActivity();
  const { operatorId } = useGlobal();
  const { showToast } = useToast();

  const [rows, setRows] = useState([]);
  // Per-parcel verification, keyed by parcel id, next to the activity's own. It
  // lives on `dcr-status`, not on the link — DCR's `parcel_activity` carries no
  // status of its own, and the certifier usually verifies the activity as a whole.
  // Held with the activity it describes, so another activity's outcome never shows.
  const [verificationScope, setVerificationScope] = useState({ forId: null, byParcel: {}, activityCode: "" });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // `?add=new` is the overview's setup guide asking for the add form straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(
    () => (searchParams.get("add") === "new" && editable ? "new" : null),
  );   // a join row, or 'new'
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ownership, setOwnership] = useState(null);   // parcel object

  // Once read, the flag goes, so a reload or "Back" does not reopen the form.
  useEffect(() => {
    if (searchParams.has("add")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const isSubmitted = Boolean(activity?.submitted_at)
    || ["submitted", "changes_requested", "accepted", "rejected"].includes(activity?.status);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!activityId) return undefined;

    let cancelled = false;

    $projects.allParcels(activityId)
      .then((records) => {
        if (cancelled) return;
        setRows(records);
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [activityId, reloadToken]);

  const currentVerification = isSubmitted && verificationScope.forId === activityId;
  const verifications = useMemo(
    () => (currentVerification ? verificationScope.byParcel : {}),
    [currentVerification, verificationScope],
  );
  const activityVerification = currentVerification ? verificationScope.activityCode : "";

  useEffect(() => {
    if (!activityId || !isSubmitted) return undefined;

    let cancelled = false;

    // Soft: no outcome yet (404 / 409) just leaves every parcel pending.
    $projects.dcrStatus(activityId)
      .then((record) => {
        if (cancelled) return;
        const byParcel = {};
        toList(record?.parcels).forEach((entry) => { byParcel[String(entry.parcel)] = entry; });
        setVerificationScope({
          forId: activityId,
          byParcel,
          activityCode: record?.verification?.status_code || "",
        });
      })
      .catch(() => {
        if (!cancelled) setVerificationScope({ forId: activityId, byParcel: {}, activityCode: "" });
      });

    return () => { cancelled = true; };
  }, [activityId, isSubmitted, reloadToken]);

  // The join row carries the parcel itself on `parcel_detail`; `parcel` is the id.
  const parcelOf = (row) => row.parcel_detail || {};
  const parcelIdOf = (row) => String(row.parcel_detail?.id ?? row.parcel ?? "");

  const linkedIds = useMemo(() => rows.map(parcelIdOf), [rows]);

  const totalArea = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(parcelOf(row).area_ha) || 0), 0),
    [rows],
  );

  const ownerCount = useMemo(
    () => rows.filter((row) => parcelOf(row).has_owner).length,
    [rows],
  );
  // Registered parcels are read-only on the API, even while the activity is
  // open for changes (`changes_requested`).
  const isLocked = useCallback(
    (row) => !editable || isParcelRegistered(syncRecordOf(row)),
    [editable],
  );

  const afterChange = () => {
    reload();
    // `parcel_count` drives the readiness checks and the sidebar badge.
    reloadActivity();
  };

  const handleCreated = async (saved) => {
    // A parcel created from inside an activity belongs to it — link it straight
    // away rather than leaving the operator to do it as a second step.
    try {
      await $projects.linkParcel(activityId, { parcel: saved.id });
      showToast({
        variant: "success",
        title: "Parcel added",
        description: "It has been created and linked to this activity.",
      });
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({
        variant: "warning",
        title: "Parcel saved, but not linked",
        description: $auth.getErrorMessage(err),
      });
    } finally {
      afterChange();
    }
  };

  const handleLink = async (parcelId) => {
    await $projects.linkParcel(activityId, { parcel: parcelId });
    showToast({
      variant: "success",
      title: "Parcel linked",
      description: "The parcel is now part of this activity.",
    });
    afterChange();
  };

  const handleUnlink = async () => {
    if (!unlinking) return;

    try {
      await $projects.unlinkParcel(activityId, parcelIdOf(unlinking));
      showToast({
        variant: "success",
        title: "Parcel unlinked",
        description: "The parcel still belongs to the Operator and can be linked again.",
      });
      setUnlinking(null);
      afterChange();
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({ variant: "error", title: "Could not unlink", description: $auth.getErrorMessage(err) });
      setUnlinking(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await $parcels.remove(parcelIdOf(deleting));
      showToast({ variant: "success", title: "Parcel deleted", description: "The parcel has been removed." });
      setDeleting(null);
      afterChange();
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({ variant: "error", title: "Could not delete", description: $auth.getErrorMessage(err) });
      setDeleting(null);
    }
  };

  const columns = useMemo(
    () => [
      { id: "name", accessorFn: (row) => parcelOf(row).name || "—", header: "Name" },
      { id: "cadastral", accessorFn: (row) => parcelOf(row).cadastral_reference || "—", header: "Cadastral ref." },
      {
        id: "area",
        accessorFn: (row) => parcelOf(row).area_ha,
        header: "Area",
        cell: ({ getValue }) => <span>{formatArea(getValue())}</span>,
      },
      {
        // The declared owner. Once submitted, `dcr-status` says how far it got.
        id: "owner",
        accessorFn: (row) => Boolean(parcelOf(row).has_owner),
        header: "Owner",
        cell: ({ row }) => {
          const parcel = parcelOf(row.original);
          const declared = Boolean(parcel.has_owner);
          const entry = verifications[parcelIdOf(row.original)];
          // The declared owner against the land registry; nothing when there is nothing to compare.
          const match = registryMatchOf(parcel.registry_match);
          const matchPill = match && <Pill tone={match.tone}>{match.short}</Pill>;

          if (!declared || !entry?.owner) {
            let ownerPill = <Pill tone="neutral">Not declared</Pill>;
            if (declared) {
              // A declaration still missing something, e.g. the deed (`null` while none).
              ownerPill = parcel.owner_is_complete === false
                ? <Pill tone="warning">Incomplete</Pill>
                : <Pill tone="positive">Declared</Pill>;
            }
            return (
              <div className="flex flex-col gap-1">
                {ownerPill}
                {matchPill}
              </div>
            );
          }

          const sync = ownerSyncOf(entry.owner, { submitted: isSubmitted });
          return (
            <div className="flex flex-col gap-1" title={sync.detail || undefined}>
              <Pill tone={sync.tone}>{sync.label}</Pill>
              {sync.detail && <span className="text-body-s ogcr-card__subtitle">{sync.detail}</span>}
              {matchPill}
            </div>
          );
        },
      },
      ...(isSubmitted ? [{
        id: "verification",
        accessorFn: (row) => {
          const entry = verifications[parcelIdOf(row)];
          return parcelHasOwnVerdict(entry) ? entry.status_code || "" : "";
        },
        header: "Verification",
        cell: ({ row }) => {
          const entry = verifications[parcelIdOf(row.original)];

          // Without a result of its own, the parcel is verified with the activity.
          if (!parcelHasOwnVerdict(entry)) {
            return (
              <span
                className="text-body-s ogcr-card__subtitle"
                title={`Activity verification: ${activityVerification ? verificationLabel(activityVerification) : "not started"}`}
              >
                With the activity
              </span>
            );
          }

          const details = [
            entry?.amount != null ? formatTonnes(entry.amount) : "",
            entry?.status_message || "",
          ].filter(Boolean).join(" — ");

          return (
            <div className="flex flex-col gap-4" title={details || undefined}>
              <Pill tone={verificationTone(entry?.status_code)}>{verificationLabel(entry?.status_code)}</Pill>
              {details && <span className="text-body-s ogcr-card__subtitle">{details}</span>}
            </div>
          );
        },
      }] : []),
      {
        id: "sync",
        accessorFn: (row) => syncRecordOf(row).dcr_sync_status || "local",
        header: "DCR",
        cell: ({ row }) => {
          const record = syncRecordOf(row.original);
          return (
            <Pill tone={parcelSyncTone(record, { submitted: isSubmitted })}>
              {parcelSyncLabel(record, { submitted: isSubmitted })}
            </Pill>
          );
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-row gap-4">
            <Button
              variant="text"
              size="s"
              onClick={() => setEditing(row.original)}
            >
              {isLocked(row.original) ? "View" : "Edit"}
            </Button>
            {/* Not frozen by submit or registration: editable until the verification is final. */}
            <Button
              variant="text"
              size="s"
              onClick={() => setOwnership(parcelOf(row.original))}
            >
              Ownership
            </Button>
            <Button
              variant="text"
              size="s"
              disabled={!editable}
              onClick={() => setUnlinking(row.original)}
            >
              Unlink
            </Button>
            <Button
              variant="text"
              size="s"
              disabled={isLocked(row.original)}
              onClick={() => setDeleting(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [editable, isLocked, isSubmitted, verifications, activityVerification],
  );

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="The land this activity covers"
        actions={(
          <>
            <Button variant="text" onClick={reload} iconLeft={<ArrowClockwiseIcon size={16} />}>
              Refresh
            </Button>
            <Button
              variant="outlined"
              iconLeft={<LinkIcon size={16} weight="bold" />}
              disabled={!editable || !operatorId}
              onClick={() => setLinking(true)}
            >
              Link existing
            </Button>
            <Button
              variant="filled"
              iconLeft={<PlusIcon size={16} weight="bold" />}
              disabled={!editable || !operatorId}
              onClick={() => setEditing("new")}
            >
              Add Parcel
            </Button>
          </>
        )}
      />

      {!editable && activity && (
        <Message
          state="warning"
          title="This activity is read-only"
          description="It has been submitted to DCR. The certification platform registers its parcels on DCR within a minute or so, after which they can no longer be changed. Their documents and declared owners stay editable."
        />
      )}

      <SetupNextStep covers={["parcels"]} />

      {Boolean(error) && (
        <Message state="error" title="Could not load parcels" description={error} onDismiss={() => setError("")} />
      )}

      {status === "loading" && !rows.length ? <SkeletonStats items={3} /> : (
        <StatStrip
          ariaLabel="Parcel metrics"
          items={[
            { id: "count", label: "Parcels", value: rows.length, sublabel: "in this activity", tone: "brand" },
            {
              id: "area",
              label: "Total area",
              value: totalArea.toLocaleString(undefined, { maximumFractionDigits: 1 }),
              unit: "ha",
            },
            {
              id: "owner",
              label: "Owner declared",
              value: `${ownerCount}/${rows.length}`,
              sublabel: "parcels",
              tone: rows.length && ownerCount === rows.length ? "positive" : "warning",
            },
          ]}
        />
      )}

      <section className="ogcr-projects__table-section">
        <DataTable
          columns={columns}
          data={rows}
          loading={status === "loading"}
          ariaLabel="Activity parcels table"
          emptyText="No parcels yet. Add one, or link a parcel the Operator already holds."
        />
      </section>

      {editing && (
        <ParcelFormModal
          key={editing === "new" ? "new" : parcelIdOf(editing)}
          isOpen
          parcel={editing === "new" ? null : parcelOf(editing)}
          readOnly={editing !== "new" && isLocked(editing)}
          lockedReason={editing !== "new" && isParcelRegistered(syncRecordOf(editing)) ? "registered" : "submitted"}
          operatorId={operatorId}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            if (editing === "new") {
              handleCreated(saved);
              return;
            }

            showToast({
              variant: "success",
              title: "Parcel saved",
              description: "The parcel is stored locally until submission.",
            });
            afterChange();
          }}
        />
      )}

      {linking && (
        <LinkExistingParcelModal
          isOpen
          operatorId={operatorId}
          linkedIds={linkedIds}
          onClose={() => setLinking(false)}
          onLinked={handleLink}
        />
      )}

      {ownership && (
        <ParcelOwnershipModal
          key={ownership.id}
          isOpen
          parcel={ownership}
          submitted={isSubmitted}
          onClose={() => setOwnership(null)}
          onSaved={({ owner, partial } = {}) => {
            // A partial save keeps the dialog open with its own error.
            if (!partial) {
              const sent = owner?.dcr_sync_status === "synced";
              showToast({
                variant: "success",
                title: "Ownership saved",
                description: owner
                  ? (sent
                    ? "The declared owner has been sent to DCR."
                    : "The declared owner goes to DCR once the parcel is registered there.")
                  : "The verification is kept as preparation data for the certifier.",
              });
            }
            afterChange();
          }}
        />
      )}

      {unlinking && (
        <AlertDialog
          open
          onOpenChange={(open) => { if (!open) setUnlinking(null); }}
          title="Unlink this parcel?"
          description={activity?.submitted_at
            ? "The parcel stays with the Operator. Its link to this activity on DCR is removed when you resubmit."
            : "The parcel stays with the Operator and can be linked to an activity again."}
          confirmLabel="Unlink"
          onConfirm={handleUnlink}
        >
          <p className="text-body-s">
            {parcelOf(unlinking).name || parcelOf(unlinking).cadastral_reference || `Parcel ${parcelIdOf(unlinking)}`}
          </p>
        </AlertDialog>
      )}

      {deleting && (
        <AlertDialog
          open
          onOpenChange={(open) => { if (!open) setDeleting(null); }}
          tone="danger"
          title="Delete this parcel?"
          description="This cannot be undone. A parcel that belongs to a submitted activity cannot be deleted."
          confirmLabel="Delete"
          onConfirm={handleDelete}
        >
          <p className="text-body-s">
            {parcelOf(deleting).name || parcelOf(deleting).cadastral_reference || `Parcel ${parcelIdOf(deleting)}`}
            {parcelOf(deleting).project_count > 1
              ? ` is linked to ${parcelOf(deleting).project_count} activities.`
              : ""}
          </p>
        </AlertDialog>
      )}
    </div>
  );
}

export default ActivityParcels;
