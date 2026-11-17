import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowClockwiseIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { Button, Input, Message, Pill, ProgressBar, ToggleGroup } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import CreateActivityModal from "./CreateActivityModal";
import ActivitiesPortfolioStats from "./ProjectsPortfolioStats";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import { toList } from "../../services/$api";
import $auth from "../../services/$auth";
import {
  ACTIVITY_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  formatDate,
  localCompleteness,
  projectLocation,
  projectStatusTone,
  syncLabel,
  syncTone,
} from "./projectPresentation";

// The full labels ("Ready for submission") are right in a table cell but too
// long for a chip, so the filter row gets its own short forms.
const STATUS_CHIP_LABELS = {
  draft: "Draft",
  ready: "Ready",
  submitted: "Submitted",
  changes_requested: "Changes requested",
  accepted: "Accepted",
  rejected: "Rejected",
};

// Toggle items need a value; this one stands for "no status filter".
const ALL_STATUSES = "all";

const statusFilterOptions = [
  { value: ALL_STATUSES, label: "All" },
  ...Object.keys(PROJECT_STATUS_LABELS).map((value) => ({
    value,
    label: STATUS_CHIP_LABELS[value] || value,
  })),
];

function Activities() {
  const { operatorId, me } = useGlobal();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const openActivity = useCallback(
    (activityId) => navigate(`/activities/${activityId}/overview`),
    [navigate],
  );

  const [activities, setActivities] = useState([]);
  const [totalAreaHa, setTotalAreaHa] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ count: 0, hasNext: false, hasPrevious: false });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Bumped to force a refetch; the effect below owns every list request so the
  // loading state is only ever set from an event handler.
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    $projects.list({
      page,
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ordering: "-created_at",
    })
      .then((data) => {
        if (cancelled) return;

        const rows = toList(data);
        setActivities(rows);
        setPageInfo({
          count: data?.count ?? rows.length,
          hasNext: Boolean(data?.next),
          hasPrevious: Boolean(data?.previous),
        });
        setError("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // A 401 is handled globally; anything else belongs on the page.
        if (err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [page, search, statusFilter, reloadToken]);

  // Hectares live on the parcels, so the portfolio total is one extra call.
  useEffect(() => {
    if (!operatorId) return;

    let cancelled = false;

    $parcels.listAll({ operator: operatorId })
      .then((parcels) => {
        if (cancelled) return;
        setTotalAreaHa(parcels.reduce((sum, parcel) => sum + (Number(parcel.area_ha) || 0), 0));
      })
      .catch(() => {
        // The area tile falls back to a parcel count; no need to shout about it.
      });

    return () => { cancelled = true; };
  }, [operatorId]);

  const handleCreated = (project) => {
    showToast({
      variant: "success",
      title: "Activity created",
      description: `${project.name} is a local draft until you submit it to DCR.`,
    });

    // Straight into the new activity: its plans, parcels and documents are all
    // still empty, and that workspace is where they get filled in.
    openActivity(project.id);
  };

  const columns = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Activity Name",
      },
      {
        id: "location",
        accessorFn: (row) => projectLocation(row),
        header: "Location",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <Pill tone={projectStatusTone(getValue())}>
            {PROJECT_STATUS_LABELS[getValue()] || getValue() || "—"}
          </Pill>
        ),
      },
      {
        id: "type",
        accessorFn: (row) => row.type || row.unit_types || "",
        header: "Type",
        cell: ({ getValue }) => <span>{ACTIVITY_TYPE_LABELS[getValue()] || getValue() || "—"}</span>,
      },
      {
        id: "parcels",
        accessorKey: "parcel_count",
        header: "Parcels",
        cell: ({ getValue }) => <span>{getValue() ?? 0}</span>,
      },
      {
        id: "completeness",
        accessorFn: (row) => localCompleteness(row),
        header: "Completeness",
        cell: ({ getValue }) => <ProgressBar value={getValue()} />,
      },
      {
        id: "sync",
        accessorFn: (row) => row.dcr_sync_status || "local",
        header: "DCR",
        cell: ({ row }) => (
          <Pill tone={syncTone(row.original)}>{syncLabel(row.original)}</Pill>
        ),
      },
      {
        id: "updated",
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ getValue }) => <span>{formatDate(getValue())}</span>,
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="outlined"
            size="s"
            onClick={() => openActivity(row.original.id)}
          >
            Open
          </Button>
        ),
      },
    ],
    [openActivity],
  );

  return (
    <div className="ogcr-projects">
      <section className="ogcr-projects__header">
        <div>
          <h1 className="text-h2">Activities</h1>
          <p className="ogcr-projects__subtitle">
            Open an activity to work on its plans, parcels, documents and map.
          </p>
        </div>
        <div className="flex flex-row items-center gap-8">
          <Button variant="text" onClick={reload} iconLeft={<ArrowClockwiseIcon size={16} />}>
            Refresh
          </Button>
          <Button
            variant="filled"
            iconLeft={<PlusIcon size={16} weight="bold" />}
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!operatorId}
          >
            Create New Activity
          </Button>
        </div>
      </section>

      {!operatorId && (
        <Message
          state="warning"
          title="No Operator profile yet"
          description="Activities belong to an Operator. Finish the Operator setup before creating one."
        />
      )}

      {Boolean(error) && (
        <Message
          state="error"
          title="Could not load activities"
          description={error}
          onDismiss={() => setError("")}
        />
      )}

      <ActivitiesPortfolioStats activities={activities} totalAreaHa={totalAreaHa} />

      <section className="ogcr-projects__table-section">
        {/*
          Search and status on one line, attached to the table they filter. A
          labelled field plus a labelled select cost two rows and a lot of height
          for two controls that explain themselves.
        */}
        <div className="ogcr-projects__toolbar">
          <Input
            className="ogcr-projects__search"
            type="search"
            value={search}
            placeholder="Search activities by name, summary or city…"
            aria-label="Search activities"
            iconLeft={<MagnifyingGlassIcon size={16} />}
            onChange={(e) => { setPage(1); setStatus("loading"); setSearch(e.target.value); }}
          />

          <ToggleGroup
            appearance="segmented"
            aria-label="Filter by status"
            className="ogcr-projects__view-toggle"
            value={[statusFilter || ALL_STATUSES]}
            onValueChange={(next) => {
              if (!next[0]) return;
              setPage(1);
              setStatus("loading");
              setStatusFilter(next[0] === ALL_STATUSES ? "" : next[0]);
            }}
            items={statusFilterOptions}
          />
        </div>

        {/*
          The table stays on screen while it reloads. Searching and paging used
          to replace it with a spinner, which meant every keystroke collapsed the
          list and then pushed the page back open around the new rows.
        */}
        <DataTable
          columns={columns}
          data={activities}
          loading={status === "loading"}
          ariaLabel="Activities table"
          emptyText={
            search || statusFilter
              ? "No activities match those filters."
              : "No activities yet. Create your first one to get started."
          }
        />

        {(pageInfo.hasNext || pageInfo.hasPrevious) && (
          <div className="flex flex-row items-center justify-between gap-8 pt-8">
            <span className="text-body-s ogcr-card__subtitle">
              {pageInfo.count} activit{pageInfo.count === 1 ? "y" : "ies"} in total
            </span>
            <div className="flex flex-row gap-8">
              <Button
                variant="outlined"
                size="s"
                disabled={!pageInfo.hasPrevious}
                onClick={() => { setStatus("loading"); setPage((current) => Math.max(1, current - 1)); }}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                size="s"
                disabled={!pageInfo.hasNext}
                onClick={() => { setStatus("loading"); setPage((current) => current + 1); }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <CreateActivityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          user={me}
          operatorId={operatorId}
          onCreateActivity={handleCreated}
        />
      )}
    </div>
  );
}

export default Activities;
