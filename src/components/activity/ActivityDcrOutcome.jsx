import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button, Card, Message, Pill, Tooltip } from "@majistudio/ogcr-design-system";
import DataTable from "../ui/DataTable";
import DetailList, { DetailGroup } from "../ui/DetailList";
import StatStrip from "../ui/StatStrip";
import { toList } from "../../services/$api";
import {
  PROJECT_STATUS_LABELS,
  benefitItems,
  formatDateTime,
  formatRelative,
  formatTonnes,
  ownerSyncOf,
  projectStatusTone,
  verificationLabel,
  verificationTone,
} from "../projects/projectPresentation";

/** What the activity-level verification code means for the operator. */
function verificationNote(code) {
  if (code === "validated") return "Validation passed; the auditor's verification is still to come.";
  if (code === "verified") return "The certifier has verified the activity.";
  if (code === "failed") return "The certifier did not verify the activity — see the audit reports.";
  if (code === "denied") return "The activity did not pass validation — see the audit reports.";
  if (code === "validation_amendment_required" || code === "verification_amendment_required") {
    return "The certifier asked for changes — see the notice on the overview.";
  }
  return "DCR verifies the activity as a whole; a parcel gets its own result only if the certifier records one.";
}

/**
 * The registry's verdict on a submitted activity, from `dcr-status`. Sits in
 * the side panel: after submission it is the one thing the operator is waiting
 * for. The server re-reads it every 15 minutes; Refresh asks DCR right away.
 */
function ActivityDcrOutcome({
  dcrStatus,
  loadError = "",
  refreshing = false,
  onRefresh,
  refusedRoles = null,
  parcelNameOf = (id) => `Parcel ${id}`,
}) {
  const verificationCode = dcrStatus?.verification?.status_code || "";
  // Every linked parcel, with its declared owner's trip to DCR.
  const ownerRows = toList(dcrStatus?.parcels);

  return (
    <Card
      title="DCR outcome"
      className="ogcr-submission-panel"
      trailing={(
        <Tooltip
          trigger={(
            <Button
              variant="text"
              size="s"
              iconLeft={<ArrowClockwiseIcon size={16} />}
              disabled={refreshing}
              onClick={onRefresh}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          )}
        >
          The server also re-reads verification, certificates and audit reports from DCR every 15 minutes.
        </Tooltip>
      )}
    >
      {refusedRoles != null && (
        <Message
          state="warning"
          title="Reading outcomes may be refused"
          description={`DCR reports these roles missing: ${refusedRoles || "none named"}.`}
        />
      )}

      {dcrStatus ? (
        <>
          <div className="ogcr-submission-panel__status">
            <div className="ogcr-submission-panel__text">
              <span className="ogcr-project-detail__label">Verification</span>
              <Pill tone={verificationCode ? verificationTone(verificationCode) : "neutral"}>
                {verificationCode ? verificationLabel(verificationCode) : "Not started"}
              </Pill>
              <p className="ogcr-submission-panel__note">{verificationNote(verificationCode)}</p>
            </div>
          </div>

          {/* The certifier's amounts on the activity verification; only the filled ones. */}
          <StatStrip
            variant="bare"
            ariaLabel="Verified amounts"
            items={benefitItems(dcrStatus.verification, verificationCode === "verified" ? "positive" : "neutral")}
          />

          <DetailList>
            <DetailList.Item label="DCR status">
              {dcrStatus.status ? (
                <Pill tone={projectStatusTone(dcrStatus.status)}>
                  {PROJECT_STATUS_LABELS[dcrStatus.status] || dcrStatus.status}
                </Pill>
              ) : null}
            </DetailList.Item>
            <DetailList.Item label="Checked">
              {dcrStatus.checked_at ? (
                <span title={formatDateTime(dcrStatus.checked_at)}>{formatRelative(dcrStatus.checked_at)}</span>
              ) : null}
            </DetailList.Item>
            <DetailList.Item label="DCR identifier" span="full">
              {dcrStatus.dcr_id ? <span className="ogcr-detail-list__mono">{dcrStatus.dcr_id}</span> : null}
            </DetailList.Item>
          </DetailList>

          {ownerRows.length > 0 && (
            <DetailGroup
              title="Parcel owners"
              count={ownerRows.length}
              hint="The declared owners, sent to DCR once the certification platform has registered their parcel."
            >
              <DetailList columns={1}>
                {ownerRows.map((entry) => {
                  const sync = ownerSyncOf(entry.owner, { submitted: true });
                  return (
                    <DetailList.Item
                      key={entry.parcel}
                      label={entry.name || entry.cadastral_reference || parcelNameOf(entry.parcel)}
                      span="full"
                    >
                      <span className="flex flex-col gap-1">
                        <span><Pill tone={sync.tone}>{sync.label}</Pill></span>
                        {sync.detail && <span className="text-body-s ogcr-card__subtitle">{sync.detail}</span>}
                      </span>
                    </DetailList.Item>
                  );
                })}
              </DetailList>
            </DetailGroup>
          )}
        </>
      ) : loadError ? (
        <Message
          state="warning"
          title="Could not read the DCR outcome"
          description={loadError}
        />
      ) : (
        <p className="text-body-s ogcr-card__subtitle">
          No outcome recorded yet. The server checks DCR every 15 minutes — Refresh asks it now.
        </p>
      )}
    </Card>
  );
}

/**
 * Parcels the certifier gave a result of their own. `dcr-status` names them;
 * `nameOf` resolves an entry that has neither name nor cadastral reference.
 */
export function ActivityParcelResults({ parcels, nameOf }) {
  const columns = [
    {
      id: "parcel",
      header: "Parcel",
      accessorFn: (row) => row.name || row.cadastral_reference || nameOf(row.parcel),
    },
    {
      accessorKey: "status_code",
      header: "Result",
      cell: ({ getValue }) => (
        <Pill tone={verificationTone(getValue())}>{verificationLabel(getValue())}</Pill>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ getValue }) => formatTonnes(getValue()),
    },
    {
      accessorKey: "status_message",
      header: "Note",
      enableSorting: false,
      cell: ({ getValue }) => getValue() || "—",
    },
  ];

  return (
    <Card
      title="Parcel results"
      subtitle="Parcels the certifier recorded a result for. The rest follow the activity's verification."
      trailing={<Pill tone="neutral">{parcels.length}</Pill>}
    >
      <DataTable data={parcels} columns={columns} ariaLabel="Parcel results" />
    </Card>
  );
}

export default ActivityDcrOutcome;
