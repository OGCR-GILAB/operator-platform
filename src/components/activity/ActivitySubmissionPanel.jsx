import {
  CaretDownIcon,
  CheckCircleIcon,
  InfoIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { Button, Card, Pill } from "@majistudio/ogcr-design-system";

const STATE_ICONS = {
  ready: CheckCircleIcon,
  blocked: XCircleIcon,
  submitted: PaperPlaneTiltIcon,
  changes: WarningCircleIcon,
  unknown: InfoIcon,
};

/**
 * Where the activity stands against DCR, and the one or two buttons that move
 * it on. Readiness, the submit actions and every reason a submit might be
 * refused used to sit in four places down the page; here they are one panel
 * beside the content, so the answer to "can I submit?" never scrolls away.
 *
 * Presentational: the overview owns the submit flow and passes the state,
 * the alerts and the action buttons in.
 *
 * `state`: ready | blocked | submitted | changes | unknown.
 */
function ActivitySubmissionPanel({
  state,
  title,
  note,
  blocking = 0,
  warnings = 0,
  alerts = null,
  actions = null,
  checkCount = 0,
  checksOpen = false,
  onViewChecks,
}) {
  const Icon = STATE_ICONS[state] || InfoIcon;
  const hasCounts = blocking > 0 || warnings > 0;

  return (
    <Card title="Submission" className="ogcr-submission-panel">
      <div className={`ogcr-submission-panel__status ogcr-submission-panel__status--${state}`}>
        <Icon size={28} weight="fill" className="ogcr-submission-panel__icon" />
        <div className="ogcr-submission-panel__text">
          <p className="ogcr-submission-panel__title">{title}</p>
          {hasCounts && (
            <div className="ogcr-submission-panel__counts">
              {blocking > 0 && <Pill tone="negative">{blocking} blocking</Pill>}
              {warnings > 0 && <Pill tone="warning">{warnings} warning{warnings === 1 ? "" : "s"}</Pill>}
            </div>
          )}
          {note ? <p className="ogcr-submission-panel__note">{note}</p> : null}
        </div>
      </div>

      {alerts}

      {actions ? <div className="ogcr-submission-panel__actions">{actions}</div> : null}

      {onViewChecks && checkCount > 0 && !checksOpen && (
        <Button
          variant="text"
          size="s"
          className="ogcr-submission-panel__link"
          iconRight={<CaretDownIcon size={16} />}
          onClick={onViewChecks}
        >
          {`View all ${checkCount} checks`}
        </Button>
      )}
    </Card>
  );
}

export default ActivitySubmissionPanel;
