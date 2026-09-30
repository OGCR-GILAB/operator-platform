import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Message from "../ui/Message";
import DcrDetailRow from "./DcrDetailRow";
import useOperatorDcr from "./useOperatorDcr";
import $auth from "../../services/$auth";
import { formatDate } from "../projects/projectPresentation";

/**
 * The operator as the registry holds it, read live from
 * `GET operators/{id}/dcr/`.
 *
 * Worth its own card because `ogcr_wallet_address` is assigned by the registry,
 * not by us — and because the operator form on this page keeps editing a local
 * copy of that field that nothing ever pushes back.
 */
function DcrRegistryCard({ operator, operatorId }) {
  const { state, data, error, reload } = useOperatorDcr(operatorId);

  const record = data?.record || {};
  const registryWallet = data?.ogcr_wallet_address || record.ogcr_wallet_address || "";
  const localWallet = operator?.ogcr_wallet_address || "";
  const walletDrifted = Boolean(registryWallet && localWallet && registryWallet !== localWallet);

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
          size="sm"
          startIcon={<ArrowClockwiseIcon size={16} />}
          onClick={reload}
        >
          Refresh
        </Button>
      ) : null}
    >
      {(state === "idle" || state === "loading") && (
        <p className="ogcr-card__subtitle">Reading the registry…</p>
      )}

      {state === "unregistered" && (
        <p className="ogcr-card__subtitle">
          This operator is not on the registry yet. It is registered automatically
          the first time you submit an activity to DCR.
        </p>
      )}

      {state === "unavailable" && (
        <Message
          variant="warning"
          title="The registry could not be read"
          description={`${$auth.getErrorMessage(error)} This says nothing about whether the operator is registered — try again in a moment.`}
        />
      )}

      {state === "error" && (
        <Message
          variant="error"
          title="Could not load the registry record"
          description={$auth.getErrorMessage(error)}
        />
      )}

      {state === "registered" && (
        <div className="ogcr-project-detail__plan">
          <div className="ogcr-project-detail__grid">
            <DcrDetailRow label="DCR identifier">{data.dcr_id}</DcrDetailRow>
            <DcrDetailRow label="Legal name">{record.legal_name}</DcrDetailRow>
            <DcrDetailRow label="Operator id">{record.operator_id}</DcrDetailRow>
            <DcrDetailRow label="Address">{address || null}</DcrDetailRow>
            <DcrDetailRow label="Registered">{formatDate(data.dcr_synced_at)}</DcrDetailRow>
            <DcrDetailRow label="Read">{formatDate(data.fetched_at)}</DcrDetailRow>
            <DcrDetailRow label="OGCR wallet">{registryWallet || null}</DcrDetailRow>
          </div>

          {walletDrifted && (
            <Message
              variant="warning"
              title="The wallet address here has not reached DCR"
              description={`The registry holds ${registryWallet}. Editing the wallet on this page does not push it to DCR — the registry value is the one that counts.`}
            />
          )}
        </div>
      )}
    </Card>
  );
}

export default DcrRegistryCard;
