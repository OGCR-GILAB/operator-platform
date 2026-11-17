import { useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  QuestionIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Button, Card, Message, Pill } from "@majistudio/ogcr-design-system";
import DcrDetailRow from "./DcrDetailRow";
import DcrRoleGroups from "./DcrRoleGroups";
import MobilePhoneModal from "./MobilePhoneModal";
import useDcrPermissions from "./useDcrPermissions";
import { useGlobal } from "../providers/GlobalContext";
import { formatDate } from "../projects/projectPresentation";
import {
  CAPABILITY_LABELS,
  DCR_CAPABILITIES,
  bankScopedRolesEntries,
  capabilityStatus,
  dcrRoles,
  isLivePermissions,
  liveCapabilityOf,
} from "../../models/dcr";

const STATUS_ICONS = {
  positive: CheckCircleIcon,
  warning: WarningCircleIcon,
  neutral: QuestionIcon,
};

/** Role names under a capability, e.g. the ones DCR says are missing. */
function RoleList({ label, roles, tone }) {
  return (
    <div className="ogcr-dcr-capability__roles">
      <span className="ogcr-dcr-capability__roles-label">{label}</span>
      {roles.map((role) => (
        <Pill key={role} tone={tone}>{role}</Pill>
      ))}
    </div>
  );
}

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
  const [editingPhone, setEditingPhone] = useState(false);
  const live = useDcrPermissions({ enabled: dcrState === "linked" });

  // Re-reads the account and makes the API ask DCR for the roles again,
  // skipping its 5-minute cache.
  const handleRefresh = async () => {
    setRefreshing(true);
    live.reload({ refresh: true });
    try {
      await refreshMe();
    } finally {
      setRefreshing(false);
    }
  };

  const roles = dcrRoles(me);
  const bankId = live.permissions?.bank_id || dcr?.bank_id || "";
  // Grants at the platform's own bank already count and are listed in `roles`;
  // only grants elsewhere are worth flagging as mis-scoped.
  const otherBankGrants = bankScopedRolesEntries(me).filter(([bank]) => bank !== bankId);
  const capabilityFor = (name) => (live.permissions
    ? liveCapabilityOf(live.permissions, name)
    : dcrCapabilities[name]);

  return (
    <Card
      className="ogcr-profile__card"
      title="DCR account"
      subtitle="Your identity and permissions on the registry."
      trailing={(
        <Button
          variant="text"
          size="s"
          iconLeft={<ArrowClockwiseIcon size={16} />}
          disabled={refreshing || live.loading}
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
          <section className="ogcr-dcr-section">
            <span className="ogcr-project-detail__label">What this account can do</span>
            <ul className="ogcr-dcr-capabilities">
              {DCR_CAPABILITIES.map((name) => {
                const capability = capabilityFor(name);
                const status = capabilityStatus(capability?.allowed ?? null);
                const missing = capability?.missing_roles || [];
                const unknown = capability?.unknown_roles || [];
                const StatusIcon = STATUS_ICONS[status.tone];

                return (
                  <li key={name} className={`ogcr-dcr-capability ogcr-dcr-capability--${status.tone}`}>
                    <StatusIcon size={20} weight="fill" className="ogcr-dcr-capability__icon" aria-hidden="true" />
                    <span className="ogcr-dcr-capability__label">{CAPABILITY_LABELS[name] || name}</span>
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {capability?.allowed !== true && missing.length > 0 && (
                      <RoleList label="Missing" roles={missing} tone="warning" />
                    )}
                    {unknown.length > 0 && (
                      <RoleList label="Could not confirm" roles={unknown} tone="neutral" />
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="ogcr-card__subtitle">
              {isLivePermissions(live.permissions)
                ? `Checked role by role on DCR${live.permissions.checked_at ? ` at ${formatDate(live.permissions.checked_at)}` : ""}.`
                : (live.permissions
                  ? "DCR could not be asked live, so this is the role list from your last sign-in."
                  : "From the role list DCR gave at sign-in.")}
            </p>
          </section>

          <section className="ogcr-dcr-section">
            <div className="ogcr-project-detail__grid">
              <DcrDetailRow label="Username">{dcr.username}</DcrDetailRow>
              <DcrDetailRow label="Email">{dcr.email}</DcrDetailRow>
              <DcrDetailRow label="Bank">{bankId || null}</DcrDetailRow>
              <DcrDetailRow label="Mobile phone">
                <span className="flex flex-row flex-wrap items-center gap-8">
                  {dcr.mobile_phone_number || "—"}
                  {/* DCR does not validate numbers yet, so "not verified" is the norm, not a fault. */}
                  {dcr.mobile_phone_number && (dcr.mobile_phone_number_is_validated
                    ? <Pill tone="positive">Verified</Pill>
                    : <span className="ogcr-card__subtitle">Not verified</span>)}
                  <Button variant="text" size="s" onClick={() => setEditingPhone(true)}>
                    {dcr.mobile_phone_number ? "Edit" : "Add"}
                  </Button>
                </span>
              </DcrDetailRow>
            </div>

            <details className="ogcr-dcr-record">
              <summary>Technical details</summary>
              <div className="ogcr-project-detail__grid">
                <DcrDetailRow label="Provider">{dcr.provider}</DcrDetailRow>
                <DcrDetailRow label="Provider id">{dcr.provider_id}</DcrDetailRow>
                <DcrDetailRow label="DCR user id">{dcr.user_id}</DcrDetailRow>
                <DcrDetailRow label="DCR API">{dcr.api_version}</DcrDetailRow>
                <DcrDetailRow label="Synced">{formatDate(dcr.synced_at)}</DcrDetailRow>
              </div>
            </details>
          </section>

          <section className="ogcr-dcr-section">
            <span className="ogcr-project-detail__label">
              Roles{roles.length > 0 ? ` (${roles.length})` : ""}
            </span>
            <DcrRoleGroups roles={roles} />
          </section>

          {otherBankGrants.length > 0 && (
            <section className="ogcr-dcr-section">
              <span className="ogcr-project-detail__label">Roles granted at other banks</span>
              <Message
                state="warning"
                title={`Only roles at ${bankId ? `the ${bankId} bank` : "this platform's bank"} count for operators, activities and parcels. These were probably granted at the wrong bank.`}
              />
              {otherBankGrants.map(([bank, bankRoles]) => (
                <details key={bank} className="ogcr-dcr-record">
                  <summary>
                    {bank}
                    <Pill tone="neutral">
                      {bankRoles.length} {bankRoles.length === 1 ? "role" : "roles"}
                    </Pill>
                  </summary>
                  <DcrRoleGroups roles={bankRoles} />
                </details>
              ))}
            </section>
          )}
        </div>
      )}

      {dcrState === "linked" && editingPhone && (
        <MobilePhoneModal onClose={() => setEditingPhone(false)} />
      )}
    </Card>
  );
}

export default DcrAccountCard;
