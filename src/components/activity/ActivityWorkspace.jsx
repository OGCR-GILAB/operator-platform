import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import RouteTransition from "../ui/RouteTransition";
import Skeleton, { SkeletonBlock } from "../ui/Skeleton";
import Message from "../ui/Message";
import Pill from "../ui/Pill";
import ActivityLifecycleIndicator from "../projects/ProjectLifecycleIndicator";
import { useActivity } from "./ActivityContext";
import {
  PROJECT_STATUS_LABELS,
  lifecyclePhase,
  projectLocation,
  projectStatusTone,
  syncLabel,
  syncTone,
} from "../projects/projectPresentation";

/**
 * The shell every activity tab renders inside: who you are working on, where it
 * sits in the lifecycle, and the way back out. The tabs themselves are just the
 * body — they never repeat this header.
 */
function ActivityWorkspace() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activity, status, error, notFound } = useActivity();

  // The tab is the last segment. Changing it crossfades the body below the
  // header; the header itself belongs to the activity and does not move.
  const tabKey = pathname.split("/").filter(Boolean).pop() || "overview";

  if (notFound) {
    return (
      <div className="ogcr-projects">
        <Message
          variant="error"
          title="That activity does not exist"
          description="It may have been deleted, or the link is wrong."
        />
        <div>
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon size={16} />}
            onClick={() => navigate("/activities")}
          >
            Back to activities
          </Button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="ogcr-projects">
        <Message variant="error" title="Could not load this activity" description={error} />
        <div>
          <Button
            variant="outlined"
            startIcon={<ArrowLeftIcon size={16} />}
            onClick={() => navigate("/activities")}
          >
            Back to activities
          </Button>
        </div>
      </div>
    );
  }

  /*
    The header is the same shape whether or not the activity has arrived, so it
    is drawn either way. Swapping the whole workspace for a spinner meant the
    header, the tabs and the body all appeared at once and shoved the page down.
  */
  if (!activity) {
    return (
      <div className="ogcr-projects" aria-busy="true">
        <header className="ogcr-activity-header">
          <div className="ogcr-activity-header__identity">
            <div className="ogcr-activity-header__title-row">
              <h1 className="ogcr-activity-header__name" style={{ width: "22ch" }}>
                <Skeleton height="1.2em" />
              </h1>
              <Skeleton width="9ch" height="1.6em" radius="var(--radius-full)" delay={90} />
              <Skeleton width="7ch" height="1.6em" radius="var(--radius-full)" delay={180} />
            </div>

            <p className="ogcr-activity-header__meta" style={{ width: "34ch" }}>
              <Skeleton height="1.5em" delay={120} />
            </p>
          </div>

          <Skeleton width="min(320px, 100%)" height="2.2em" radius="var(--radius-full)" delay={200} />
        </header>

        <SkeletonBlock rows={4} />
      </div>
    );
  }

  const parcels = Number(activity.parcel_count) || 0;
  const documents = Number(activity.document_count) || 0;

  return (
    <div className="ogcr-projects">
      {/*
        One band, not a page title plus a stack of blocks. It repeats above every
        tab, so it has to stay out of the way of the tab's own content.
      */}
      <header className="ogcr-activity-header">
        <div className="ogcr-activity-header__identity">
          <div className="ogcr-activity-header__title-row">
            <h1 className="ogcr-activity-header__name">{activity.name || "Activity"}</h1>
            <Pill tone={projectStatusTone(activity.status)}>
              {PROJECT_STATUS_LABELS[activity.status] || activity.status || "—"}
            </Pill>
            <Pill tone={syncTone(activity)}>{syncLabel(activity)}</Pill>
          </div>

          <p className="ogcr-activity-header__meta">
            <span>{projectLocation(activity)}</span>
            <span>{parcels} parcel{parcels === 1 ? "" : "s"}</span>
            <span>{documents} document{documents === 1 ? "" : "s"}</span>
          </p>
        </div>

        <ActivityLifecycleIndicator phase={lifecyclePhase(activity.status)} />
      </header>

      <RouteTransition transitionKey={tabKey} variant="panel" scrollReset={false}>
        <Outlet />
      </RouteTransition>
    </div>
  );
}

export default ActivityWorkspace;
