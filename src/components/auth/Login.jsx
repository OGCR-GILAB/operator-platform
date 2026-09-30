import { useState } from "react";
import { useGlobal } from "../providers/GlobalContext";
import { EnvelopeIcon, EyeClosedIcon, EyeIcon, LockIcon } from "@phosphor-icons/react";
import Modal from "../ui/Modal";
import TextField from "../ui/TextField";
import Message from "../ui/Message";
import { useToast } from "../providers/ToastContext";
import { useNavigate } from "react-router-dom";
import $auth from "../../services/$auth";

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

  const fieldError = (name) => {
    const value = error[name];
    if (!value) return "";
    return typeof value === 'string' ? value : JSON.stringify(value);
  };

  const handleSignIn = async () => {
    setError({});
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
      <Modal
        isOpen={open}
        onClose={onClose}
        size="md"
        fullscreen={false}
        title="Reset your password"
        subtitle="We will e-mail you a link to set a new password."
        secondaryAction={{
          label: "Back to Sign In",
          onClick: () => { setStage("signIn"); setResetNotice(null); },
          disabled: loading,
        }}
        primaryAction={{
          label: loading ? "Sending…" : "Send reset link",
          disabled: loading || !resetEmail.trim(),
          onClick: handleReset,
        }}>

        <div className="ogcr-form-stack">
          {Boolean(resetNotice) && (
            <Message
              variant={resetNotice.variant}
              floating
              title={resetNotice.title}
              description={resetNotice.description}
              onClose={() => setResetNotice(null)}
            />
          )}
          <TextField
            required
            type="email"
            startIcon={<EnvelopeIcon />}
            label="Email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="you@domain.com"
          />
        </div>

      </Modal>
    );
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
      fullscreen={false}
      title="Sign In"
      subtitle="Enter your credentials to access your account."
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
        disabled: loading,
      }}
      primaryAction={{
        label: "Sign In",
        disabled: loading,
        onClick: handleSignIn,
      }}>

      <div className="ogcr-form-stack">
        {Boolean(error.non_field_errors) && (
          <Message onClose={() => { setError({}) }} variant="error" floating title={"Sign In Failed"} description={error.non_field_errors} />
        )}
        <TextField
          required
          type="email"
          startIcon={<EnvelopeIcon />}
          label="Email"
          value={state.email}
          onChange={(e) => setState({ ...state, email: e.target.value })}
          placeholder="you@domain.com"
          error={Boolean(error.email) || Boolean(error.non_field_errors)}
          helperText={fieldError('email') || "Your username also works here."}
        />
        <TextField
          required
          type={passwordType}
          startIcon={<LockIcon />}
          endIcon={passwordType === 'password' ? <EyeIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('text')} /> : <EyeClosedIcon className="ogcr-clickable-icon transition-transform" onClick={() => setPasswordType('password')} />}
          label="Password"
          value={state.password}
          onChange={(e) => setState({ ...state, password: e.target.value })}
          placeholder="Enter your password"
          error={Boolean(error.password) || Boolean(error.non_field_errors)}
          helperText={fieldError('password')}
        />

        <span className="text-body-s ogcr-card__subtitle">
          <a onClick={() => setStage("reset")} className="text-link font-bold cursor-pointer">Forgot your password?</a>
        </span>

        <span className="text-body-s ogcr-card__subtitle">You don't have an account? <a onClick={onOpenRegister} className="text-link font-bold cursor-pointer" >Sign up here</a></span>
      </div>

    </Modal>
  )
}

export default Login;
