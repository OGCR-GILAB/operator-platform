import api, {
  clearSession,
  getErrorCode,
  getErrorMessage,
  getFieldErrors,
  onUnauthorized,
  persistSession,
  restoreSession,
  setToken,
  getToken,
} from "./$api";

// Public endpoints: a 401 here means "wrong credentials", not "session expired",
// so they opt out of the global unauthorized handler.
const PUBLIC = { skipUnauthorized: true };

class $auth {
  /**
   * Create the DCR user *and* the local mirror. This is the only path that makes
   * e-mail validation and the operator-membership flow work — posting straight
   * to DCR skips the mirror and the user can never join an operator.
   */
  async register({ email, password, first_name, last_name, username }) {
    const { data } = await api.post('/auth/register/', {
      email,
      password,
      first_name,
      last_name,
      // Optional: the API derives it from the e-mail when omitted.
      ...(username ? { username } : {}),
    }, PUBLIC);

    return data;
  }

  /** Confirm the address with the token from the e-mail DCR sent. */
  async validateEmail(token) {
    const { data } = await api.post('/auth/validate-email/', { token }, PUBLIC);
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
    const { data } = await api.post('/auth/password-reset/', { email }, PUBLIC);
    return data;
  }

  async certificationSchemes() {
    const { data } = await api.get('/auth/dcr/certification-schemes/');
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

  // --- error helpers, kept here so components have one import ------------
  getErrorMessage(err) { return getErrorMessage(err); }
  getFieldErrors(err) { return getFieldErrors(err); }
  getErrorCode(err) { return getErrorCode(err); }
}

export default new $auth();
