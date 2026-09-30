import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import Switch from "../ui/Switch";
import Pill from "../ui/Pill";
import { formatArea, syncLabel, syncTone } from "../projects/projectPresentation";
import { parcelKey } from "../../services/$map";
import { LAYER_GROUPS, OVERLAY_LAYERS } from "../../services/mapLayers";

/**
 * What is drawn on the activity map, and what is on it.
 *
 * Deliberately not a `Modal`: it is a panel on the map, so it takes no backdrop,
 * traps no focus and locks no scroll. The map has to stay draggable with this
 * open — that is the whole point of putting the parcel list beside it.
 */

const parcelName = (feature) => feature?.properties?.name || "Unnamed parcel";

// Below this, a search box is more clutter than help.
const SEARCH_THRESHOLD = 8;

function groupedLayers() {
  const groups = new Map();

  OVERLAY_LAYERS.forEach((overlay) => {
    const name = overlay.group || "Layers";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(overlay);
  });

  // A group the registry invents without listing it in `LAYER_GROUPS` sorts to
  // the end rather than disappearing.
  const rank = (name) => {
    const index = LAYER_GROUPS.indexOf(name);
    return index === -1 ? LAYER_GROUPS.length : index;
  };

  // Registry order decides what is inside a group; `LAYER_GROUPS` decides the
  // order of the groups themselves, so adding a layer never reshuffles the panel.
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

function ActivityMapDrawer(props) {
  const {
    id,
    open = false,
    onClose = () => {},
    parcelsVisible = true,
    onParcelsVisible = () => {},
    overlays = {},
    onOverlay = () => {},
    parcels = [],
    selectedParcelId = null,
    onSelectParcel = () => {},
    onHoverParcel = () => {},
  } = props;

  const panel = useRef(null);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupedLayers(), []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return parcels;

    return parcels.filter((feature) => {
      const { name, cadastral_reference: reference } = feature?.properties || {};
      return `${name || ""} ${reference || ""}`.toLowerCase().includes(term);
    });
  }, [parcels, query]);

  // Bound to the panel rather than the window: a Modal can be open over this
  // map — the parcel picker is one — and Escape belongs to whatever is on top.
  useEffect(() => {
    const element = panel.current;
    if (!open || !element) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };

    element.addEventListener("keydown", handleKeyDown);
    return () => element.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div
      id={id}
      ref={panel}
      className={`ogcr-map-drawer${open ? " ogcr-map-drawer--open" : ""}`}
      aria-label="Map layers"
      aria-hidden={open ? undefined : "true"}
      // Out of the tab order while closed. `visibility: hidden` does that too,
      // but only once the transition has finished playing.
      inert={!open}
    >
      <header className="ogcr-map-drawer__header">
        <h3 className="ogcr-map-drawer__title">Layers</h3>
        <button
          type="button"
          className="ogcr-map-drawer__close"
          onClick={onClose}
          aria-label="Close layers panel"
        >
          <XIcon size={18} weight="bold" aria-hidden="true" />
        </button>
      </header>

      <div className="ogcr-map-drawer__body">
        <section className="ogcr-map-drawer__section">
          <Switch
            label="Parcels"
            description="This activity's land, coloured by DCR state."
            checked={parcelsVisible}
            onChange={(event) => onParcelsVisible(event.target.checked)}
          />
        </section>

        {groups.map(([group, layers]) => (
          <section className="ogcr-map-drawer__section" key={group}>
            <h4 className="ogcr-map-drawer__group-title">{group}</h4>
            {/* Colours are explained by the legend card on the map, not here —
                a key is only useful next to what it describes. */}
            {layers.map((overlay) => (
              <Switch
                key={overlay.id}
                label={overlay.label}
                description={overlay.description}
                checked={Boolean(overlays[overlay.id])}
                onChange={(event) => onOverlay(overlay.id, event.target.checked)}
              />
            ))}
          </section>
        ))}

        <section className="ogcr-map-drawer__section">
          <h4 className="ogcr-map-drawer__group-title">
            Parcels
            {parcels.length ? <span className="ogcr-map-drawer__count">{parcels.length}</span> : null}
          </h4>

          {parcels.length > SEARCH_THRESHOLD ? (
            <div className="ogcr-map-drawer__search">
              <MagnifyingGlassIcon size={14} weight="bold" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by name or reference"
                aria-label="Filter parcels"
              />
            </div>
          ) : null}

          {parcels.length === 0 ? (
            <p className="ogcr-map-drawer__empty">
              No parcels in this activity yet.
            </p>
          ) : null}

          {parcels.length > 0 && matches.length === 0 ? (
            <p className="ogcr-map-drawer__empty">No parcels match that search.</p>
          ) : null}

          <ul className="ogcr-map-drawer__parcels">
            {matches.map((feature) => {
              const key = parcelKey(feature);
              const properties = feature?.properties || {};
              const active = key !== "" && key === selectedParcelId;

              return (
                <li key={key || parcelName(feature)}>
                  <button
                    type="button"
                    className={`ogcr-map-parcel${active ? " ogcr-map-parcel--active" : ""}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => onSelectParcel(feature)}
                    onMouseEnter={() => onHoverParcel(key)}
                    onMouseLeave={() => onHoverParcel(null)}
                    onFocus={() => onHoverParcel(key)}
                    onBlur={() => onHoverParcel(null)}
                  >
                    <span className="ogcr-map-parcel__top">
                      <span className="ogcr-map-parcel__name">{parcelName(feature)}</span>
                      <Pill tone={syncTone(properties)} label={syncLabel(properties)} />
                    </span>
                    <span className="ogcr-map-parcel__meta">
                      {properties.cadastral_reference || "No reference"}
                      <span aria-hidden="true"> · </span>
                      {formatArea(properties.area_ha)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

      </div>
    </div>
  );
}

export default ActivityMapDrawer;
