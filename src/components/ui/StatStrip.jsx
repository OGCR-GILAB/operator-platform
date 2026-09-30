/**
 * A row of headline numbers in one band, instead of a card each. Cards give a
 * metric the same visual weight as the content below it; on a dashboard the
 * numbers are the caption, not the subject.
 *
 * `items`: { id, label, value, unit, sublabel, tone }. Tone colours the number —
 * neutral, brand, positive, warning, negative.
 */
function StatStrip(props) {
  const {
    items = [],
    variant = "boxed",
    className = "",
    ariaLabel = "Key metrics",
  } = props;

  if (!items.length) return null;

  return (
    <dl
      className={`ogcr-stat-strip ogcr-stat-strip--${variant} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div
          key={item.id ?? item.label}
          className={`ogcr-stat-strip__item ogcr-stat-strip__item--${item.tone || "neutral"}`}
        >
          <dt className="ogcr-stat-strip__label">{item.label}</dt>
          <dd className="ogcr-stat-strip__value">
            {item.value}
            {item.unit ? <span className="ogcr-stat-strip__unit">{item.unit}</span> : null}
          </dd>
          {item.sublabel ? (
            <dd className="ogcr-stat-strip__sublabel">{item.sublabel}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export default StatStrip;
