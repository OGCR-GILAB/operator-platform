import { useCallback, useEffect, useMemo, useState } from "react";
import { useMatch } from "react-router-dom";
import { ActivityContext } from "./ActivityContext";
import { useGlobal } from "../providers/GlobalContext";
import $projects from "../../services/$projects";
import $auth from "../../services/$auth";

const emptyScope = {
  // Which activity this result describes. Until it matches the id in the URL,
  // what is held is either nothing or the previous activity — neither should be
  // shown, so the scope reads as still loading.
  forId: null,
  activity: null,
  readiness: null,
  parcels: null,
  error: "",
  notFound: false,
};

/**
 * Loads the activity named in the URL. It sits above both the sidebar and the
 * routes, so the workspace tabs and the nav brand share a single fetch.
 */
function ActivityProvider({ children }) {
  const { loggedIn } = useGlobal();
  const match = useMatch("/activities/:activityId/*");
  const activityId = match?.params?.activityId || null;

  const [scope, setScope] = useState(emptyScope);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    // Signed out, `ProtectedRoute` is already bouncing this URL — asking for the
    // activity would only earn a 401 and a spurious "session expired".
    if (!activityId || !loggedIn) return undefined;

    let cancelled = false;

    // Readiness is advisory — a submitted activity has no pending checks worth
    // blocking the workspace on, so a failure there is soft. So are the parcels:
    // they only name parcels and count their documents, which the activity's
    // own `document_count` leaves out.
    Promise.all([
      $projects.get(activityId),
      $projects.readiness(activityId).catch(() => null),
      $projects.allParcels(activityId).catch(() => null),
    ])
      .then(([activity, readiness, links]) => {
        if (cancelled) return;
        const parcels = links ? links.map((link) => link.parcel_detail || { id: link.parcel }) : null;
        setScope({ forId: activityId, activity, readiness, parcels, error: "", notFound: false });
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;

        setScope({
          forId: activityId,
          activity: null,
          readiness: null,
          parcels: null,
          error: $auth.getErrorMessage(err),
          notFound: err?.response?.status === 404,
        });
      });

    return () => { cancelled = true; };
  }, [activityId, loggedIn, reloadToken]);

  const value = useMemo(() => {
    // Outside an activity, or while the next one is still in flight, the held
    // scope describes something else — report the empty one instead of leaking
    // the previous activity into the new URL.
    const current = scope.forId && scope.forId === activityId ? scope : emptyScope;

    const status = !activityId
      ? "idle"
      : (current.forId !== activityId ? "loading" : (current.activity ? "ready" : "error"));

    const ownDocuments = Number(current.activity?.document_count) || 0;

    return {
      activityId,
      activity: current.activity,
      readiness: current.readiness,
      // The parcel records (`parcel_detail`), or null if they could not be read.
      parcels: current.parcels,
      // Documents on the activity and on its parcels; the activity's own count
      // alone until the parcels are known.
      documentTotal: ownDocuments + (current.parcels || [])
        .reduce((sum, parcel) => sum + (Number(parcel.document_count) || 0), 0),
      // A submitted activity is read-only; absent the flag, assume editable.
      editable: current.activity ? current.activity.is_editable !== false : false,
      // Documents outlive that: uploads and new versions stay open after submit
      // until the verification is final (accepted / rejected). A certificate in
      // force freezes them per document (`is_frozen`), and the API answers 400
      // if the activity is closed after all.
      documentsOpen: current.activity
        ? current.activity.is_editable !== false
          || ["submitted", "changes_requested"].includes(current.activity.status)
        : false,
      status,
      error: current.error,
      notFound: current.notFound,
      reload,
    };
  }, [activityId, scope, reload]);

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export default ActivityProvider;
