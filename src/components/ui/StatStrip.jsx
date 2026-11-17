import { Kpi } from "@majistudio/ogcr-design-system";

// Our tones predate the DS; "brand" is its "progress".
const kpiTone = (tone) => (tone === "brand" ? "progress" : tone || "neutral");

/**
 * Headline numbers as a row of DS Kpi tiles.
 *
 * `items`: { id, label, value, unit, sublabel, tone }. `variant="bare"` drops
 * the accent bar, for figures that sit inside a card of their own.
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
    <div className={`ogcr-kpi-grid ${className}`.trim()} role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <Kpi
          key={item.id ?? item.label}
          label={item.label}
          value={item.unit ? `${item.value} ${item.unit}` : item.value}
          secondaryText={item.sublabel}
          tone={kpiTone(item.tone)}
          accentBar={variant !== "bare"}
        />
      ))}
    </div>
  );
}

export default StatStrip;
