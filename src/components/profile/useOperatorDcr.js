import { useCallback, useEffect, useState } from "react";
import $operators, { OPERATOR_DCR_STATES, classifyOperatorDcr } from "../../services/$operators";

/**
 * Reads `GET operators/{id}/dcr/` — DCR's own operator record.
 *
 * A 404 is the normal state before the first submit, so it is reported as
 * `unregistered` rather than raised: nothing about it should look like a
 * failure to the user.
 *
 * `loading` is derived by comparing the request the result belongs to against
 * the one currently wanted, rather than assigned when the effect fires — the
 * effect then never sets state synchronously, and a result from a superseded
 * operator id can never be mistaken for the current one.
 */
export default function useOperatorDcr(operatorId) {
  const [result, setResult] = useState({ key: null, state: 'idle', data: null, error: null });
  const [token, setToken] = useState(0);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  const key = operatorId ? `${operatorId}:${token}` : null;

  useEffect(() => {
    if (!operatorId) return undefined;

    let cancelled = false;
    const requestKey = `${operatorId}:${token}`;

    $operators.dcr(operatorId)
      .then((record) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          state: OPERATOR_DCR_STATES.registered,
          data: record,
          error: null,
        });
      })
      .catch((err) => {
        // 401 is handled globally; leaving this as `loading` avoids flashing an
        // error while the app signs the user out.
        if (cancelled || err?.response?.status === 401) return;
        setResult({
          key: requestKey,
          state: classifyOperatorDcr(err),
          data: null,
          error: err,
        });
      });

    return () => { cancelled = true; };
  }, [operatorId, token]);

  const settled = result.key === key;

  return {
    state: operatorId ? (settled ? result.state : 'loading') : 'idle',
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    reload,
  };
}
