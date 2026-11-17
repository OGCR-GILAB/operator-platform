import { useCallback, useEffect, useState } from "react";
import { GlobalContext } from "./GlobalContext";
import $auth from "../../services/$auth";
import $operators from "../../services/$operators";
import { toList } from "../../services/$api";
import { capabilitiesOf, dcrAccountState, dcrBlock } from "../../models/dcr";

function getInitialAppState() {
  const restored = $auth.restoreSession();
  return {
    loggedIn: Boolean(restored?.token),
    user: null,
    me: restored?.me || null,
    // A restored `me` carries the identity but never the DCR block (see
    // persistSession), so it is `stale` until `auth/me/` answers in this tab.
    // Nothing may judge DCR permissions before that.
    meStatus: restored?.me ? 'stale' : 'idle',
    operator: null,
    operatorId: null,
    relationship: null,
    operatorStatus: 'idle',
    // Set when a call comes back 401 so the UI can say why it bounced the user out.
    sessionExpired: false,
  };
}

const loggedOutState = {
  loggedIn: false,
  me: null,
  meStatus: 'idle',
  user: null,
  operator: null,
  operatorId: null,
  relationship: null,
  operatorStatus: 'idle',
};

/**
 * The operator slice of the app state, read from the API. Returns the patch
 * instead of applying it, so the initial load can run from an effect without a
 * synchronous setState. `null` on a 401, which is handled globally.
 */
async function fetchOperatorState() {
  try {
    // The API already scopes /operators/ to the operators the current user belongs to.
    const operators = toList(await $operators.list());
    const operatorRecord = operators[0];

    if (!operatorRecord) {
      return { operator: null, operatorId: null, relationship: null, operatorStatus: 'missing' };
    }

    return {
      operator: operatorRecord,
      operatorId: operatorRecord.id,
      relationship: operatorRecord.my_relationship || null,
      operatorStatus: 'linked',
    };
  } catch (err) {
    if (err?.response?.status === 401) return null;
    return { operatorStatus: 'error' };
  }
}

export const GlobalProvider = ({ children }) => {
  const [appState, setAppState] = useState(getInitialAppState);

  const loadOperator = useCallback(async () => {
    setAppState((current) => ({ ...current, operatorStatus: 'checking' }));

    const next = await fetchOperatorState();
    if (next) setAppState((current) => ({ ...current, ...next }));
  }, []);

  // A 401 on *any* call means the token is gone: drop the session everywhere.
  // $api has already cleared the stored token by the time this runs.
  useEffect(() => $auth.onUnauthorized(() => {
    setAppState((current) => (
      current.loggedIn
        ? { ...current, ...loggedOutState, sessionExpired: true }
        : current
    ));
  }), []);

  /** `meStatus` becomes `fresh` here and nowhere else. */
  const applyMe = useCallback((me) => {
    setAppState((current) => ({ ...current, me, meStatus: 'fresh' }));
    $auth.persistSession(me);
  }, []);

  useEffect(() => {
    if (!appState.loggedIn) return;

    let cancelled = false;

    $auth.me()
      .then((me) => {
        if (cancelled) return;
        applyMe(me);
      })
      .catch((err) => {
        if (cancelled) return;
        // 401 already went through onUnauthorized; this covers the rest.
        if (err?.response?.status === 401) return;
        $auth.logout();
        setAppState((current) => ({ ...current, ...loggedOutState }));
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Re-read the account on demand — the only way to refresh the DCR block, which
   * carries the roles and capabilities. Worth calling after a submit, when DCR
   * registration and role grants change. Unlike the initial read, a failure here
   * does not end the session: the identity is still good, only the DCR block is
   * unknown.
   */
  const refreshMe = useCallback(async () => {
    try {
      const me = await $auth.me();
      applyMe(me);
      return me;
    } catch (err) {
      if (err?.response?.status !== 401) {
        setAppState((current) => ({ ...current, meStatus: 'error' }));
      }
      return null;
    }
  }, [applyMe]);

  // First operator read after sign-in. Status stays `idle` while it runs; keyed
  // on the id so a refreshed `me` does not start a second read, and a response
  // that lands after logout is dropped.
  const meId = appState.me?.id;

  useEffect(() => {
    if (!meId || appState.operatorStatus !== 'idle') return undefined;

    let cancelled = false;

    fetchOperatorState().then((next) => {
      if (!cancelled && next) setAppState((current) => ({ ...current, ...next }));
    });

    return () => { cancelled = true; };
  }, [meId, appState.operatorStatus]);

  const logout = useCallback(() => {
    $auth.logout();
    setAppState((current) => ({ ...current, ...loggedOutState, sessionExpired: false }));
  }, []);

  /** Called once the UI has shown the "signed out" prompt. */
  const acknowledgeSessionExpiry = useCallback(() => {
    setAppState((current) => ({ ...current, sessionExpired: false }));
  }, []);

  const refreshOperator = useCallback(() => {
    if (!appState.me?.id) return Promise.resolve();
    return loadOperator();
  }, [appState.me, loadOperator]);

  const deleteOperatorProfile = useCallback(async () => {
    if (!appState.operatorId) return;

    await $operators.remove(appState.operatorId);

    setAppState((current) => ({
      ...current,
      operator: null,
      operatorId: null,
      relationship: null,
      operatorStatus: 'missing',
    }));
  }, [appState.operatorId]);

  // Derived on each render rather than stored, so there is one source of truth
  // and consumers never reach into `me.dcr` themselves — a shape change from
  // DCR then lands in models/dcr.js alone.
  const value = {
    ...appState,
    dcr: dcrBlock(appState.me),
    dcrState: dcrAccountState(appState.me, appState.meStatus),
    dcrCapabilities: capabilitiesOf(appState.me),
    onUpdateGlobal: setAppState,
    applyMe,
    logout,
    acknowledgeSessionExpiry,
    refreshMe,
    refreshOperator,
    deleteOperatorProfile,
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
