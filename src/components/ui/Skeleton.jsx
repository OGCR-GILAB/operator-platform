import { Kpi, Skeleton } from "@majistudio/ogcr-design-system";

/**
 * Placeholders shaped like the content they stand in for, built on the DS
 * Skeleton. A loading state that collapses the page and then reopens it is
 * worse than no loading state, so each one takes the room its content will.
 */

/** A StatStrip that has not resolved yet: the same grid of Kpi tiles. */
export function SkeletonStats(props) {
  const { items = 3, variant = "boxed", className = "" } = props;

  return (
    <div className={`ogcr-kpi-grid ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: items }, (_, index) => (
        <Kpi
          key={index}
          label={<Skeleton variant="text" width="72%" />}
          value={<Skeleton variant="text" width="48%" />}
          tone="neutral"
          accentBar={variant !== "bare"}
        />
      ))}
    </div>
  );
}

/** Rows of placeholder text for a card body that is not a table. */
export function SkeletonBlock(props) {
  const { rows = 3, className = "" } = props;

  return <Skeleton variant="text" lines={rows} height="1.6em" className={className} />;
}

/** A labelled input that has not arrived: label above, control below. */
export function SkeletonField(props) {
  const { className = "" } = props;

  return (
    <div className={`ogcr-skeleton-field ${className}`.trim()} aria-hidden="true">
      <Skeleton variant="text" width="34%" />
      <Skeleton height={48} />
    </div>
  );
}
