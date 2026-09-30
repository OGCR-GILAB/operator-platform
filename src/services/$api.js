import axios from "axios";

// OGCR Operator API — middleware between the DCR platform and this frontend.
// https://api-operator.gilab.rs/api/docs/
// Base URL comes from VITE_API_URL in .env (see .env.example); vite.config.js
// refuses to start without it. The API allowlists localhost:3100 / 127.0.0.1:3100 /
// localhost:5173 for CORS, so dev calls it directly.
export const API_BASE_URL = import.meta.env.VITE_API_URL;

const SESSION_KEY = 'ogcr_session';

const api = axios.create({ baseURL: API_BASE_URL });

// Single source of truth for the DirectLogin token; every service shares it.
const session = { token: null };

const unauthorizedHandlers = new Set();

/**
 * Register a callback fired when any call comes back 401 (expired or invalid
 * token). Returns an unsubscribe function.
 */
export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

export function getToken() {
  return session.token;
}

export function setToken(token) {
  session.token = token || null;
}

export function persistSession(me) {
  if (!session.token) return;

  // `dcr` (roles and capabilities) is derived server-side and re-read every few
  // minutes. A cached copy would come back from a reload looking authoritative
  // while being arbitrarily old, so it is never written — only the identity is.
  const identity = { ...(me || {}) };
  delete identity.dcr;

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, me: identity }));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — the in-memory
    // token still carries the current tab.
  }
}

export function restoreSession() {
  try {
    // The token used to live in localStorage. Move any leftover one across so
    // nobody is signed out by the switch, and drop the long-lived copy.
    const migrated = localStorage.getItem(SESSION_KEY);
    if (migrated) {
      localStorage.removeItem(SESSION_KEY);
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY, migrated);
      }
    }

    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const restored = JSON.parse(raw);
    if (!restored?.token) return null;

    session.token = restored.token;

    return restored;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  session.token = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    // Belt and braces: never leave a token behind in the old location.
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

api.interceptors.request.use((config) => {
  if (session.token) {
    config.headers['Authorization'] = `DirectLogin token="${session.token}"`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 on a public endpoint means "these credentials are wrong", not
    // "your session expired" — those calls opt out via `skipUnauthorized`.
    const handled = error?.config?.skipUnauthorized;

    if (error?.response?.status === 401 && !handled) {
      clearSession();
      unauthorizedHandlers.forEach((handler) => {
        try {
          handler(error);
        } catch {
          // A broken listener must not swallow the original rejection.
        }
      });
    }

    return Promise.reject(error);
  },
);

/** Unwrap a paginated list, a bare array, or a single object into an array. */
export function toList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/**
 * Follow `next` until the list is exhausted. There is no `page_size` parameter,
 * so this is the only way to get everything for a map layer or a select.
 */
export async function fetchAllPages(path, params = {}) {
  const collected = [];
  let page = 1;

  for (;;) {
    const { data } = await api.get(path, { params: { ...params, page } });

    collected.push(...toList(data));

    if (Array.isArray(data) || !data?.next) break;
    page += 1;
  }

  return collected;
}

/** Best-effort human-readable message out of either error shape. */
export function getErrorMessage(err) {
  const data = err?.response?.data;

  if (typeof data === 'string') return data;

  if (data && typeof data === 'object') {
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.error) return data.error;

    // DRF field errors: { field: ["message", ...] }
    const firstField = Object.values(data).find(
      (value) => (Array.isArray(value) ? value.length : Boolean(value)),
    );
    if (Array.isArray(firstField)) return String(firstField[0]);
    if (firstField && typeof firstField !== 'object') return String(firstField);
  }

  if (err?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (err?.response?.status === 503) return 'The service is temporarily unavailable. Please try again shortly.';

  return err?.message || 'Something went wrong. Please try again.';
}

/**
 * Field validation errors as `{ field: "first message" }`, so a form can show
 * them inline. Empty when the API answered with a `detail` instead.
 */
export function getFieldErrors(err) {
  const data = err?.response?.data;

  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  if (data.detail || data.message) return {};

  return Object.entries(data).reduce((fields, [key, value]) => {
    if (Array.isArray(value) && value.length) fields[key] = String(value[0]);
    else if (typeof value === 'string') fields[key] = value;
    return fields;
  }, {});
}

/** The API `code` on a detail error, e.g. `dcr_auth_failed` / `dcr_rejected`. */
export function getErrorCode(err) {
  return err?.response?.data?.code || null;
}

export default api;
