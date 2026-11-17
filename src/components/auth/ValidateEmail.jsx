import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EnvelopeIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Button, Card, Input, Message } from "@majistudio/ogcr-design-system";
import useResendValidation from "./useResendValidation";
import $auth from "../../services/$auth";

/**
 * Where the confirmation link lands: `/validate-email?token=…`. The token is
 * posted on arrival, so the link alone finishes the job. Without a token (or
 * after a failure) the user can paste one, or ask for a new e-mail.
 */
function ValidateEmail({ onOpenLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkToken = (searchParams.get("token") || "").trim();

  const [status, setStatus] = useState(linkToken ? "validating" : "idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const resend = useResendValidation();

  // Tokens are single-use: StrictMode's second effect run must not post again.
  const postedFor = useRef(null);

  const validate = (value) => {
    setStatus("validating");
    setError("");

    $auth.validateEmail(value)
      .then(() => setStatus("done"))
      .catch((err) => {
        setError($auth.getErrorMessage(err));
        setStatus("failed");
      });
  };

  useEffect(() => {
    if (!linkToken || postedFor.current === linkToken) return;
    postedFor.current = linkToken;

    $auth.validateEmail(linkToken)
      .then(() => setStatus("done"))
      .catch((err) => {
        setError($auth.getErrorMessage(err));
        setStatus("failed");
      });
  }, [linkToken]);

  return (
    <div className="ogcr-projects">
      <Card
        title="Confirm your e-mail"
        subtitle="Your account lives on the DCR platform, which asks you to confirm the address first."
        trailing={<SealCheckIcon size={18} weight="duotone" />}
      >
        <div className="ogcr-form-stack">
          {status === "validating" && (
            <p className="ogcr-card__subtitle">Confirming your e-mail…</p>
          )}

          {status === "done" && (
            <>
              <Message
                state="success"
                title="E-mail confirmed"
                description="Your account is ready. Sign in to continue."
              />
              <div>
                <Button
                  variant="filled"
                  onClick={() => {
                    navigate("/", { replace: true });
                    onOpenLogin?.();
                  }}
                >
                  Sign in
                </Button>
              </div>
            </>
          )}

          {status === "failed" && (
            <Message
              state="error"
              title="Could not confirm the e-mail"
              description={`${error} The link may have expired or been used already — ask for a new one below.`}
            />
          )}

          {(status === "idle" || status === "failed") && (
            <>
              <Input
                type="text"
                iconLeft={<SealCheckIcon />}
                label="Confirmation token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste the token from the e-mail"
              />
              <div>
                <Button
                  variant="outlined"
                  disabled={!token.trim()}
                  onClick={() => validate(token.trim())}
                >
                  Confirm
                </Button>
              </div>

              <Input
                type="email"
                iconLeft={<EnvelopeIcon />}
                label="Need a new link?"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@domain.com"
                helperText="Enter the address you signed up with."
              />
              {Boolean(resend.notice) && (
                <Message
                  state={resend.notice.variant}
                  title={resend.notice.title}
                  description={resend.notice.description}
                  onDismiss={resend.clear}
                />
              )}
              <div>
                <Button
                  variant="outlined"
                  disabled={resend.sending || !email.trim()}
                  onClick={() => resend.send({ email })}
                >
                  {resend.sending ? "Sending…" : "Send a new confirmation e-mail"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ValidateEmail;
