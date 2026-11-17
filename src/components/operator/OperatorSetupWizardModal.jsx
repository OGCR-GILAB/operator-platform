import { useState } from "react";
import { BuildingOfficeIcon, MapPinIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import useSignOut from "../auth/useSignOut";
import $auth from "../../services/$auth";
import $operators from "../../services/$operators";
import { Button, FormFooter, Input, Message, Select } from "@majistudio/ogcr-design-system";
import Dialog from "../ui/Dialog";
import Loader from "../ui/Loader";
import ContactPhoneField from "../ui/ContactPhoneField";
import { joinPhone } from "../ui/phone";
import useCountryOptions from "../projects/useCountryOptions";

const wizardSteps = [
  {
    title: "Legal Name & Contact",
    icon: BuildingOfficeIcon,
    description: "Tell us who the Operator is — a person or a company.",
  },
  {
    title: "Address",
    icon: MapPinIcon,
    description: "Where is the Operator registered?",
  },
  {
    title: "Your role",
    icon: UserCircleIcon,
    description: "Tell us your role at this Operator.",
  },
];

const initialForm = {
  legal_name: "",
  address_line_1: "",
  address_line_2: "",
  postcode: "",
  country_code: "",
  phone_code: "",
  phone_number: "",
  relationship: "",
};

function OperatorSetupWizardModal({ isOpen }) {
  const { me, refreshOperator } = useGlobal();
  const { showToast } = useToast();
  const signOut = useSignOut();
  const countryOptions = useCountryOptions();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateCompanyStep = () => {
    if (!form.legal_name) {
      setError("Please provide the Operator's legal name.");
      return false;
    }
    return true;
  };

  const validateAddressStep = () => {
    if (!form.address_line_1 || !form.postcode || !form.country_code) {
      setError("Please complete the address and select a country.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");

    if (step === 0 && !validateCompanyStep()) return;
    if (step === 1 && !validateAddressStep()) return;

    setStep((current) => Math.min(current + 1, wizardSteps.length - 1));
  };

  const handleBack = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    if (!form.relationship) {
      setError("Please describe your relationship to this Operator.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Creating the Operator makes the current user its first member,
      // so the relationship travels with the same request. The OGCR wallet is
      // not sent: the registry assigns it when the operator is registered.
      await $operators.create({
        legal_name: form.legal_name,
        email: me?.email,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2,
        postcode: form.postcode,
        country_code: form.country_code,
        phone: joinPhone(form.phone_code, form.phone_number),
        relationship: form.relationship,
      });

      await refreshOperator();

      showToast({
        variant: "success",
        title: "Operator profile created",
        description: `${form.legal_name} has been linked to your account.`,
      });
    } catch (err) {
      setError($auth.getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // No onOpenChange: the gate cannot be dismissed (see the footer).
    <Dialog
      open={isOpen}
      title="Set up your Operator profile"
      description={wizardSteps[step].description}
      size="xl"
      showClose={false}
    >
      <div className="ogcr-project-wizard">
        <ol
          className="ogcr-project-wizard__steps"
          aria-label="Operator setup wizard steps"
        >
          {wizardSteps.map((wizardStep, index) => {
            const state =
              index < step ? "done" : index === step ? "active" : "upcoming";

            return (
              <li
                key={wizardStep.title}
                className={`ogcr-project-wizard__step ogcr-project-wizard__step--${state}`}
              >
                <span className="ogcr-project-wizard__step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className="ogcr-project-wizard__step-title">{wizardStep.title}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="ogcr-project-wizard__body">
          {Boolean(error) && (
            <Message onDismiss={() => setError("")} state="error" type="floating" title="Setup failed" description={error} />
          )}

          {step === 0 && (
            <div className="ogcr-project-wizard__grid">
              <Input
                label="Legal name"
                placeholder="e.g., Agreena, or John Smith"
                value={form.legal_name}
                onChange={(event) => handleFieldChange("legal_name", event.target.value)}
                required
              />
              <Input
                type="email"
                label="Email"
                value={me?.email || ""}
                onChange={() => {}}
                disabled
                helperText="Taken from your account email."
                required
              />
              <ContactPhoneField
                label="Phone"
                countryCode={form.phone_code}
                phone={form.phone_number}
                onCountryCodeChange={(value) => handleFieldChange("phone_code", value)}
                onPhoneChange={(value) => handleFieldChange("phone_number", value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="ogcr-project-wizard__grid">
              <Input
                label="Address line 1"
                placeholder="Green Street, 20"
                value={form.address_line_1}
                onChange={(event) => handleFieldChange("address_line_1", event.target.value)}
                required
              />
              <Input
                label="Address line 2"
                placeholder="Suite 400"
                value={form.address_line_2}
                onChange={(event) => handleFieldChange("address_line_2", event.target.value)}
              />
              <Input
                label="Postcode"
                placeholder="10115"
                value={form.postcode}
                onChange={(event) => handleFieldChange("postcode", event.target.value)}
                required
              />
              <Select
                label="Country"
                value={form.country_code || null}
                onValueChange={(value) => handleFieldChange("country_code", value)}
                options={countryOptions}
                placeholder="Select country"
                required
              />
            </div>
          )}

          {step === 2 && (
            <div className="ogcr-project-wizard__grid">
              <Input
                label="Your relationship to this Operator"
                placeholder="e.g., Managing Director, Employee, Accountant"
                value={form.relationship}
                onChange={(event) => handleFieldChange("relationship", event.target.value)}
                required
              />
            </div>
          )}
        </div>
      </div>

      <FormFooter>
        {step < wizardSteps.length - 1 ? (
          <Button variant="filled" onClick={handleNext} disabled={submitting}>
            Next
          </Button>
        ) : (
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={submitting}
            iconLeft={submitting ? <Loader variant="spinner" size="s" label="Creating Operator" /> : null}
          >
            {submitting ? "Creating..." : "Create Operator"}
          </Button>
        )}

        {step > 0 && (
          <Button variant="outlined" onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}

        {/*
          The gate cannot be dismissed — that is deliberate, an account without an
          Operator has nothing to do in the app. But the top bar's Sign Out sits
          behind this overlay, so without this button there is no way back out.
        */}
        <Button
          className="ml-auto"
          variant="text"
          onClick={signOut}
          disabled={submitting}
        >
          Sign out
        </Button>
      </FormFooter>
    </Dialog>
  );
}

export default OperatorSetupWizardModal;
