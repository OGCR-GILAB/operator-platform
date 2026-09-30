import { useState } from "react";
import { AddressBookIcon, ArrowLeftIcon, CheckIcon, EnvelopeIcon, EyeClosedIcon, EyeIcon, LockIcon, SealCheckIcon } from "@phosphor-icons/react";
import Modal, { CloseGlyph } from "../ui/Modal";
import TextField from "../ui/TextField";
import Message from "../ui/Message";
import $auth from "../../services/$auth";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";
import { useNavigate } from "react-router-dom";

// DCR's policy: at least 10 characters with upper case, lower case, digits and a
// special character — or longer than 16. The API surfaces DCR's own wording on a
// rejection; this is only the hint shown before the user submits.
const PASSWORD_HINT = "At least 10 characters with upper and lower case, a digit and a special character (or longer than 16).";

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

  const [state, setState] = useState({
    email: '',
    username: '',
    password: '',
    repeat: '',
    first_name: '',
    last_name: ''
  })

  const [error, setError] = useState({});

  const validatePasswordField = () => {
    const { password, repeat } = state;

    if (password === '' && repeat === '') {
      return null
    }

    if (password !== repeat) {
      return <CloseGlyph color="red" />
    }

    if (password === repeat) {
      return <CheckIcon color="green" />
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

    if (state.password !== state.repeat) {
      setError({ repeat: "Passwords do not match." });
      return;
    }

    clearToasts();
    setLoading(true);

    try {
      // POST auth/register/ creates the DCR user *and* the local mirror. Posting
      // to DCR directly skips the mirror and the account can never join an operator.
      const { detail } = await $auth.register(state);

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
      <Modal
        isOpen={open}
        onClose={onClose}
        size="md"
        fullscreen={false}
        title="Confirm your e-mail"
        subtitle="We sent you a confirmation link. Paste the token from that e-mail to finish."
        secondaryAction={{
          label: "Cancel",
          onClick: onClose,
          disabled: loading,
        }}
        primaryAction={{
          label: "Confirm",
          disabled: loading || !token.trim(),
          onClick: handleValidate,
        }}>

        <div className="ogcr-form-stack">
          {Boolean(error.non_field_errors) && (
            <Message onClose={() => { setError({}) }} variant="error" floating title={"Confirmation Failed"} description={error.non_field_errors} />
          )}
          {Boolean(validationNotice) && (
            <Message variant="success" title={"Account created"} description={validationNotice} />
          )}
          <TextField
            required
            type="text"
            startIcon={<SealCheckIcon />}
            label="Validation token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the token from the e-mail"
            error={Boolean(error.token) || Boolean(error.non_field_errors)}
            helperText={fieldError('token')}
          />
          <span className="text-body-s ogcr-card__subtitle flex flex-row gap-2 items-center text-text-positive"><ArrowLeftIcon /> <a onClick={onOpenLogin} className="text-link font-bold cursor-pointer">Back to Sign In</a></span>
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
      title="Sign Up"
      subtitle="Enter your personal information to create your account."
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
        disabled: loading,
      }}
      primaryAction={{
        label: "Sign Up",
        disabled: loading,
        onClick: handleRegister,
      }}>

      <div className="ogcr-form-stack">
        {Boolean(error.non_field_errors) && (
          <Message onClose={() => { setError({}) }} variant="error" floating title={"Sign Up Failed"} description={error.non_field_errors} />
        )}
        <TextField
          required
          type="text"
          startIcon={<AddressBookIcon />}
          label="First Name"
          value={state.first_name}
          onChange={(e) => setState({ ...state, first_name: e.target.value })}
          placeholder="Enter your first name"
          error={Boolean(error.first_name) || Boolean(error.non_field_errors)}
          helperText={fieldError('first_name')}
        />
        <TextField
          required
          type="text"
          startIcon={<AddressBookIcon />}
          label="Last Name"
          value={state.last_name}
          onChange={(e) => setState({ ...state, last_name: e.target.value })}
          placeholder="Enter your last name"
          error={Boolean(error.last_name) || Boolean(error.non_field_errors)}
          helperText={fieldError('last_name')}
        />
        <TextField
          type="text"
          startIcon={<AddressBookIcon />}
          label="Username"
          value={state.username}
          onChange={(e) => setState({ ...state, username: e.target.value })}
          placeholder="Choose a username"
          error={Boolean(error.username) || Boolean(error.non_field_errors)}
          helperText={fieldError('username') || "Optional — derived from your e-mail if left blank."}
        />
        <TextField
          required
          type="email"
          startIcon={<EnvelopeIcon />}
          label="Email"
          value={state.email}
          onChange={(e) => setState({ ...state, email: e.target.value })}
          placeholder="you@domain.com"
          error={Boolean(error.email) || Boolean(error.non_field_errors)}
          helperText={fieldError('email')}
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
          helperText={fieldError('password') || PASSWORD_HINT}
        />

        <TextField
          required
          type="password"
          startIcon={<LockIcon />}
          endIcon={validatePasswordField()}
          label="Repeat Password"
          value={state.repeat}
          onChange={(e) => setState({ ...state, repeat: e.target.value })}
          placeholder="Repeat your password"
          error={Boolean(error.repeat) || Boolean(error.non_field_errors)}
          helperText={fieldError('repeat')}
        />
        <span className="text-body-s ogcr-card__subtitle flex flex-row gap-2 items-center text-text-positive"><ArrowLeftIcon /> <a onClick={onOpenLogin} className="text-link font-bold cursor-pointer">Back to Sign In</a></span>
      </div>

    </Modal>
  )
}

export default SignUp;
