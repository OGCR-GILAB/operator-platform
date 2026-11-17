import { CheckCircleIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { Button, Card, Message } from "@majistudio/ogcr-design-system";
import { toList } from "../../services/$api";
import { groupChecks } from "../projects/projectPresentation";

const TONES = {
  blocking: { Icon: XCircleIcon, tone: "negative" },
  warnings: { Icon: WarningCircleIcon, tone: "warning" },
  passed: { Icon: CheckCircleIcon, tone: "positive" },
};

/** `flagged` marks a check the last submit was refused over (400 -> problems[]). */
function CheckItem({ check, kind }) {
  const { Icon, tone } = TONES[kind];
  const message = String(check.message || check.code || "");
  // e.g. `technologies_practices_processes.vocabulary` names the values that
  // are not DCR ids; list them unless the message already does.
  const values = toList(check.values).map(String).filter((value) => !message.includes(value));

  return (
    <li className={`ogcr-checklist__item ogcr-checklist__item--${tone}${check.flagged ? " is-flagged" : ""}`}>
      <Icon size={16} weight="fill" className="ogcr-checklist__icon" />
      <div className="ogcr-checklist__text">
        <span>{message}</span>
        {values.length > 0 && <span className="ogcr-checklist__values">{values.join(", ")}</span>}
      </div>
    </li>
  );
}

function CheckGroup({ title, kind, checks }) {
  if (!checks.length) return null;

  return (
    <section className="ogcr-checklist__group">
      <h4 className="ogcr-activity-tab__section-title">
        {title}
        <span className="ogcr-activity-tab__count">{checks.length}</span>
      </h4>
      <ul className="ogcr-checklist">
        {checks.map((check) => (
          <CheckItem key={`${check.level}:${check.code || check.message}`} check={check} kind={kind} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The full submission checklist. The submission panel carries the summary, so
 * this opens only when asked for — or when a submit was refused over it.
 */
function ActivityChecklist({ checks, refusal, onHide, hideDisabled = false }) {
  const { blocking, warnings, passed } = groupChecks(checks);

  return (
    <Card
      title="Submission checks"
      trailing={(
        <Button variant="text" size="s" disabled={hideDisabled} onClick={onHide}>
          Hide
        </Button>
      )}
    >
      {refusal && (
        <Message
          state="error"
          title="Submit refused — not ready"
          description={refusal.detail || "Fix the highlighted checks, then submit again. Nothing was sent to DCR."}
        />
      )}

      {checks.length ? (
        <>
          <CheckGroup title="Blocking" kind="blocking" checks={blocking} />
          <CheckGroup title="Warnings" kind="warnings" checks={warnings} />
          {passed.length > 0 && (
            <details className="ogcr-disclosure">
              <summary>
                Passed
                <span className="ogcr-activity-tab__count">{passed.length}</span>
              </summary>
              <ul className="ogcr-checklist">
                {passed.map((check) => (
                  <CheckItem key={check.code || check.message} check={check} kind="passed" />
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p className="text-body-s ogcr-card__subtitle">No checks reported.</p>
      )}
    </Card>
  );
}

export default ActivityChecklist;
