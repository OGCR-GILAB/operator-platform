import { GlobeHemisphereWestIcon, MapTrifoldIcon } from "@phosphor-icons/react";
import { ToggleGroup } from "@majistudio/ogcr-design-system";
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
    <ToggleGroup
      appearance="segmented"
      size="s"
      aria-label="Basemap"
      className={`ogcr-map-basemap ${className}`.trim()}
      value={[value]}
      // Pressing the active basemap again would leave none selected.
      onValueChange={(next) => { if (next[0]) onChange(next[0]); }}
      items={BASEMAPS.map((option) => {
        const Icon = BASEMAP_ICONS[option.id];

        return {
          value: option.id,
          icon: Icon ? <Icon size={16} weight={value === option.id ? "fill" : "bold"} /> : undefined,
          label: <span className="ogcr-map-basemap__label">{option.label}</span>,
          "aria-label": option.label,
        };
      })}
    />
  );
}

export default ActivityMapBasemapSwitch;
