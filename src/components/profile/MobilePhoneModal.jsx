import { useState } from "react";
import { Message } from "@majistudio/ogcr-design-system";
import ContactPhoneField from "../ui/ContactPhoneField";
import { joinPhone, phoneProblem, splitPhone } from "../ui/phone";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import $auth from "../../services/$auth";
import Dialog from "../ui/Dialog";

const PHONE_HINT = "International format: choose the country code, then the number without the leading 0.";

/**
 * The user's own mobile number, stored on the DCR account (not the operator's
 * contact phone). `PUT auth/me/mobile-phone/` answers with the refreshed `me`.
 * Mounted only while open, so every opening starts from the stored number.
 */
function MobilePhoneModal({ onClose }) {
  const { dcr, applyMe } = useGlobal();
  const { showToast } = useToast();
  const stored = dcr?.mobile_phone_number || "";

  const [phone, setPhone] = useState(() => splitPhone(stored));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [fieldError, setFieldError] = useState("");

  const storedParts = splitPhone(stored);
  const value = joinPhone(phone.countryCode, phone.number);
  const changed = value !== joinPhone(storedParts.countryCode, storedParts.number);

  const handleChange = (part) => (value) => {
    setPhone({ ...phone, [part]: value });
    if (fieldError) setFieldError("");
  };

  const handleSave = async () => {
    setNotice(null);
    setFieldError("");

    const problem = phoneProblem(phone.countryCode, phone.number);
    if (problem) {
      setFieldError(problem);
      return;
    }

    setSaving(true);

    try {
      const me = await $auth.setMobilePhone(value);
      showToast({ variant: "success", title: "Mobile phone saved", description: "It is stored on your DCR account." });
      applyMe(me);
      onClose();
    } catch (err) {
      if (err?.response?.status === 401) return;
      const fields = $auth.getFieldErrors(err);
      if (fields.mobile_phone_number) setFieldError(fields.mobile_phone_number);
      else setNotice({ variant: "error", title: "Could not save the number", description: $auth.getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) { if (!saving) onClose(); } }}
      size="m"
      title={stored ? "Edit mobile phone" : "Add mobile phone"}
      description="Your own number on the DCR account, e.g. +33 6 12 34 56 78."
      primaryAction={{
        label: saving ? "Saving..." : "Save number",
        onClick: handleSave,
        disabled: saving || !value || !changed,
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: saving }}
    >
      <div className="ogcr-form-stack">
        {notice && (
          <Message
            state={notice.variant}
            title={notice.title}
            description={notice.description}
            onDismiss={() => setNotice(null)}
          />
        )}

        <ContactPhoneField
          label="Mobile phone"
          countryCode={phone.countryCode}
          phone={phone.number}
          onCountryCodeChange={handleChange("countryCode")}
          onPhoneChange={handleChange("number")}
          disabled={saving}
          error={Boolean(fieldError)}
          helperText={fieldError || PHONE_HINT}
        />
      </div>
    </Dialog>
  );
}

export default MobilePhoneModal;
