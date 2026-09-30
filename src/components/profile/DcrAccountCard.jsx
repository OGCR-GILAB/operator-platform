import { useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Pill from "../ui/Pill";
import DcrDetailRow from "./DcrDetailRow";
import { useGlobal } from "../providers/GlobalContext";
import { formatDate } from "../projects/projectPresentation";
import {
  CAPABILITY_LABELS,
  DCR_CAPABILITIES,
  bankScopedRolesEntries,
  dcrRoles,
} from "../../models/dcr";

/**
 * The account as DCR knows it, from `GET auth/me/` -> `dcr`.
 *
 * The point of the card is the capabilities: they say up front whether this
 * account may submit, so the user is not left guessing at a 502 after filling in
 * a whole activity.
 */
function DcrAccountCard() {
  const { me, dcr, dcrState, dcrCapabilities, refreshMe } = useGlobal();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMe();
    } finally {
      setRefreshing(false);
    }
  };

  const roles = dcrRoles(me);
  const bankScoped = bankScopedRolesEntries(me);

  return (
    <Card
      className="ogcr-profile__card"
      title="DCR account"
      subtitle="Your identity and permissions on the registry."
      trailing={(
        <Button
          variant="text"
          size="sm"
          startIcon={<ArrowClockwiseIcon size={16} />}
          disabled={refreshing}
          onClick={handleRefresh}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      )}
    >
      {dcrState === "unknown" && (
        <p className="ogcr-card__subtitle">Loading your DCR account…</p>
      )}

      {dcrState === "local_only" && (
        <p className="ogcr-card__subtitle">
          This account is local to the Operator Platform and has no DCR identity.
          Local-only accounts cannot submit activities to the registry.
        </p>
      )}

      {dcrState === "linked" && (
        <div className="ogcr-project-detail__plan">
          <div className="ogcr-project-detail__grid">
            <DcrDetailRow label="Username">{dcr.username}</DcrDetailRow>
            <DcrDetailRow label="Email">{dcr.email}</DcrDetailRow>
            <DcrDetailRow label="Provider">{dcr.provider}</DcrDetailRow>
            <DcrDetailRow label="Provider id">{dcr.provider_id}</DcrDetailRow>
            <DcrDetailRow label="DCR user id">{dcr.user_id}</DcrDetailRow>
            <DcrDetailRow label="Synced">{formatDate(dcr.synced_at)}</DcrDetailRow>
          </div>

          <div>
            <span className="ogcr-project-detail__label">Roles</span>
            {roles.length > 0 ? (
              <div className="flex flex-row flex-wrap items-center gap-2">
                {roles.map((role) => (
                  <Pill key={role} tone="neutral">{role}</Pill>
                ))}
              </div>
            ) : (
              <span className="ogcr-project-detail__value">No system roles granted.</span>
            )}
          </div>

          <div>
            <span className="ogcr-project-detail__label">What this account can do</span>
            <ul>
              {DCR_CAPABILITIES.map((name) => {
                const capability = dcrCapabilities[name];
                const allowed = capability?.allowed === true;
                const missing = capability?.missing_roles || [];

                return (
                  <li key={name}>
                    <Pill tone={allowed ? "positive" : "warning"}>
                      {allowed ? "Allowed" : "Not allowed"}
                    </Pill>
                    &nbsp;{CAPABILITY_LABELS[name] || name}
                    {!allowed && missing.length > 0
                      ? ` — missing ${missing.join(", ")}`
                      : ""}
                  </li>
                );
              })}
            </ul>
          </div>

          {bankScoped.length > 0 && (
            <div>
              <span className="ogcr-project-detail__label">Bank-scoped roles</span>
              <span className="ogcr-project-detail__value">
                {bankScoped.map(([bank, bankRoles]) => (
                  <span key={bank}>{bank}: {bankRoles.join(", ") || "—"}. </span>
                ))}
              </span>
              <p className="ogcr-card__subtitle">
                DCR ignores bank-scoped grants for operators, activities and parcels.
                They are shown here only so a mis-scoped grant is visible.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default DcrAccountCard;
