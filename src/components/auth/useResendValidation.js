import { useCallback, useState } from "react";
import $auth from "../../services/$auth";

/**
 * `POST auth/resend-validation-email/`. The API always answers 202, so the
 * notice never claims the account exists; only a rate limit or an outage is
 * reported as a failure.
 */
export default function useResendValidation() {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const send = useCallback(async ({ email, username } = {}) => {
    const address = String(email || "").trim();

    if (!address.includes("@")) {
      setNotice({
        variant: "warning",
        title: "E-mail needed",
        description: "Enter the e-mail address you signed up with, then try again.",
      });
      return;
    }

    setSending(true);
    setNotice(null);

    try {
      await $auth.resendValidationEmail({ email: address, username: String(username || "").trim() });
      setNotice({
        variant: "success",
        title: "Check your inbox",
        description: `If ${address} still needs confirming, a new link is on its way.`,
      });
    } catch (err) {
      setNotice({
        variant: "error",
        title: err?.response?.status === 429 ? "Too many requests" : "Could not send the e-mail",
        description: err?.response?.status === 429
          ? "Please wait a minute before asking again."
          : $auth.getErrorMessage(err),
      });
    } finally {
      setSending(false);
    }
  }, []);

  const clear = useCallback(() => setNotice(null), []);

  return { send, sending, notice, clear };
}
