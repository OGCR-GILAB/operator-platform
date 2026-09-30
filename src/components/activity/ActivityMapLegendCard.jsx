import { useState } from "react";
import { CaretDownIcon, ListBulletsIcon } from "@phosphor-icons/react";
import ActivityMapLegend from "./ActivityMapLegend";
import { OVERLAY_LAYERS } from "../../services/mapLayers";
import { PARCEL_LEGEND } from "../../services/mapLegends";

/**
 * What the colours on the map mean, on the map.
 *
 * A key belongs beside the thing it explains. This sits in the corner and
 * carries a section per drawn layer, so reading the map never means opening a
 * panel first. It appears only when there is something to explain and folds to
 * a button when it is in the way.
 *
 * CORINE alone is 44 classes, so the card is capped and scrolls internally
 * rather than growing until it covers the map.
 */
function ActivityMapLegendCard(props) {
  const { overlays = {}, parcelsVisible = true, className = "" } = props;

  const [open, setOpen] = useState(true);

  // Registry order, so the card lists layers the same way the drawer does.
  const sections = OVERLAY_LAYERS
    .filter((overlay) => overlays[overlay.id] && overlay.legend)
    .map((overlay) => ({ key: overlay.id, title: overlay.label, legend: overlay.legend }));

  if (parcelsVisible) {
    sections.unshift({ key: "parcels", title: "Parcels", legend: PARCEL_LEGEND });
  }

  // Nothing drawn that needs explaining — an empty card would just be clutter.
  if (!sections.length) return null;

  if (!open) {
    return (
      <button
        type="button"
        className={`ogcr-map-legend-card__show ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <ListBulletsIcon size={16} weight="bold" aria-hidden="true" />
        <span>Legend</span>
      </button>
    );
  }

  return (
    <section className={`ogcr-map-legend-card ${className}`.trim()} aria-label="Map legend">
      <header className="ogcr-map-legend-card__header">
        <h4 className="ogcr-map-legend-card__title">Legend</h4>
        <button
          type="button"
          className="ogcr-map-legend-card__toggle"
          onClick={() => setOpen(false)}
          aria-label="Hide legend"
        >
          <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
        </button>
      </header>

      <div className="ogcr-map-legend-card__body">
        {sections.map((section) => (
          <div className="ogcr-map-legend-card__section" key={section.key}>
            <p className="ogcr-map-legend-card__section-title">{section.title}</p>
            <ActivityMapLegend legend={section.legend} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default ActivityMapLegendCard;
