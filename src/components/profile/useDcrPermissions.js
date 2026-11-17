import { useCallback, useEffect, useState } from "react";
import $auth from "../../services/$auth";

/**
 * Reads `GET auth/dcr/permissions/` — the account's roles checked live on DCR.
 *
 * `reload()` re-reads the server's 5-minute cache; `reload({ refresh: true })`
 * makes the API ask DCR again. The last answer stays visible while a re-check
 * is in flight, so a button gated on it does not flicker back on.
 */
export default function useDcrPermissions({ enabled = true } = {}) {
  const [result, setResult] = useState({ token: null, data: null, error: null });
  const [request, setRequest] = useState({ token: 0, refresh: false });

  const reload = useCallback(({ refresh = false } = {}) => {
    setRequest((current) => ({ token: current.token + 1, refresh }));
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    $auth.permissions({ refresh: request.refresh })
      .then((data) => {
        if (!cancelled) setResult({ token: request.token, data, error: null });
      })
      .catch((err) => {
        // 401 is handled globally. Anything else keeps the previous answer: a
        // failed re-check says nothing new about the roles.
        if (cancelled || err?.response?.status === 401) return;
        setResult((current) => ({ ...current, token: request.token, error: err }));
      });

    return () => { cancelled = true; };
  }, [enabled, request]);

  return {
    permissions: enabled ? result.data : null,
    error: enabled ? result.error : null,
    loading: enabled && result.token !== request.token,
    reload,
  };
}
