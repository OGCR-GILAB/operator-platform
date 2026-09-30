import { useEffect, useState } from "react";
import Card from "../ui/Card";
import TextField from "../ui/TextField";
import Select from "../ui/Select";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import Modal from "../ui/Modal";
import DcrAccountCard from "./DcrAccountCard";
import DcrRegistryCard from "./DcrRegistryCard";
import { useToast } from "../providers/ToastContext";
import { useGlobal } from "../providers/GlobalContext";
import { euAndCandidateCountryOptions } from "../projects/activityConfig";
import $auth from "../../services/$auth";
import $operators from "../../services/$operators";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "OP";
  return `${parts[0][0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

const emptyOperatorForm = {
  legal_name: "",
  address_line_1: "",
  address_line_2: "",
  postcode: "",
  country_code: "",
  ogcr_wallet_address: "",
};

function Profile() {
  const {
    user,
    me,
    meStatus,
    operator,
    operatorId,
    relationship,
    operatorStatus,
    onUpdateGlobal,
    logout,
    refreshOperator,
    deleteOperatorProfile,
  } = useGlobal();
  const { showToast } = useToast();

  const [operatorForm, setOperatorForm] = useState(emptyOperatorForm);
  const [savingOperator, setSavingOperator] = useState(false);

  useEffect(() => {
    if (!operator) return;

    setOperatorForm({
      legal_name: operator.legal_name || "",
      address_line_1: operator.address_line_1 || "",
      address_line_2: operator.address_line_2 || "",
      postcode: operator.postcode || "",
      country_code: operator.country_code || "",
      ogcr_wallet_address: operator.ogcr_wallet_address || "",
    });
  }, [operator]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    emailUpdates: Boolean(user?.preferences?.emailUpdates ?? true),
    securityAlerts: Boolean(user?.preferences?.securityAlerts ?? true),
    productTips: Boolean(user?.preferences?.productTips ?? false),
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");

  const [isDeleteProfileModalOpen, setIsDeleteProfileModalOpen] = useState(false);
  const [deleteProfileConfirmValue, setDeleteProfileConfirmValue] = useState("");
  const [deletingProfile, setDeletingProfile] = useState(false);

  const initials = getInitials(operator?.legal_name || me?.username);

  const handleOperatorFieldChange = (key) => (event) => {
    setOperatorForm((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const handlePasswordChange = (key) => (event) => {
    setPasswordForm((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const handlePreferenceChange = (key) => (event) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: event.target.checked,
    }));
  };

  const handleOperatorSubmit = async (event) => {
    event.preventDefault();

    if (!operatorId) return;

    setSavingOperator(true);

    try {
      // The operator e-mail tracks the account e-mail, but a `me` restored from
      // sessionStorage can be out of date — re-asserting it from a stale copy
      // would write an old address back. PATCH, so omitting it simply leaves
      // the stored value alone.
      await $operators.patch(operatorId, {
        ...operatorForm,
        ...(meStatus === 'fresh' && me?.email ? { email: me.email } : {}),
      });
      await refreshOperator();

      showToast({
        variant: "positive",
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
      setSavingOperator(false);
    }
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast({
        variant: "warning",
        title: "Missing fields",
        description: "Please complete all password fields.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showToast({
        variant: "warning",
        title: "Weak password",
        description: "New password must be at least 8 characters.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({
        variant: "warning",
        title: "Password mismatch",
        description: "New password and confirmation do not match.",
      });
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    showToast({
      variant: "positive",
      title: "Password changed",
      description: "Your password has been updated successfully.",
    });
  };

  const handlePreferencesSubmit = (event) => {
    event.preventDefault();

    onUpdateGlobal?.((prev) => ({
      ...prev,
      user: {
        ...(prev?.user || {}),
        preferences,
      },
    }));

    showToast({
      variant: "positive",
      title: "Preferences saved",
      description: "Notification preferences were updated.",
    });
  };

  const handleDeleteAccount = () => {
    logout();

    setIsDeleteModalOpen(false);
    setDeleteConfirmValue("");

    showToast({
      variant: "warning",
      title: "Account deleted",
      description: "Your account has been removed.",
    });
  };

  const handleDeleteProfileInfo = async () => {
    setDeletingProfile(true);

    try {
      await deleteOperatorProfile();

      setIsDeleteProfileModalOpen(false);
      setDeleteProfileConfirmValue("");

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

  const isDeleteEnabled = deleteConfirmValue.trim().toUpperCase() === "DELETE";
  const isDeleteProfileEnabled = deleteProfileConfirmValue.trim().toUpperCase() === "DELETE";

  return (
    <div className="ogcr-profile">
      <header className="ogcr-profile__hero">
        <div className="ogcr-profile__avatar" aria-hidden="true">{initials}</div>
        <div>
          <h2 className="ogcr-profile__title">Account Settings</h2>
          <p className="ogcr-profile__subtitle">
            Manage your Operator profile, security credentials and account preferences.
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
          {operatorStatus === 'checking' && (
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
            <form className="ogcr-profile__form" onSubmit={handleOperatorSubmit}>
              <TextField
                label="Legal name"
                value={operatorForm.legal_name}
                onChange={handleOperatorFieldChange("legal_name")}
                placeholder="e.g., Agreena, or John Smith"
                required
              />

              <TextField
                type="email"
                label="Email"
                value={me?.email || ""}
                onChange={() => {}}
                disabled
                helperText="Taken from your account email."
              />

              <TextField
                label="Address line 1"
                value={operatorForm.address_line_1}
                onChange={handleOperatorFieldChange("address_line_1")}
                placeholder="Green Street, 20"
                required
              />
              <TextField
                label="Address line 2"
                value={operatorForm.address_line_2}
                onChange={handleOperatorFieldChange("address_line_2")}
                placeholder="Suite 400"
              />

              <div className="ogcr-profile__row">
                <TextField
                  label="Postcode"
                  value={operatorForm.postcode}
                  onChange={handleOperatorFieldChange("postcode")}
                  placeholder="10115"
                  required
                />
                <Select
                  label="Country"
                  value={operatorForm.country_code}
                  onChange={handleOperatorFieldChange("country_code")}
                  options={euAndCandidateCountryOptions}
                  placeholder="Select country"
                  required
                />
              </div>

              <TextField
                label="OGCR wallet address"
                value={operatorForm.ogcr_wallet_address}
                onChange={handleOperatorFieldChange("ogcr_wallet_address")}
                placeholder="0x..."
                required
              />

              {relationship && (
                <p className="ogcr-card__subtitle">Your role: <strong>{relationship}</strong></p>
              )}

              <div className="ogcr-profile__actions">
                <Button type="submit" disabled={savingOperator}>
                  {savingOperator ? "Saving..." : "Save profile information"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  tone="negative"
                  disabled={savingOperator}
                  onClick={() => setIsDeleteProfileModalOpen(true)}
                >
                  Delete profile information
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/*
          Roles, capabilities and provider ids are diagnostic detail — useful
          while wiring up DCR, noise for an operator. Dev builds only.
        */}
        {import.meta.env.DEV && <DcrAccountCard />}

        {operatorStatus === 'linked' && (
          <DcrRegistryCard operator={operator} operatorId={operatorId} />
        )}

        <Card
          className="ogcr-profile__card"
          title="Change Password"
          subtitle="Keep your account secure with a strong password."
        >
          <form className="ogcr-profile__form" onSubmit={handlePasswordSubmit}>
            <TextField
              type="password"
              label="Current password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange("currentPassword")}
              required
            />
            <TextField
              type="password"
              label="New password"
              helperText="Use at least 8 characters."
              value={passwordForm.newPassword}
              onChange={handlePasswordChange("newPassword")}
              required
            />
            <TextField
              type="password"
              label="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange("confirmPassword")}
              required
            />

            <div className="ogcr-profile__actions">
              <Button type="submit">Update password</Button>
            </div>
          </form>
        </Card>

        <Card
          className="ogcr-profile__card"
          title="Notification Preferences"
          subtitle="Choose what updates you receive."
        >
          <form className="ogcr-profile__form" onSubmit={handlePreferencesSubmit}>
            <div className="ogcr-profile__checks">
              <Checkbox
                checked={preferences.emailUpdates}
                onChange={handlePreferenceChange("emailUpdates")}
                label="Operational updates"
                description="Status and workflow notifications."
              />
              <Checkbox
                checked={preferences.securityAlerts}
                onChange={handlePreferenceChange("securityAlerts")}
                label="Security alerts"
                description="Sign-ins, suspicious activity and changes."
              />
              <Checkbox
                checked={preferences.productTips}
                onChange={handlePreferenceChange("productTips")}
                label="Product tips"
                description="Feature tips and usage best practices."
              />
            </div>

            <div className="ogcr-profile__actions">
              <Button variant="outlined" type="submit">Save preferences</Button>
            </div>
          </form>
        </Card>

        <Card
          className="ogcr-profile__card ogcr-profile__card--danger"
          title="Danger Zone"
          subtitle="Delete your account and all associated data."
        >
          <div className="ogcr-profile__danger">
            <p className="ogcr-profile__danger-text">
              This action is permanent and cannot be undone.
            </p>
            <Button
              type="button"
              tone="negative"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete account
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmValue("");
        }}
        title="Delete account"
        subtitle="Type DELETE to confirm account deletion."
        primaryAction={{
          label: "Delete permanently",
          onClick: handleDeleteAccount,
          disabled: !isDeleteEnabled,
          tone: "negative",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setIsDeleteModalOpen(false);
            setDeleteConfirmValue("");
          },
          variant: "outlined",
        }}
      >
        <TextField
          label="Confirmation"
          placeholder="Type DELETE"
          value={deleteConfirmValue}
          onChange={(event) => setDeleteConfirmValue(event.target.value)}
          helperText="This action removes your profile from Operator Platform."
        />
      </Modal>

      <Modal
        isOpen={isDeleteProfileModalOpen}
        onClose={() => {
          if (deletingProfile) return;
          setIsDeleteProfileModalOpen(false);
          setDeleteProfileConfirmValue("");
        }}
        title="Delete profile information"
        subtitle="Type DELETE to confirm removing your Operator profile."
        primaryAction={{
          label: deletingProfile ? "Deleting..." : "Delete permanently",
          onClick: handleDeleteProfileInfo,
          disabled: !isDeleteProfileEnabled || deletingProfile,
          tone: "negative",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setIsDeleteProfileModalOpen(false);
            setDeleteProfileConfirmValue("");
          },
          variant: "outlined",
          disabled: deletingProfile,
        }}
      >
        <TextField
          label="Confirmation"
          placeholder="Type DELETE"
          value={deleteProfileConfirmValue}
          onChange={(event) => setDeleteProfileConfirmValue(event.target.value)}
          helperText="This removes your Operator and its link to your account. You will need to set it up again."
        />
      </Modal>
    </div>
  );
}

export default Profile;
