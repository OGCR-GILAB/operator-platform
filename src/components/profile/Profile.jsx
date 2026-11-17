import { useState } from "react";
import { Button, Card, Input, Message, Select } from "@majistudio/ogcr-design-system";
import ContactPhoneField from "../ui/ContactPhoneField";
import { joinPhone, splitPhone } from "../ui/phone";
import DcrAccountCard from "./DcrAccountCard";
import usePasswordPolicy from "../auth/usePasswordPolicy";
import DcrRegistryCard from "./DcrRegistryCard";
import OperatorMembersCard from "./OperatorMembersCard";
import useOperatorDcr from "./useOperatorDcr";
import { useToast } from "../providers/ToastContext";
import { useGlobal } from "../providers/GlobalContext";
import useCountryOptions from "../projects/useCountryOptions";
import $auth from "../../services/$auth";
import $operators, { OPERATOR_DCR_STATES } from "../../services/$operators";
import { syncStateOf } from "../../models/document";
import Dialog from "../ui/Dialog";

// Never sent to DCR: nothing to read, and nothing about it is a failure.
const NOT_ON_DCR = { state: OPERATOR_DCR_STATES.unregistered, data: null, error: null, reload: () => {} };

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "OP";
  return `${parts[0][0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function operatorFormFrom(operator) {
  const { countryCode, number } = splitPhone(operator?.phone);

  return {
    legal_name: operator?.legal_name || "",
    address_line_1: operator?.address_line_1 || "",
    address_line_2: operator?.address_line_2 || "",
    postcode: operator?.postcode || "",
    country_code: operator?.country_code || "",
    phone_code: countryCode,
    phone_number: number,
  };
}

/**
 * Keyed on the operator's `updated_at` by the caller, so a saved or re-read
 * record starts a fresh form instead of being copied into state by an effect.
 */
function OperatorProfileForm({ operator, operatorId, registry, onDelete }) {
  const { me, meStatus, relationship, refreshOperator } = useGlobal();
  const { showToast } = useToast();

  const countryOptions = useCountryOptions();
  const [form, setForm] = useState(() => operatorFormFrom(operator));
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  // Assigned by DCR when the operator is first registered, never typed in here.
  const registryWallet = registry.data?.ogcr_wallet_address
    || registry.data?.record?.ogcr_wallet_address
    || "";

  const walletHelper = {
    registered: registryWallet ? "Assigned by the DCR registry." : "The registry has not assigned a wallet yet.",
    unregistered: "Assigned by the DCR registry on your first project submit.",
    unavailable: "The registry could not be read just now.",
    error: "The registry could not be read just now.",
  }[registry.state] || "Reading the registry…";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!operatorId) return;

    setSaving(true);

    try {
      const { phone_code, phone_number, ...fields } = form;

      // The operator e-mail tracks the account e-mail, but a `me` restored from
      // sessionStorage can be out of date — re-asserting it from a stale copy
      // would write an old address back. PATCH, so omitting it simply leaves
      // the stored value alone.
      await $operators.patch(operatorId, {
        ...fields,
        phone: joinPhone(phone_code, phone_number),
        ...(meStatus === 'fresh' && me?.email ? { email: me.email } : {}),
      });
      await refreshOperator();

      showToast({
        variant: "success",
        title: "Profile information updated",
        description: "Your Operator profile has been saved.",
      });
    } catch (err) {
      showToast({
        variant: "error",
        title: "Update failed",
        description: $auth.getErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ogcr-profile__form" onSubmit={handleSubmit}>
      <Input
        label="Legal name"
        value={form.legal_name}
        onChange={handleFieldChange("legal_name")}
        placeholder="e.g., Agreena, or John Smith"
        required
      />

      <Input
        type="email"
        label="Email"
        value={me?.email || ""}
        onChange={() => {}}
        disabled
        helperText="Taken from your account email."
      />

      <ContactPhoneField
        label="Phone"
        countryCode={form.phone_code}
        phone={form.phone_number}
        onCountryCodeChange={(value) => setForm((prev) => ({ ...prev, phone_code: value }))}
        onPhoneChange={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
      />

      <Input
        label="Address line 1"
        value={form.address_line_1}
        onChange={handleFieldChange("address_line_1")}
        placeholder="Green Street, 20"
        required
      />
      <Input
        label="Address line 2"
        value={form.address_line_2}
        onChange={handleFieldChange("address_line_2")}
        placeholder="Suite 400"
      />

      <div className="ogcr-profile__row">
        <Input
          label="Postcode"
          value={form.postcode}
          onChange={handleFieldChange("postcode")}
          placeholder="10115"
          required
        />
        <Select
          label="Country"
          value={form.country_code || null}
          onValueChange={(value) => setForm((prev) => ({ ...prev, country_code: value }))}
          options={countryOptions}
          placeholder="Select country"
          required
        />
      </div>

      <Input
        label="OGCR wallet address"
        value={registryWallet}
        onChange={() => {}}
        placeholder={registry.state === "unregistered" ? "Assigned on first submit" : "—"}
        disabled
        helperText={walletHelper}
      />

      {relationship && (
        <p className="ogcr-card__subtitle">Your role: <strong>{relationship}</strong></p>
      )}

      <div className="ogcr-profile__actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile information"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={saving}
          onClick={onDelete}
        >
          Delete profile information
        </Button>
      </div>
    </form>
  );
}

/**
 * DCR has no "change password" call — the only way to set a new one is the
 * e-mailed reset link, so that is what this card offers.
 */
function PasswordCard() {
  const { me } = useGlobal();
  const { description: passwordRules } = usePasswordPolicy();

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  // Always 202 by design; 503 while the deployment lacks its DCR service account.
  const handleReset = async () => {
    if (!me?.email) return;

    setNotice(null);
    setSending(true);

    try {
      await $auth.passwordReset(me.email);
      setNotice({
        variant: "success",
        title: "Check your e-mail",
        description: `A reset link is on its way to ${me.email}.`,
      });
    } catch (err) {
      if (err?.response?.status === 401) return;
      setNotice(err?.response?.status === 503
        ? {
          variant: "warning",
          title: "Not available yet",
          description: "Password resets are not configured on this deployment. Please contact your administrator.",
        }
        : {
          variant: "error",
          title: "Could not send the reset link",
          description: $auth.getErrorMessage(err),
        });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card
      className="ogcr-profile__card"
      title="Password"
      subtitle="Your password is managed by the DCR platform."
    >
      <div className="ogcr-profile__form">
        <p className="ogcr-card__subtitle">
          To change it, we e-mail you a reset link. {passwordRules}
        </p>

        {notice && (
          <Message
            state={notice.variant}
            title={notice.title}
            description={notice.description}
            onDismiss={() => setNotice(null)}
          />
        )}

        <div className="ogcr-profile__actions">
          <Button type="button" onClick={handleReset} disabled={sending || !me?.email}>
            {sending ? "Sending..." : "Send password reset link"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Profile() {
  const {
    me,
    operator,
    operatorId,
    operatorStatus,
    deleteOperatorProfile,
  } = useGlobal();
  const { showToast } = useToast();

  // Read once here and shared, so the wallet field and the registry card do not
  // each hit DCR for the same record. `dcr_id` is assigned before anything is
  // sent, so it says nothing about registration; a never-sent operator skips
  // the read, and any other answers 404 -> `unregistered` if DCR has no record.
  const isLinked = operatorStatus === 'linked';
  const neverSent = syncStateOf(operator) === 'local' && !operator?.dcr_synced_at;
  const dcrRead = useOperatorDcr(isLinked && !neverSent ? operatorId : null);
  const registry = isLinked && neverSent ? NOT_ON_DCR : dcrRead;

  const [isDeleteProfileModalOpen, setIsDeleteProfileModalOpen] = useState(false);
  const [deleteProfileConfirmValue, setDeleteProfileConfirmValue] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);

  const initials = getInitials(operator?.legal_name || me?.username);

  const closeDeleteProfile = () => {
    setIsDeleteProfileModalOpen(false);
    setDeleteProfileConfirmValue("");
  };

  const handleDeleteProfileInfo = async () => {
    setDeletingProfile(true);

    try {
      await deleteOperatorProfile();

      closeDeleteProfile();

      showToast({
        variant: "warning",
        title: "Profile information deleted",
        description: "Your Operator profile has been removed. You'll be asked to set it up again.",
      });
    } catch (err) {
      showToast({
        variant: "error",
        title: "Delete failed",
        description: $auth.getErrorMessage(err),
      });
    } finally {
      setDeletingProfile(false);
    }
  };

  const isDeleteProfileEnabled = deleteProfileConfirmValue.trim().toUpperCase() === "DELETE";

  return (
    <div className="ogcr-profile">
      <header className="ogcr-profile__hero">
        <div className="ogcr-profile__avatar" aria-hidden="true">{initials}</div>
        <div>
          <h2 className="ogcr-profile__title">Account Settings</h2>
          <p className="ogcr-profile__subtitle">
            Manage your Operator profile, its members and your sign-in.
          </p>
          <p className="ogcr-profile__meta">
            Signed in as <strong>{me?.username || " - "}</strong> · {me?.email || " - "}
          </p>
        </div>
      </header>

      <div className="ogcr-profile__grid">
        <Card
          className="ogcr-profile__card"
          title="Profile Information"
          subtitle="The Operator profile linked to your account."
        >
          {(operatorStatus === 'idle' || operatorStatus === 'checking') && (
            <p className="ogcr-card__subtitle">Loading operator profile...</p>
          )}

          {operatorStatus === 'error' && (
            <p className="ogcr-card__subtitle">
              Couldn't load your operator profile. Please refresh the page.
            </p>
          )}

          {operatorStatus === 'missing' && (
            <p className="ogcr-card__subtitle">
              No Operator profile linked to your account yet.
            </p>
          )}

          {operatorStatus === 'linked' && (
            <OperatorProfileForm
              key={`${operator?.id}:${operator?.updated_at}`}
              operator={operator}
              operatorId={operatorId}
              registry={registry}
              onDelete={() => setIsDeleteProfileModalOpen(true)}
            />
          )}
        </Card>

        {/*
          Up front, why submit may be refused: the roles DCR grants this account
          and what they allow, checked live.
        */}
        <DcrAccountCard />

        {operatorStatus === 'linked' && (
          <DcrRegistryCard operator={operator} registry={registry} />
        )}

        {operatorStatus === 'linked' && (
          <OperatorMembersCard operatorId={operatorId} />
        )}

        <PasswordCard />
      </div>

      <Dialog
        open={isDeleteProfileModalOpen}
        onOpenChange={(open) => { if (!open && !deletingProfile) closeDeleteProfile(); }}
        size="m"
        title="Delete profile information"
        description="Type DELETE to confirm removing your Operator profile."
        primaryAction={{
          label: deletingProfile ? "Deleting..." : "Delete permanently",
          onClick: handleDeleteProfileInfo,
          disabled: !isDeleteProfileEnabled || deletingProfile,
          closeOnClick: false,
        }}
        secondaryAction={{ label: "Cancel", disabled: deletingProfile }}
      >
        <Input
          label="Confirmation"
          placeholder="Type DELETE"
          value={deleteProfileConfirmValue}
          onChange={(event) => setDeleteProfileConfirmValue(event.target.value)}
          helperText="This removes your Operator and its link to your account. You will need to set it up again."
        />
      </Dialog>
    </div>
  );
}

export default Profile;
