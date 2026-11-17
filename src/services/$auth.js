import api, {
  clearSession,
  getErrorCode,
  getErrorMessage,
  getFieldErrors,
  onServiceError,
  onUnauthorized,
  persistSession,
  restoreSession,
  setToken,
  getToken,
} from "./$api";

// Public endpoints: a 401 here means "wrong credentials", not "session expired",
// so they opt out of the global unauthorized handler.
const PUBLIC = { skipUnauthorized: true };

// Public calls that report 429/503 themselves (password reset/policy, resend
// validation), so the global "too many requests"/"DCR unreachable" toast would
// only repeat it.
const RESET = { ...PUBLIC, skipServiceErrors: true };

class $auth {
  /**
   * Create the DCR user *and* the local mirror. This is the only path that makes
   * e-mail validation and the operator-membership flow work — posting straight
   * to DCR skips the mirror and the user can never join an operator.
   */
  async register({ email, password, first_name, last_name, username, mobile_phone_number }) {
    const { data } = await api.post('/auth/register/', {
      email,
      password,
      first_name,
      last_name,
      // Optional: the API derives it from the e-mail when omitted.
      ...(username ? { username } : {}),
      // Optional, international format ("+33 6 12 34 56 78").
      ...(mobile_phone_number ? { mobile_phone_number } : {}),
    }, PUBLIC);

    return data;
  }

  /**
   * DCR's password rules: `{description, policies[]}`; a password is valid when
   * it matches any one policy. 503 when DCR cannot report them — the caller
   * then lets the user submit and DCR checks.
   */
  async passwordPolicy() {
    const { data } = await api.get('/auth/password-policy/', RESET);
    return data;
  }

  /** Confirm the address with the token from the e-mail DCR sent. */
  async validateEmail(token) {
    const { data } = await api.post('/auth/validate-email/', { token }, PUBLIC);
    return data;
  }

  /** Always answers 202, so account existence is never leaked. Rate limited. */
  async resendValidationEmail({ email, username }) {
    const { data } = await api.post('/auth/resend-validation-email/', {
      email,
      ...(username ? { username } : {}),
    }, RESET);
    return data;
  }

  /** Sets the number on DCR and returns the refreshed `me`. 400 when malformed. */
  async setMobilePhone(mobile_phone_number) {
    const { data } = await api.put('/auth/me/mobile-phone/', { mobile_phone_number });
    return data;
  }

  async login(model) {
    const { data } = await api.post('/auth/login/', {
      username: model.username || model.email,
      password: model.password,
    }, PUBLIC);

    setToken(data.token);

    return data;
  }

  async me() {
    const { data } = await api.get('/auth/me/');
    return data;
  }

  /** Always answers 202 by design, so account existence is never leaked. */
  async passwordReset(email) {
    const { data } = await api.post('/auth/password-reset/', { email }, RESET);
    return data;
  }

  async certificationSchemes() {
    const { data } = await api.get('/auth/dcr/certification-schemes/');
    return data;
  }

  /**
   * Each role the platform needs, checked live on DCR:
   * `{source, bank_id, checked_at, roles[], capabilities}`. Cached 5 minutes
   * server-side; `refresh` re-checks. `source: "profile"` means DCR could not
   * answer and the login-time role list was used. A background read, so a 503
   * is the caller's to explain, not a global "DCR is unreachable" toast.
   */
  async permissions({ refresh = false } = {}) {
    const { data } = await api.get('/auth/dcr/permissions/', {
      params: refresh ? { refresh: 1 } : undefined,
      skipServiceErrors: true,
    });
    return data;
  }

  async logout() {
    // Drop the server-side token -> user mapping, then clear locally either way.
    try {
      if (getToken()) await api.post('/auth/logout/', null, PUBLIC);
    } catch {
      // The local session is cleared below regardless of what the API answers.
    } finally {
      clearSession();
    }
  }

  // --- session plumbing, delegated to the shared client -------------------
  get token() { return getToken(); }
  persistSession(me) { return persistSession(me); }
  restoreSession() { return restoreSession(); }
  onUnauthorized(handler) { return onUnauthorized(handler); }
  onServiceError(handler) { return onServiceError(handler); }

  // --- error helpers, kept here so components have one import ------------
  getErrorMessage(err) { return getErrorMessage(err); }
  getFieldErrors(err) { return getFieldErrors(err); }
  getErrorCode(err) { return getErrorCode(err); }
}

export default new $auth();
