import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StackIcon } from "@phosphor-icons/react";
import Message from "../ui/Message";
import ActivityMapBasemapSwitch from "./ActivityMapBasemapSwitch";
import ActivityMapDrawer from "./ActivityMapDrawer";
import ActivityMapLegendCard from "./ActivityMapLegendCard";
import { useActivity } from "./ActivityContext";
import { useGlobal } from "../providers/GlobalContext";
import $map, { BASEMAPS, parcelKey } from "../../services/$map";
import $projects from "../../services/$projects";
import $parcels from "../../services/$parcels";
import $auth from "../../services/$auth";

/**
 * This activity's land, and nothing else. No cadastre and no administrative
 * regions — those are reference layers for *finding* a parcel and live in the
 * parcel picker. Here the parcels are the subject, over a basemap and whatever
 * baseline rasters are switched on.
 *
 * Every control lives on the map rather than above it: the basemap switch, and
 * a drawer holding the monitoring layers and the parcel list.
 */

// Enough room for the drawer plus its inset, so a parcel picked from the list
// is framed beside the panel instead of behind it.
const DRAWER_PADDING = 368;
const EDGE_PADDING = 48;

function ActivityMap() {
  const mapFrame = useRef();
  const mapElement = useRef();
  const drawerId = useId();

  const { activityId } = useActivity();
  const { operatorId } = useGlobal();

  const [error, setError] = useState("");
  const [basemap, setBasemap] = useState(BASEMAPS[0].id);
  const [overlays, setOverlays] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [parcelFeatures, setParcelFeatures] = useState(null);
  const [parcelsVisible, setParcelsVisible] = useState(true);
  const [selectedParcelId, setSelectedParcelId] = useState(null);

  const updateMapHeight = useCallback(() => {
    const frame = mapFrame.current;
    if (!frame) return;

    // In fullscreen the frame already is the viewport and the stylesheet has
    // zeroed the variable. Measuring a rect that fills the screen would only
    // fight that, and would be wrong again on the way back out.
    if (document.fullscreenElement === frame
      || frame.classList.contains("maplibregl-pseudo-fullscreen")) {
      return;
    }

    const { top } = frame.getBoundingClientRect();
    const footer = document.querySelector(".ogcr-footer");
    const footerHeight = footer?.offsetHeight || 0;
    const available = window.innerHeight - top - footerHeight - 24;

    // A variable rather than an inline height: the fullscreen rule has to be
    // able to override this, and it cannot outrank an inline style.
    frame.style.setProperty("--ogcr-map-height", `${Math.max(400, available)}px`);
  }, []);

  useEffect(() => {
    updateMapHeight();

    const element = mapElement.current;
    // The frame goes fullscreen, not the canvas, so the controls and the drawer
    // come with it.
    $map.init({ element, fullscreenElement: mapFrame.current, cadastre: false });

    const handleResize = () => {
      updateMapHeight();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // Still the map's own container: `destroy` checks ownership against it.
      $map.destroy(element);
    };
  }, [updateMapHeight]);

  // `parcels/geojson/` has no activity filter, so the activity's parcel ids come
  // from the link endpoint and narrow the Operator-wide collection here.
  useEffect(() => {
    if (!activityId) return undefined;

    let cancelled = false;

    const draw = (featureCollection) => {
      if (cancelled || !$map.instance) return;
      $map.setOperatorParcels(featureCollection);
      $map.fitToFeatures(featureCollection);
    };

    Promise.all([
      $projects.allParcels(activityId),
      $parcels.geojson(operatorId ? { operator: operatorId } : undefined),
    ])
      .then(([links, featureCollection]) => {
        if (cancelled) return;

        const ids = new Set(links.map((link) => String(link.parcel_detail?.id ?? link.parcel)));
        const mine = {
          type: "FeatureCollection",
          features: (featureCollection?.features || [])
            .filter((feature) => ids.has(String(feature.id ?? feature.properties?.id))),
        };

        setParcelFeatures(mine.features);

        // The style has to be ready before a source can be added.
        if ($map.instance?.isStyleLoaded?.()) {
          draw(mine);
        } else {
          $map.instance?.once?.("load", () => draw(mine));
        }
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError($auth.getErrorMessage(err));
      });

    return () => { cancelled = true; };
  }, [activityId, operatorId]);

  const handleBasemap = (id) => {
    setBasemap(id);
    $map.setBasemap(id);
  };

  const handleOverlay = (id, checked) => {
    setOverlays((current) => ({ ...current, [id]: checked }));
    $map.setOverlay(id, checked);
  };

  const handleParcelsVisible = (checked) => {
    setParcelsVisible(checked);
    $map.setParcelsVisible(checked);
  };

  const handleSelectParcel = (feature) => {
    const key = parcelKey(feature);

    setSelectedParcelId(key || null);
    $map.setSelectedParcel(key || null);
    $map.flyToFeature(feature, {
      padding: {
        top: EDGE_PADDING,
        right: EDGE_PADDING,
        bottom: EDGE_PADDING,
        left: drawerOpen ? DRAWER_PADDING : EDGE_PADDING,
      },
    });
  };

  const handleHoverParcel = (key) => {
    $map.setHoveredParcel(key || null);
  };

  return (
    <div className="ogcr-activity-tab" style={{ flex: "1 1 auto" }}>
   

      {Boolean(error) && (
        <Message
          variant="warning"
          title="Could not load this activity's parcels"
          description={error}
          onClose={() => setError("")}
        />
      )}

      {parcelFeatures?.length === 0 && (
        <Message
          variant="neutral"
          title="Nothing to show yet"
          description="This activity has no parcels. Add one from the Parcels tab and it will appear here."
        />
      )}

      <div ref={mapFrame} className="ogcr-map-frame ogcr-card--floating">
        <div ref={mapElement} className="ogcr-map-shell" />

        {/* Positioning layer. It covers the map, so it lets clicks through and
            only its own children take them back. */}
        <div className="ogcr-map-frame__overlay">
          <button
            type="button"
            className="ogcr-map-fab"
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen((current) => !current)}
          >
            <StackIcon size={16} weight="bold" aria-hidden="true" />
            <span>Layers</span>
          </button>

          <ActivityMapBasemapSwitch value={basemap} onChange={handleBasemap} />

          <ActivityMapLegendCard overlays={overlays} parcelsVisible={parcelsVisible} />
        </div>

        <ActivityMapDrawer
          id={drawerId}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          parcelsVisible={parcelsVisible}
          onParcelsVisible={handleParcelsVisible}
          overlays={overlays}
          onOverlay={handleOverlay}
          parcels={parcelFeatures || []}
          selectedParcelId={selectedParcelId}
          onSelectParcel={handleSelectParcel}
          onHoverParcel={handleHoverParcel}
        />
      </div>
    </div>
  );
}

export default ActivityMap;
