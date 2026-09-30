import { GlobeHemisphereWestIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { BASEMAPS } from "../../services/$map";

/**
 * Which basemap is underneath, as a control on the map rather than a filter
 * above it. Same segmented shape as the table view toggles, but on its own
 * class: this one floats over imagery, so it needs a solid surface and a
 * shadow where the table version sits on a neutral panel and needs neither.
 */

// Kept here and not in `BASEMAPS`, which is map configuration and has no
// business knowing about an icon set.
const BASEMAP_ICONS = {
  "osm-grayscale-layer": MapTrifoldIcon,
  "esri-sat-layer": GlobeHemisphereWestIcon,
};

function ActivityMapBasemapSwitch(props) {
  const { value, onChange = () => {}, className = "" } = props;

  return (
    <div
      className={`ogcr-map-basemap ${className}`.trim()}
      role="group"
      aria-label="Basemap"
    >
      {BASEMAPS.map((option) => {
        const Icon = BASEMAP_ICONS[option.id];
        const active = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            className={`ogcr-map-basemap__btn${active ? " active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(option.id)}
          >
            {Icon ? <Icon size={16} weight={active ? "fill" : "bold"} aria-hidden="true" /> : null}
            <span className="ogcr-map-basemap__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ActivityMapBasemapSwitch;
