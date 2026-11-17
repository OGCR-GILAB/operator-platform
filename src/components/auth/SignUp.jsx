import { useState } from "react";
import { AddressBookIcon, ArrowLeftIcon, CheckIcon, EnvelopeIcon, EyeClosedIcon, EyeIcon, LockIcon, SealCheckIcon, XIcon } from "@phosphor-icons/react";
import { Button, Input, Message } from "@majistudio/ogcr-design-system";
import ContactPhoneField from "../ui/ContactPhoneField";
import { joinPhone, phoneProblem } from "../ui/phone";
import usePasswordPolicy, { checkPassword } from "./usePasswordPolicy";
import useResendValidation from "./useResendValidation";
import $auth from "../../services/$auth";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import { useNavigate } from "react-router-dom";
import Dialog from "../ui/Dialog";

function SignUp({ open, onClose, onOpenLogin }) {
  const { onUpdateGlobal } = useGlobal();
  const { showToast, clearToasts } = useToast();
  const navigate = useNavigate();
  const [passwordType, setPasswordType] = useState("password");
  const [loading, setLoading] = useState(false);

  // 'form' collects the account; 'validate' asks for the token from DCR's e-mail.
  const [stage, setStage] = useState("form");
  const [validationNotice, setValidationNotice] = useState("");
  const [token, setToken] = useState("");
  const resend = useResendValidation();

  // DCR's own rules, checked as the user types. Unknown (503) means no check:
  // the API and DCR still validate on submit.
  const { policy, description: passwordDescription } = usePasswordPolicy();

  const [state, setState] = useState({
    email: '',
    username: '',
    password: '',
    repeat: '',
    first_name: '',
    last_name: '',
    phoneCountryCode: '',
    phoneNumber: '',
  })

  const passwordCheck = checkPassword(policy, state.password);

  const [error, setError] = useState({});

  const validatePasswordField = () => {
    const { password, repeat } = state;

    if (password === '' && repeat === '') {
      return null
    }

    if (password !== repeat) {
      return <XIcon className="text-icon-negative" />
    }

    if (password === repeat) {
      return <CheckIcon className="text-icon-positive" />
    }
  }

  const fieldError = (name) => {
    const value = error[name];
    if (!value) return "";
    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  // Shared tail of both stages: sign in and land the user in the app.
  const signIn = async () => {
    const { user: me } = await $auth.login({
      username: state.username || state.email,
      password: state.password,
    });

    $auth.persistSession(me);
    onUpdateGlobal(current => ({ ...current, me, loggedIn: true, operatorStatus: 'idle' }));
    showToast({ variant: "success", title: "Account created", description: "Welcome! You have been signed in." });
    onClose();
    navigate('/overview');
  };

  const handleRegister = async () => {
    setError({});

    if (passwordCheck.valid === false) {
      setError({ password: passwordCheck.hint });
      return;
    }

    if (state.password !== state.repeat) {
      setError({ repeat: "Passwords do not match." });
      return;
    }

    const phoneError = phoneProblem(state.phoneCountryCode, state.phoneNumber);
    if (phoneError) {
      setError({ mobile_phone_number: phoneError });
      return;
    }

    clearToasts();
    setLoading(true);

    try {
      // POST auth/register/ creates the DCR user *and* the local mirror. Posting
      // to DCR directly skips the mirror and the account can never join an operator.
      const { detail } = await $auth.register({
        ...state,
        mobile_phone_number: joinPhone(state.phoneCountryCode, state.phoneNumber),
      });

      // DCR asks for e-mail validation for some deployments; `detail` says so.
      if (/valid/i.test(detail || '')) {
        setValidationNotice(detail);
        setStage("validate");
        return;
      }

      await signIn();
    } catch (err) {
      const fields = $auth.getFieldErrors(err);
      setError(Object.keys(fields).length ? fields : { non_field_errors: $auth.getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    setError({});
    setLoading(true);

    try {
      await $auth.validateEmail(token.trim());
      await signIn();
    } catch (err) {
      const fields = $auth.getFieldErrors(err);
      setError(Object.keys(fields).length ? fields : { non_field_errors: $auth.getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (stage === "validate") {
    return (
      <Dialog
        open={open}
        onOpenChange={(open) => { if (!open) onClose(); }}
        size="m"
        title="Confirm your e-mail"
        description="We sent you a confirmation link. Paste the token from that e-mail to finish."
        primaryAction={{
          label: "Confirm",
          onClick: handleValidate,
          disabled: loading || !token.trim(),
          closeOnClick: false,
        }}
        secondaryAction={{ label: "Cancel", disabled: loading }}
      >

        <div className="ogcr-form-stack">
          {Boolean(error.non_field_errors) && (
            <Message onDismiss={() => { setError({}) }} state="error" type="floating" title={"Confirmation Failed"} description={error.non_field_errors} />
          )}
          {Boolean(validationNotice) && (
            <Message state="success" title={"Account created"} description={validationNotice} />
          )}
          {Boolean(resend.notice) && (
            <Message
              state={resend.notice.variant}
              title={resend.notice.title}
              description={resend.notice.description}
              onDismiss={resend.clear}
            />
          )}
          <Input
            required
            type="text"
            iconLeft={<SealCheckIcon />}
            label="Validation token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token from the e-mail"
            error={Boolean(error.token) || Boolean(error.non_field_errors)}
            helperText={fieldError('token') || "Or simply open the link in the e-mail."}
          />
          <span className="text-body-s ogcr-card__subtitle flex flex-row flex-wrap gap-8 items-center">
            No e-mail?
            <Button
              variant="text"
              size="s"
              disabled={resend.sending}
              onClick={() => resend.send({ email: state.email, username: state.username })}
            >
              {resend.sending ? "Sending…" : "Send it again"}
            </Button>
          </span>
          <span className="text-body-s ogcr-card__subtitle flex flex-row gap-8 items-center text-text-positive"><ArrowLeftIcon /> <a onClick={onOpenLogin} className="text-link font-bold cursor-pointer">Back to Sign In</a></span>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="m"
      title="Sign Up"
      description="Enter your personal information to create your account."
      primaryAction={{
        label: "Sign Up",
        onClick: handleRegister,
        disabled: loading,
        closeOnClick: false,
      }}
      secondaryAction={{ label: "Cancel", disabled: loading }}
    >

      <div className="ogcr-form-stack">
        {Boolean(error.non_field_errors) && (
          <Message onDismiss={() => { setError({}) }} state="error" type="floating" title={"Sign Up Failed"} description={error.non_field_errors} />
        )}
        <Input
          required
          type="text"
          iconLeft={<AddressBookIcon />}
          label="First Name"
          value={state.first_name}
          onChange={(e) => setState({ ...state, first_name: e.target.value })}
          placeholder="Enter your first name"
          error={Boolean(error.first_name) || Boolean(error.non_field_errors)}
          helperText={fieldError('first_name')}
        />
        <Input
          required
          type="text"
          iconLeft={<AddressBookIcon />}
          label="Last Name"
          value={state.last_name}
          onChange={(e) => setState({ ...state, last_name: e.target.value })}
          placeholder="Enter your last name"
          error={Boolean(error.last_name) || Boolean(error.non_field_errors)}
          helperText={fieldError('last_name')}
        />
        <Input
          type="text"
          iconLeft={<AddressBookIcon />}
          label="Username"
          value={state.username}
          onChange={(e) => setState({ ...state, username: e.target.value })}
          placeholder="Choose a username"
          error={Boolean(error.username) || Boolean(error.non_field_errors)}
          helperText={fieldError('username') || "Optional — derived from your e-mail if left blank."}
        />
        <Input
          required
          type="email"
          iconLeft={<EnvelopeIcon />}
          label="Email"
          value={state.email}
          onChange={(e) => setState({ ...state, email: e.target.value })}
          placeholder="you@domain.com"
          error={Boolean(error.email) || Boolean(error.non_field_errors)}
          helperText={fieldError('email')}
        />
        <ContactPhoneField
          label="Mobile phone"
          countryCode={state.phoneCountryCode}
          phone={state.phoneNumber}
          onCountryCodeChange={(value) => {
            setState({ ...state, phoneCountryCode: value });
            if (error.mobile_phone_number) setError({ ...error, mobile_phone_number: undefined });
          }}
          onPhoneChange={(value) => {
            setState({ ...state, phoneNumber: value });
            if (error.mobile_phone_number) setError({ ...error, mobile_phone_number: undefined });
          }}
          error={Boolean(error.mobile_phone_number)}
          helperText={fieldError('mobile_phone_number')
            || "Optional. International format, e.g. +33 6 12 34 56 78: choose the country code, then the number without the leading 0."}
        />
        <Input
          required
          type={passwordType}
          iconLeft={<LockIcon />}
          iconRight={passwordType === 'password' ? <EyeIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('text')} /> : <EyeClosedIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('password')} />}
          label="Password"
          value={state.password}
          onChange={(e) => {
            setState({ ...state, password: e.target.value });
            // The live hint below takes over from a refusal once the user edits.
            if (error.password) setError({ ...error, password: undefined });
          }}
          placeholder="Enter your password"
          error={Boolean(error.password) || Boolean(error.non_field_errors)}
          helperText={fieldError('password')
            || (passwordCheck.valid === true ? "Meets DCR's password rules." : passwordCheck.hint)
            || passwordDescription}
        />

        <Input
          required
          type="password"
          iconLeft={<LockIcon />}
          iconRight={validatePasswordField()}
          label="Repeat Password"
          value={state.repeat}
          onChange={(e) => setState({ ...state, repeat: e.target.value })}
          placeholder="Repeat your password"
          error={Boolean(error.repeat) || Boolean(error.non_field_errors)}
          helperText={fieldError('repeat')}
        />
        <span className="text-body-s ogcr-card__subtitle flex flex-row gap-8 items-center text-text-positive"><ArrowLeftIcon /> <a onClick={onOpenLogin} className="text-link font-bold cursor-pointer">Back to Sign In</a></span>
      </div>
    </Dialog>
  )
}

export default SignUp;
