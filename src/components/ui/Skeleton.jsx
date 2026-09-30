/**
 * Placeholders shaped like the content they stand in for.
 *
 * The rule these follow: a skeleton is measured in `em`, and it is rendered
 * inside the same element the real content would have used. That way it
 * inherits the font size and line height of the thing it replaces and occupies
 * the height that thing will occupy — which is the whole point. A loading state
 * that collapses the page and then reopens it is worse than no loading state.
 */
function Skeleton(props) {
  const {
    width = "100%",
    height = "1em",
    radius,
    circle = false,
    delay = 0,
    className = "",
    style = {},
  } = props;

  return (
    <span
      className={`ogcr-skeleton${circle ? " ogcr-skeleton--circle" : ""} ${className}`.trim()}
      aria-hidden="true"
      style={{
        width,
        height,
        ...(radius ? { borderRadius: radius } : null),
        // Siblings ripple instead of pulsing in lockstep.
        ...(delay ? { "--ogcr-skeleton-delay": `${delay}ms` } : null),
        ...style,
      }}
    />
  );
}

/** A paragraph's worth of lines, the last one short the way a real one is. */
export function SkeletonText(props) {
  const { lines = 3, width = "100%", className = "" } = props;

  return (
    <div className={`ogcr-skeleton-text ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "62%" : width}
          height="0.85em"
          delay={index * 90}
        />
      ))}
    </div>
  );
}

/**
 * A StatStrip that has not resolved yet. It reuses the strip's own classes, so
 * the band is exactly as tall and as divided as it will be with numbers in it.
 */
export function SkeletonStats(props) {
  const { items = 3, variant = "boxed", className = "" } = props;

  return (
    <div
      className={`ogcr-stat-strip ogcr-stat-strip--${variant} ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="ogcr-stat-strip__item ogcr-stat-strip__item--neutral">
          <div className="ogcr-stat-strip__label">
            <Skeleton width="72%" delay={index * 110} />
          </div>
          <div className="ogcr-stat-strip__value">
            <Skeleton width="48%" delay={index * 110} />
          </div>
          <div className="ogcr-stat-strip__sublabel">
            <Skeleton width="56%" delay={index * 110} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rows of placeholder text for a card body that is not a table. */
export function SkeletonBlock(props) {
  const { rows = 3, className = "" } = props;

  return (
    <div className={`ogcr-skeleton-block ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height="1.6em" delay={index * 90} />
      ))}
    </div>
  );
}

/** A labelled input that has not arrived: label above, control below. */
export function SkeletonField(props) {
  const { delay = 0, className = "" } = props;

  return (
    <div className={`ogcr-skeleton-field ${className}`.trim()} aria-hidden="true">
      <Skeleton width="34%" height="0.8em" delay={delay} />
      <Skeleton height="2.6em" radius="var(--radius-s)" delay={delay} />
    </div>
  );
}

export default Skeleton;
