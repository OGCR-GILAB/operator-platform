/**
 * One layer's colour key: a note, then swatches, optionally under the headings
 * the classification uses itself.
 *
 * Two shapes come out of the registry — a flat `items` list, and `groups` of
 * them. Flat is normalised into a single unlabelled group so there is one thing
 * to render. Nothing here scrolls or collapses; the card that stacks these owns
 * the height.
 */
function ActivityMapLegend({ legend }) {
  if (!legend) return null;

  const groups = legend.groups || (legend.items ? [{ label: null, items: legend.items }] : []);
  if (!groups.length) return null;

  return (
    <>
      {legend.note ? <p className="ogcr-map-legend-key__note">{legend.note}</p> : null}
      {groups.map((group, index) => (
        <div className="ogcr-map-legend-key__group" key={group.label || index}>
          {group.label ? (
            <p className="ogcr-map-legend-key__group-title">{group.label}</p>
          ) : null}
          <ul className="ogcr-map-legend-key__items">
            {group.items.map((item) => (
              <li key={item.label}>
                <span
                  className="ogcr-map-legend-key__swatch"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default ActivityMapLegend;
