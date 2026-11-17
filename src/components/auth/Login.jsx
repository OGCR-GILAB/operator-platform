import { useState } from "react";
import { useGlobal } from "../providers/GlobalContext";
import { EnvelopeIcon, EyeClosedIcon, EyeIcon, LockIcon } from "@phosphor-icons/react";
import { useToast } from "../providers/ToastContext";
import { useNavigate } from "react-router-dom";
import $auth from "../../services/$auth";
import { Input, Message } from "@majistudio/ogcr-design-system";
import useResendValidation from "./useResendValidation";
import Dialog from "../ui/Dialog";

// The API does not pin down how DCR refuses an unconfirmed address, so match
// the code or the wording. "validat", not "valid": DCR's wrong-password reply
// is "Invalid login credentials".
const isUnvalidatedError = (err) => /validat|verif|confirm/i.test(
  `${$auth.getErrorCode(err) || ""} ${$auth.getErrorMessage(err)}`,
);

function Login({ open, onClose, onOpenRegister }) {
  const { onUpdateGlobal } = useGlobal();
  const { showToast, clearToasts } = useToast();
  const [passwordType, setPasswordType] = useState("password");
  const navigate = useNavigate();

  // 'signIn' or 'reset' — the reset form asks DCR to e-mail a link.
  const [stage, setStage] = useState("signIn");
  const [resetEmail, setResetEmail] = useState("");
  const [resetNotice, setResetNotice] = useState(null);

  const [state, setState] = useState({
    email: '',
    password: ''
  })

  const [error, setError] = useState({});

  const [loading, setLoading] = useState(false);
  const [unvalidated, setUnvalidated] = useState(false);
  const resend = useResendValidation();

  const fieldError = (name) => {
    const value = error[name];
    if (!value) return "";
    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  const handleSignIn = async () => {
    setError({});
    setUnvalidated(false);
    resend.clear();
    clearToasts();
    setLoading(true);

    try {
      const { user: me } = await $auth.login(state);

      $auth.persistSession(me);
      onUpdateGlobal(current => ({ ...current, me, loggedIn: true, operatorStatus: 'idle' }));
      showToast({ variant: "success", title: "Signed In", description: "You have successfully signed in." });
      onClose();
      navigate('/overview');
    } catch (err) {
      const fields = $auth.getFieldErrors(err);
      setError(Object.keys(fields).length ? fields : { non_field_errors: $auth.getErrorMessage(err) });
      setUnvalidated(isUnvalidatedError(err));
    } finally {
      setLoading(false);
    }
  };

  // By design this always answers 202, so account existence is never leaked.
  // It answers 503 while the deployment lacks its DCR service account.
  const handleReset = async () => {
    setResetNotice(null);
    setLoading(true);

    try {
      await $auth.passwordReset(resetEmail.trim());
      setResetNotice({
        variant: "success",
        title: "Check your e-mail",
        description: "If that address has an account, a reset link is on its way.",
      });
    } catch (err) {
      setResetNotice(err?.response?.status === 503
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
      setLoading(false);
    }
  };

  if (stage === "reset") {
    return (
      <Dialog
        open={open}
        onOpenChange={(open) => { if (!open) onClose(); }}
        size="m"
        title="Reset your password"
        description="We will e-mail you a link to set a new password."
        primaryAction={{
          label: loading ? "Sending…" : "Send reset link",
          onClick: handleReset,
          disabled: loading || !resetEmail.trim(),
          closeOnClick: false,
        }}
        secondaryAction={{
          label: "Back to Sign In",
          onClick: () => { setStage("signIn"); setResetNotice(null); },
          disabled: loading,
          closeOnClick: false,
        }}
      >
        <div className="ogcr-form-stack">
          {Boolean(resetNotice) && (
            <Message
              state={resetNotice.variant}
              type="floating"
              title={resetNotice.title}
              description={resetNotice.description}
              onDismiss={() => setResetNotice(null)}
            />
          )}
          <Input
            required
            type="email"
            iconLeft={<EnvelopeIcon />}
            label="Email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="you@domain.com"
          />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="m"
      title="Sign In"
      description="Enter your credentials to access your account."
      primaryAction={{ label: "Sign In", onClick: handleSignIn, disabled: loading, closeOnClick: false }}
      secondaryAction={{ label: "Cancel", disabled: loading }}
    >
      <div className="ogcr-form-stack">
        {Boolean(error.non_field_errors) && (
          <Message
            onDismiss={() => { setError({}); setUnvalidated(false); }}
            state="error"
            type="floating"
            title={"Sign In Failed"}
            description={unvalidated
              ? `${error.non_field_errors} Open the link we e-mailed you, or ask for a new one.`
              : error.non_field_errors}
            actionLabel={unvalidated ? (resend.sending ? "Sending…" : "Resend confirmation e-mail") : undefined}
            onAction={() => { if (!resend.sending) resend.send({ email: state.email }); }}
          />
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
          type="email"
          iconLeft={<EnvelopeIcon />}
          label="Email"
          value={state.email}
          onChange={(e) => setState({ ...state, email: e.target.value })}
          placeholder="you@domain.com"
          error={Boolean(error.email) || Boolean(error.non_field_errors)}
          helperText={fieldError('email') || "Your username also works here."}
        />
        <Input
          required
          type={passwordType}
          iconLeft={<LockIcon />}
          iconRight={passwordType === 'password' ? <EyeIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('text')} /> : <EyeClosedIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('password')} />}
          label="Password"
          value={state.password}
          onChange={(e) => setState({ ...state, password: e.target.value })}
          placeholder="Enter your password"
          error={Boolean(error.password) || Boolean(error.non_field_errors)}
          helperText={fieldError('password')}
        />

        <span className="text-body-s ogcr-card__subtitle">
          <a onClick={() => setStage("reset")} className="text-link font-bold cursor-pointer">Forgot your password?</a>
          {" · "}
          <a onClick={() => resend.send({ email: state.email })} className="text-link font-bold cursor-pointer">
            Resend confirmation e-mail
          </a>
        </span>

        <span className="text-body-s ogcr-card__subtitle">You don't have an account? <a onClick={onOpenRegister} className="text-link font-bold cursor-pointer" >Sign up here</a></span>
      </div>
    </Dialog>
  )
}

export default Login;
