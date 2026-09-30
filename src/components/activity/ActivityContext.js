import { createContext, useContext } from "react";

/**
 * The activity the operator is currently working inside, or an empty scope when
 * they are not in one. Mirrors `useGlobal()` — one context, read from both the
 * sidebar and the workspace pages, so the activity is fetched once.
 */
export const ActivityContext = createContext({
  activityId: null,
  activity: null,
  readiness: null,
  editable: false,
  status: "idle",
  error: "",
  notFound: false,
  reload: () => {},
});

export function useActivity() {
  return useContext(ActivityContext);
}

export default ActivityContext;
