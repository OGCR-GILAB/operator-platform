import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button, Card, Message, Pill, ProgressBar } from "@majistudio/ogcr-design-system";
import { useActivity } from "./ActivityContext";
import { nextSetupStep, setupSteps } from "../projects/projectPresentation";

// Where each step's button leads. `?add` / `?upload` open the tab's own modal.
const STEP_ACTIONS = {
  details: { label: "Edit details" },
  parcels: { label: "Add parcels", to: "parcels?add=new", doneLabel: "Manage parcels", doneTo: "parcels" },
  plan: { label: "Start plan", to: "plans#activity-plan", doneLabel: "Open plan" },
  monitoring: { label: "Start plan", to: "plans#monitoring-plan", doneLabel: "Open plan" },
  documents: { label: "Upload", to: "documents?upload=1", doneLabel: "Manage documents", doneTo: "documents" },
  submit: { label: "Review checks" },
};

const MAX_ISSUES = 3;

/**
 * What a draft activity still needs before it can be submitted. Steps can be
 * done in any order — the first open one is only highlighted as "Next" — and
 * progress is read from the activity itself, so leaving halfway loses nothing.
 */
function ActivitySetupGuide({ activity, readiness, editable, onEditDetails, onReviewChecks }) {
  const navigate = useNavigate();
  const { documentTotal } = useActivity();
  const steps = setupSteps(activity, readiness, { documentTotal });
  const next = nextSetupStep(steps);
  const doneCount = steps.filter((step) => step.state === "done").length;

  const runStep = (step) => {
    if (step.id === "details") return onEditDetails();
    if (step.id === "submit") return onReviewChecks();

    const action = STEP_ACTIONS[step.id];
    const done = step.state !== "todo";
    navigate(`/activities/${activity.id}/${done ? (action.doneTo || action.to) : action.to}`);
  };

  return (
    <Card
      title="Set up this activity"
      subtitle="Saved as a draft, in any order — nothing reaches DCR until you submit."
      trailing={(
        <div className="ogcr-setup-guide__progress">
          <ProgressBar
            value={(doneCount / steps.length) * 100}
            showValue={false}
            aria-label="Activity setup progress"
          />
          <span className="ogcr-activity-tab__count">{doneCount} of {steps.length}</span>
        </div>
      )}
    >
      <ol className="ogcr-setup-guide">
        {steps.map((step, index) => {
          const isNext = next?.id === step.id;
          const action = STEP_ACTIONS[step.id];
          const label = step.state === "todo" ? action.label : (action.doneLabel || action.label);
          // A submitted activity is read-only, but its records can still be looked at.
          const hidden = !editable && step.id === "details";

          return (
            <li
              key={step.id}
              className={[
                "ogcr-setup-guide__step",
                `ogcr-setup-guide__step--${step.state}`,
                isNext ? "is-next" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="ogcr-setup-guide__marker" aria-hidden="true">
                {step.state === "done" && <CheckCircleIcon size={22} weight="fill" />}
                {step.state === "attention" && <WarningCircleIcon size={22} weight="fill" />}
                {step.state === "todo" && index + 1}
              </span>

              <div className="ogcr-setup-guide__text">
                <p className="ogcr-setup-guide__title">
                  {step.title}
                  {step.optional && step.state === "todo" && <Pill tone="neutral">Optional</Pill>}
                  {isNext && <Pill tone="warning">Next</Pill>}
                </p>
                <p className="ogcr-setup-guide__summary">{step.summary}</p>
                <IssueList issues={step.issues} onMore={onReviewChecks} />
                {/* Warnings do not hold the step back, so they read as notes. */}
                <IssueList issues={step.notes} onMore={onReviewChecks} note />
              </div>

              {/* Only the next step asks to be clicked; the rest are a way in. */}
              {!hidden && (
                <Button
                  variant={isNext ? "filled" : "text"}
                  size={isNext ? undefined : "s"}
                  iconRight={isNext ? <ArrowRightIcon size={16} /> : null}
                  onClick={() => runStep(step)}
                >
                  {label}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function IssueList({ issues, onMore, note = false }) {
  if (!issues.length) return null;

  return (
    <ul className={`ogcr-setup-guide__issues${note ? " ogcr-setup-guide__issues--note" : ""}`}>
      {issues.slice(0, MAX_ISSUES).map((issue) => (
        <li key={issue.code || issue.message}>{issue.message || issue.code}</li>
      ))}
      {issues.length > MAX_ISSUES && (
        <li>
          <button type="button" className="ogcr-setup-guide__more" onClick={onMore}>
            {`and ${issues.length - MAX_ISSUES} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

/**
 * "Next: …" at the top of a workspace tab, once the steps that tab covers are
 * done. The overview carries the full list; this only keeps the way forward
 * one click away from wherever the operator just finished something.
 */
export function SetupNextStep({ covers }) {
  const navigate = useNavigate();
  const { activity, readiness, editable, documentTotal } = useActivity();

  if (!activity || !editable || activity.submitted_at) return null;

  const steps = setupSteps(activity, readiness, { documentTotal });
  if (steps.some((step) => covers.includes(step.id) && step.state === "todo")) return null;

  const next = nextSetupStep(steps);
  if (!next || covers.includes(next.id)) return null;

  const action = STEP_ACTIONS[next.id];
  const todo = next.state === "todo";
  // Details and the final review both live on the overview, with the guide.
  const to = action.to ? (todo ? action.to : (action.doneTo || action.to)) : "overview";
  const label = action.to ? (todo ? action.label : (action.doneLabel || action.label)) : "Go to overview";

  return (
    <Message
      title={`Next: ${next.title}`}
      description={next.summary}
      actionLabel={label}
      onAction={() => navigate(`/activities/${activity.id}/${to}`)}
    />
  );
}

export default ActivitySetupGuide;
