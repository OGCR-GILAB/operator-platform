import { CheckIcon } from "@phosphor-icons/react";

const phases = [
  {
    key: "initialization",
    label: "Initialization",
    description: "Activity & Monitoring Plans submitted",
  },
  {
    key: "monitoring",
    label: "Monitoring",
    description: "Continuous data collection & validation",
  },
  {
    key: "recertification",
    label: "Re-Certification",
    description: "Renewal audit and credit issuance",
  },
];

const order = phases.map((phase) => phase.key);

/**
 * Where the activity sits in the three-phase lifecycle, as a single rail.
 *
 * The description of each phase is a tooltip rather than a line of body text:
 * this sits at the top of every tab, so it has to cost one row, not five.
 */
function ActivityLifecycleIndicator({ phase }) {
  const currentIndex = order.indexOf(phase);

  return (
    <ol className="ogcr-lifecycle" aria-label="Certification lifecycle">
      {phases.map((item, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const state = isDone ? "done" : (isCurrent ? "active" : "upcoming");

        return (
          <li
            key={item.key}
            className={`ogcr-lifecycle__step ogcr-lifecycle__step--${state}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            {/* The track joining this phase to the previous one, drawn between
                the chips rather than inside either of their borders. */}
            {index > 0 && <span className="ogcr-lifecycle__track" aria-hidden="true" />}

            <span className="ogcr-lifecycle__chip" title={item.description}>
              <span className="ogcr-lifecycle__marker" aria-hidden="true">
                {isDone ? <CheckIcon size={11} weight="bold" /> : index + 1}
              </span>
              <span className="ogcr-lifecycle__label">{item.label}</span>
              <span className="ogcr-lifecycle__state">
                {isDone ? " (complete)" : (isCurrent ? " (current phase)" : " (not started)")}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default ActivityLifecycleIndicator;
