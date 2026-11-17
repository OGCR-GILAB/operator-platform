import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button, Card, Message, Pill } from "@majistudio/ogcr-design-system";
import DcrDetailRow from "./DcrDetailRow";
import $auth from "../../services/$auth";
import { formatDate, syncLabel, syncTone } from "../projects/projectPresentation";

/**
 * The operator as the registry holds it, read live from
 * `GET operators/{id}/dcr/`.
 *
 * Worth its own card because `ogcr_wallet_address` is assigned by the registry,
 * not by us. `registry` is the `useOperatorDcr` result, read once by the page
 * and shared with the operator form's wallet field.
 */
function DcrRegistryCard({ operator, registry }) {
  const { state, data, error, reload } = registry;

  const record = data?.record || {};
  const registryWallet = data?.ogcr_wallet_address || record.ogcr_wallet_address || "";

  const address = [record.address_line_1, record.address_line_2, record.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className="ogcr-profile__card"
      title="DCR registry"
      subtitle={operator?.legal_name
        ? `How the registry holds ${operator.legal_name}.`
        : "How the registry holds your operator."}
      trailing={state === "registered" || state === "unavailable" || state === "error" ? (
        <Button
          variant="text"
          size="s"
          iconLeft={<ArrowClockwiseIcon size={16} />}
          onClick={reload}
        >
          Refresh
        </Button>
      ) : null}
    >
      {/*
        Our side of the story: `dcr_sync_status` says whether the last submit
        got the operator onto DCR, independently of whether the live read
        below succeeds.
      */}
      {operator?.dcr_sync_status && (
        <div className="ogcr-project-detail__grid">
          <DcrDetailRow label="Sync">
            <Pill tone={syncTone(operator)}>{syncLabel(operator)}</Pill>
          </DcrDetailRow>
        </div>
      )}

      {operator?.dcr_sync_status === "failed" && (
        <Message
          state="warning"
          title="The operator did not reach DCR"
          description="The last project submit failed while registering this operator. Submitting a project again retries it — nothing is duplicated."
        />
      )}

      {(state === "idle" || state === "loading") && (
        <p className="ogcr-card__subtitle">Reading the registry…</p>
      )}

      {state === "unregistered" && (
        <p className="ogcr-card__subtitle">
          This operator is not on the registry yet. It is registered automatically
          the first time you submit a project to DCR, and the registry assigns
          its OGCR wallet then.
        </p>
      )}

      {state === "unavailable" && (
        <Message
          state="warning"
          title="The registry could not be read"
          description={`${$auth.getErrorMessage(error)} This says nothing about whether the operator is registered — try again in a moment.`}
        />
      )}

      {state === "error" && (
        <Message
          state="error"
          title="Could not load the registry record"
          description={$auth.getErrorMessage(error)}
        />
      )}

      {state === "registered" && (
        <div className="ogcr-project-detail__plan">
          <div className="ogcr-project-detail__grid">
            <DcrDetailRow label="DCR identifier">{data.dcr_id}</DcrDetailRow>
            <DcrDetailRow label="Legal name">{record.legal_name || null}</DcrDetailRow>
            <DcrDetailRow label="Operator id">{record.operator_id || null}</DcrDetailRow>
            <DcrDetailRow label="Address">{address || null}</DcrDetailRow>
            <DcrDetailRow label="Country">{record.country_code || null}</DcrDetailRow>
            <DcrDetailRow label="Email">{record.email || null}</DcrDetailRow>
            <DcrDetailRow label="Phone">{record.phone || null}</DcrDetailRow>
            <DcrDetailRow label="Registered">{formatDate(data.dcr_synced_at)}</DcrDetailRow>
            <DcrDetailRow label="Read">{formatDate(data.fetched_at)}</DcrDetailRow>
            <DcrDetailRow label="OGCR wallet">{registryWallet || null}</DcrDetailRow>
          </div>
        </div>
      )}
    </Card>
  );
}

export default DcrRegistryCard;
