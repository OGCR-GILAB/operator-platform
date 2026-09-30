import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon, LinkIcon, PlusIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import DataTable from "../ui/DataTable";
import Message from "../ui/Message";
import Modal from "../ui/Modal";
import Pill from "../ui/Pill";
import Select from "../ui/Select";
import StatStrip from "../ui/StatStrip";
import { SkeletonStats } from "../ui/Skeleton";
import ActivityTabHeader from "./ActivityTabHeader";
import ParcelFormModal from "../parcels/ParcelFormModal";
import OwnerVerificationModal from "../parcels/OwnerVerificationModal";
import { useActivity } from "./ActivityContext";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import {
  formatArea,
  formatTonnes,
  syncLabel,
  syncTone,
  verificationLabel,
  verificationTone,
} from "../projects/projectPresentation";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Link an existing parcel"
      subtitle="Parcels already registered to this Operator that are not yet part of this activity."
      secondaryAction={{ label: "Cancel", onClick: onClose, disabled: busy }}
      primaryAction={{
        label: busy ? "Linking…" : "Link",
        onClick: handleLink,
        disabled: busy || !parcelId,
      }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error) && (
          <Message variant="error" floating title="Could not link" description={error} onClose={() => setError("")} />
        )}
        <Select
          label="Parcel"
          value={parcelId}
          placeholder={available.length ? "Select a parcel" : "No unlinked parcels"}
          options={available.map((parcel) => ({
            value: String(parcel.id),
            label: parcel.name || parcel.cadastral_reference || `Parcel ${parcel.id}`,
          }))}
          onChange={(event) => setParcelId(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function ActivityParcels() {
  const { activityId, activity, editable, reload: reloadActivity } = useActivity();
  const { operatorId } = useGlobal();
  const { showToast } = useToast();

  const [rows, setRows] = useState([]);
  // Per-parcel verification, keyed by parcel id. It lives on `dcr-status`,
  // not on the link — DCR's `parcel_activity` carries no status of its own.
  // Held with the activity it describes, so another activity's outcome never shows.
  const [verificationScope, setVerificationScope] = useState({ forId: null, byParcel: {} });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [editing, setEditing] = useState(null);   // parcel object, or 'new'
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [ownership, setOwnership] = useState(null);   // parcel object

  const isSubmitted = Boolean(activity?.submitted_at)
    || ["submitted", "accepted", "rejected"].includes(activity?.status);

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

  const verifications = useMemo(
    () => (isSubmitted && verificationScope.forId === activityId ? verificationScope.byParcel : {}),
    [isSubmitted, verificationScope, activityId],
  );

  useEffect(() => {
    if (!activityId || !isSubmitted) return undefined;

    let cancelled = false;

    // Soft: no outcome yet (404 / 409) just leaves every parcel pending.
    $projects.dcrStatus(activityId)
      .then((record) => {
        if (cancelled) return;
        const byParcel = {};
        toList(record?.parcels).forEach((entry) => { byParcel[String(entry.parcel)] = entry; });
        setVerificationScope({ forId: activityId, byParcel });
      })
      .catch(() => { if (!cancelled) setVerificationScope({ forId: activityId, byParcel: {} }); });

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

  const verifiedCount = useMemo(
    () => rows.filter((row) => parcelOf(row).has_owner_verification).length,
    [rows],
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
        // Local preparation data — not sent on submit, so never a verdict.
        id: "ownership",
        accessorFn: (row) => parcelOf(row).has_owner_verification,
        header: "Ownership",
        cell: ({ getValue }) => (
          <Pill tone={getValue() ? "positive" : "neutral"}>
            {getValue() ? "Prepared" : "Not prepared"}
          </Pill>
        ),
      },
      ...(isSubmitted ? [{
        id: "verification",
        accessorFn: (row) => verifications[parcelIdOf(row)]?.status_code || "",
        header: "Verification",
        cell: ({ row }) => {
          const entry = verifications[parcelIdOf(row.original)];
          const details = [
            entry?.amount != null ? formatTonnes(entry.amount) : "",
            entry?.status_message || "",
          ].filter(Boolean).join(" — ");

          return (
            <div className="flex flex-col gap-1" title={details || undefined}>
              <Pill tone={verificationTone(entry?.status_code)}>{verificationLabel(entry?.status_code)}</Pill>
              {details && <span className="text-body-s ogcr-card__subtitle">{details}</span>}
            </div>
          );
        },
      }] : []),
      {
        id: "sync",
        accessorFn: (row) => row.dcr_sync_status || "local",
        header: "DCR",
        cell: ({ row }) => <Pill tone={syncTone(row.original)}>{syncLabel(row.original)}</Pill>,
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
              onClick={() => setEditing(parcelOf(row.original))}
            >
              {editable ? "Edit" : "View"}
            </Button>
            {/* Not frozen by submit: it is preparation data until DCR mirrors a verdict. */}
            <Button
              variant="text"
              size="sm"
              onClick={() => setOwnership(parcelOf(row.original))}
            >
              Ownership
            </Button>
            <Button
              variant="text"
              size="sm"
              disabled={!editable}
              onClick={() => setUnlinking(row.original)}
            >
              Unlink
            </Button>
            <Button
              variant="text"
              size="sm"
              tone="warning"
              disabled={!editable}
              onClick={() => setDeleting(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [editable, isSubmitted, verifications],
  );

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="The land this activity covers"
        actions={(
          <>
            <Button variant="text" onClick={reload} startIcon={<ArrowClockwiseIcon size={16} />}>
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<LinkIcon size={16} weight="bold" />}
              disabled={!editable || !operatorId}
              onClick={() => setLinking(true)}
            >
              Link existing
            </Button>
            <Button
              variant="filled"
              tone="brand"
              startIcon={<PlusIcon size={16} weight="bold" />}
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
          variant="warning"
          title="This activity is read-only"
          description="It has been submitted to DCR, so its parcels can no longer be changed. Ownership details stay editable: they are preparation data for the certifier."
        />
      )}

      {Boolean(error) && (
        <Message variant="error" title="Could not load parcels" description={error} onClose={() => setError("")} />
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
              id: "ownership",
              label: "Ownership recorded",
              value: `${verifiedCount}/${rows.length}`,
              sublabel: "parcels",
              tone: rows.length && verifiedCount === rows.length ? "positive" : "warning",
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
          key={editing === "new" ? "new" : editing.id}
          isOpen
          parcel={editing === "new" ? null : editing}
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
        <OwnerVerificationModal
          key={ownership.id}
          isOpen
          parcel={ownership}
          onClose={() => setOwnership(null)}
          onSaved={() => {
            showToast({
              variant: "success",
              title: "Ownership saved",
              description: "Kept as preparation data — it is not sent to DCR on submit.",
            });
            afterChange();
          }}
        />
      )}

      {unlinking && (
        <Modal
          isOpen
          onClose={() => setUnlinking(null)}
          size="sm"
          title="Unlink this parcel?"
          subtitle="The parcel stays with the Operator and can be linked to an activity again."
          secondaryAction={{ label: "Cancel", onClick: () => setUnlinking(null) }}
          primaryAction={{ label: "Unlink", onClick: handleUnlink }}
        >
          <p className="text-body-s">
            {parcelOf(unlinking).name || parcelOf(unlinking).cadastral_reference || `Parcel ${parcelIdOf(unlinking)}`}
          </p>
        </Modal>
      )}

      {deleting && (
        <Modal
          isOpen
          onClose={() => setDeleting(null)}
          size="sm"
          title="Delete this parcel?"
          subtitle="This cannot be undone. A parcel that belongs to a submitted activity cannot be deleted."
          secondaryAction={{ label: "Cancel", onClick: () => setDeleting(null) }}
          primaryAction={{ label: "Delete", onClick: handleDelete, tone: "warning" }}
        >
          <p className="text-body-s">
            {parcelOf(deleting).name || parcelOf(deleting).cadastral_reference || `Parcel ${parcelIdOf(deleting)}`}
            {parcelOf(deleting).project_count > 1
              ? ` is linked to ${parcelOf(deleting).project_count} activities.`
              : ""}
          </p>
        </Modal>
      )}
    </div>
  );
}

export default ActivityParcels;
