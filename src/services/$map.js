import axios from "axios";
import maplibregl, {
  AttributionControl,
  FullscreenControl,
  LngLat,
  NavigationControl,
} from "maplibre-gl";
import * as turf from '@turf/turf';
import moment from "moment";
import { OVERLAY_LAYERS } from "./mapLayers";

const OPERATOR_PARCELS_SOURCE = 'operator-parcels';
const CADASTRE_SEARCH_SOURCE = 'cadastre-search';
const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };

export const BASEMAPS = [
  { id: 'osm-grayscale-layer', label: 'Map' },
  { id: 'esri-sat-layer', label: 'Satellite' },
];

/**
 * The id one of the Operator's parcel features answers to.
 *
 * The counterpart to `promoteId: 'id'` on the source below: that tells MapLibre
 * to key feature state off `properties.id` and to ignore any id beside it, so
 * anything addressing a parcel — `setSelectedParcel`, a row in the layers
 * drawer — has to agree on the same value. MapLibre stringifies it internally,
 * so this does too and a numeric id from the API still matches.
 */
export const parcelKey = (feature) => {
  const id = feature?.properties?.id ?? feature?.id;
  return id === null || id === undefined ? '' : String(id);
};

class $map {
  constructor() {
    this.instance = null;
    this.popup = new maplibregl.Popup({
      className: 'popup-window',

      closeButton: false,
      closeOnClick: false
    });

    this.defaults = {
      center: [20.5, 45],
      zoom: 3,
    };

    // The cadastre parcel currently marked as selected, so the previous one can
    // be un-marked before the next takes its place.
    this.selectedCadastreId = null;

    this.activeOverlays = new Set();

    // Same idea for the Operator's own parcels, driven by the layers drawer.
    this.selectedParcelId = null;
    this.hoveredParcelId = null;

    // Whether the parcel layers should be drawn. Held here rather than read off
    // the map because the layers only exist once the parcels have been fetched,
    // and somebody can switch them off while that is still in flight.
    this.parcelsVisible = true;
  }

  /**
   * `cadastre` opts into the French cadastre and administrative-region layers.
   * They belong to picking a parcel, not to looking at the ones you already
   * have, so they are off unless a caller asks for them.
   *
   * `fullscreenElement` is what the fullscreen button expands. It defaults to
   * the map itself, which is what a caller with no chrome of its own wants; a
   * caller that floats its own controls over the map passes the wrapper holding
   * both, or they would disappear the moment somebody went fullscreen.
   */
  init(config) {
    const { element, fullscreenElement, center, zoom, cadastre = false } = config;

    // One instance at a time. Two maps can be mounted at once — a parcel picker
    // opening over the activity map — and the second would otherwise orphan the
    // first, leaving its canvas and listeners behind.
    this.destroy();

    this.instance = new maplibregl.Map({
      container: element,
      attributionControl: false,
      style: {
        glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        center: center || this.defaults.center,
        zoom: zoom || this.defaults.zoom,
        version: 8,
        sources: {
          "osm-grayscale": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          },
          "esri-sat": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 17,
            attribution:
              'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          },
        },
        layers: [
          {
            id: "osm-grayscale-layer",
            type: "raster",
            source: "osm-grayscale",
            paint: {
              // keep this if you want enforced grayscale styling
              "raster-saturation": -1,
            },
            layout: {
              visibility: 'visible'
            }
          },
          {
            id: "esri-sat-layer",
            type: "raster",
            source: "esri-sat",
            layout: {
              // start hidden; switch to visible when needed
              visibility: "none",
            },
          },
        ],
      },
    });

    this.instance.addControl(new NavigationControl());
    this.instance.addControl(new FullscreenControl({ container: fullscreenElement || element }));
    this.instance.addControl(new AttributionControl({ compact: true }));

    this.instance.on('load', () => {
      if (!cadastre) return;

      this.addCadastreLayers();
      this.setHoverEvent();
      this.setZoneHoverEvent();
    })
  }

  /**
   * Tear the map down and forget everything that was drawn on it.
   *
   * Pass the element the caller mounted into: if the live map belongs to
   * somebody else by now — because a second component initialised over it — the
   * teardown is skipped rather than killing a map the caller does not own.
   */
  destroy(element) {
    if (!this.instance) return;
    if (element && this.instance.getContainer?.() !== element) return;

    this.instance.remove();
    this.instance = null;

    this.popup.remove();
    this.selectedCadastreId = null;
    this.activeOverlays = new Set();

    this.selectedParcelId = null;
    this.hoveredParcelId = null;
    this.parcelsVisible = true;
  }

  /** Show one of `BASEMAPS`, hiding the rest. */
  setBasemap(basemapId) {
    if (!this.instance) return;

    BASEMAPS.forEach(({ id }) => {
      if (!this.instance.getLayer(id)) return;
      this.instance.setLayoutProperty(id, 'visibility', id === basemapId ? 'visible' : 'none');
    });
  }

  /**
   * Toggle one of the `OVERLAY_LAYERS` rasters. The source and layer are added
   * the first time it is switched on, so an overlay nobody opens costs nothing.
   * Overlays sit under the Operator's parcels — the parcels are the subject.
   */
  setOverlay(overlayId, visible) {
    if (!this.instance) return;

    const overlay = OVERLAY_LAYERS.find((item) => item.id === overlayId);
    if (!overlay) return;

    if (!this.instance.getLayer(overlay.id)) {
      if (!visible) return;

      if (!this.instance.getSource(overlay.sourceId)) {
        this.instance.addSource(overlay.sourceId, overlay.source);
      }

      // `beforeId` only counts if that layer exists yet; the parcels are added
      // asynchronously, so fall back to the top of the stack.
      const beforeId = this.instance.getLayer('operator-parcels-fill')
        ? 'operator-parcels-fill'
        : undefined;

      this.instance.addLayer({ ...overlay.layer, id: overlay.id, source: overlay.sourceId }, beforeId);
      this.activeOverlays.add(overlay.id);
      return;
    }

    this.instance.setLayoutProperty(overlay.id, 'visibility', visible ? 'visible' : 'none');

    if (visible) {
      this.activeOverlays.add(overlay.id);
    } else {
      this.activeOverlays.delete(overlay.id);
    }
  }

  /**
   * Dial one overlay's strength. Which paint property that is belongs to the
   * layer — a raster fades, a hillshade exaggerates — so the registry names it.
   */
  setOverlayOpacity(overlayId, value) {
    if (!this.instance) return;

    const overlay = OVERLAY_LAYERS.find((item) => item.id === overlayId);
    if (!overlay?.opacity) return;
    if (!this.instance.getLayer(overlay.id)) return;

    this.instance.setPaintProperty(overlay.id, overlay.opacity.property, value);
  }

  setZoneHoverEvent() {
    let hoveredId = null;

    this.instance.on("mousemove", "zones-nl", (e) => {
      if (!e.features?.length) {
        this.popup.remove();
        return
      };

      const feature = e.features[0];
      const id = feature.id;


      if (id === undefined || id === null) return;

      if (id !== hoveredId) {
        const centroid = turf.centroid(feature);
        const rect = this.instance.getCanvas().getBoundingClientRect();
        this.popup.setLngLat(this.instance.unproject([0, 0])).setHTML(this.createZoneHtml(feature.properties)).addTo(this.instance);
      }

      if (hoveredId !== null) {
        this.instance.setFeatureState(
          { source: "administrative-fr", sourceLayer: "regions", id: hoveredId },
          { hover: false }
        );
      }

      hoveredId = id;
      this.instance.setFeatureState(
        { source: "administrative-fr", sourceLayer: "regions", id: hoveredId },
        { hover: true }
      );

      this.instance.getCanvas().style.cursor = "pointer";
    });

    this.instance.on("mouseleave", "zones-nl", () => {
      if (hoveredId !== null) {
        this.instance.setFeatureState(
          { source: "administrative-fr", sourceLayer: "regions", id: hoveredId },
          { hover: false }
        );
      }

      this.popup.remove();
      hoveredId = null;
      this.instance.getCanvas().style.cursor = "";
    });
  }

  setHoverEvent() {
    let hoveredId = null;

    this.instance.on("mousemove", "parcels-nl", (e) => {
      if (!e.features?.length) {
        this.popup.remove();
        return
      };

      const feature = e.features[0];
      const id = feature.id;


      if (id === undefined || id === null) return;

      if (id !== hoveredId) {
        const centroid = turf.centroid(feature);
        const rect = this.instance.getCanvas().getBoundingClientRect();
        this.popup.setLngLat(this.instance.unproject([0, 0])).setHTML(this.createParcelHtml(feature.properties)).addTo(this.instance);
      }

      if (hoveredId !== null) {
        this.instance.setFeatureState(
          { source: "cadastre-nl", sourceLayer: "parcelles", id: hoveredId },
          { hover: false }
        );
      }

      hoveredId = id;
      this.instance.setFeatureState(
        { source: "cadastre-nl", sourceLayer: "parcelles", id: hoveredId },
        { hover: true }
      );

      this.instance.getCanvas().style.cursor = "pointer";
    });

    this.instance.on("mouseleave", "parcels-nl", () => {
      if (hoveredId !== null) {
        this.instance.setFeatureState(
          { source: "cadastre-nl", sourceLayer: "parcelles", id: hoveredId },
          { hover: false }
        );
      }

      this.popup.remove();
      hoveredId = null;
      this.instance.getCanvas().style.cursor = "";
    });
  }

  /**
   * Draw the Operator's own parcels from `GET parcels/geojson/`, on top of the
   * cadastre layers. Colour follows `dcr_sync_status`, so it is obvious at a
   * glance what has been submitted and what is still local.
   */
  setOperatorParcels(featureCollection) {
    if (!this.instance) return;

    const data = featureCollection || { type: 'FeatureCollection', features: [] };

    const existing = this.instance.getSource(OPERATOR_PARCELS_SOURCE);
    if (existing) {
      existing.setData(data);

      // `setData` wipes every feature state on the source, so a parcel picked
      // in the drawer would silently lose its highlight on a refetch.
      this.restoreParcelState();
      return;
    }

    this.instance.addSource(OPERATOR_PARCELS_SOURCE, {
      type: 'geojson',
      data,
      promoteId: 'id',
    });

    const visibility = this.parcelsVisible ? 'visible' : 'none';

    this.instance.addLayer({
      id: 'operator-parcels-fill',
      type: 'fill',
      source: OPERATOR_PARCELS_SOURCE,
      layout: { visibility },
      paint: {
        // Colour is the legend's contract — see `.ogcr-map-legend__swatch` in
        // index.css. Picking a parcel lifts its opacity instead, so the colour
        // never stops meaning the DCR state.
        "fill-color": [
          "match",
          ["get", "dcr_sync_status"],
          "synced", "#2e7d5b",
          "failed", "#b4453c",
          "#c98a2e"
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false], 0.75,
          ["boolean", ["feature-state", "hover"], false], 0.6,
          0.45
        ]
      },
    });

    this.instance.addLayer({
      id: 'operator-parcels-line',
      type: 'line',
      source: OPERATOR_PARCELS_SOURCE,
      layout: { visibility },
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false], "#1b1b1b",
          "#FFFFFF"
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false], 4,
          ["boolean", ["feature-state", "hover"], false], 3,
          2
        ]
      },
    });

    // Overlays switched on before the parcels arrived had nothing to sit under,
    // so `setOverlay` left them at the top of the stack. The parcels are the
    // subject of this map; push the overlays back underneath them.
    this.activeOverlays.forEach((overlayId) => {
      if (this.instance.getLayer(overlayId)) {
        this.instance.moveLayer(overlayId, 'operator-parcels-fill');
      }
    });

    this.restoreParcelState();
  }

  /** Re-apply the current hover/selection after the source data is replaced. */
  restoreParcelState() {
    this._setParcelState(this.selectedParcelId, 'selected', true);
    this._setParcelState(this.hoveredParcelId, 'hover', true);
  }

  _setParcelState(parcelId, key, value) {
    if (!this.instance?.getSource(OPERATOR_PARCELS_SOURCE)) return;
    if (parcelId === null || parcelId === undefined || parcelId === '') return;

    this.instance.setFeatureState(
      { source: OPERATOR_PARCELS_SOURCE, id: parcelId },
      { [key]: value },
    );
  }

  /** Mark one of the Operator's parcels as picked; `null` just clears the last. */
  setSelectedParcel(parcelId) {
    this._setParcelState(this.selectedParcelId, 'selected', false);
    this.selectedParcelId = parcelId === null || parcelId === undefined ? null : String(parcelId);
    this._setParcelState(this.selectedParcelId, 'selected', true);
  }

  /** The lighter version of the above, for pointing at a row in a list. */
  setHoveredParcel(parcelId) {
    this._setParcelState(this.hoveredParcelId, 'hover', false);
    this.hoveredParcelId = parcelId === null || parcelId === undefined ? null : String(parcelId);
    this._setParcelState(this.hoveredParcelId, 'hover', true);
  }

  /**
   * Show or hide the Operator's parcels. Remembered on the service, because the
   * layers are only added once the parcels have been fetched and a switch
   * flipped before then would otherwise be undone when they arrive.
   */
  setParcelsVisible(visible) {
    this.parcelsVisible = visible !== false;
    if (!this.instance) return;

    ['operator-parcels-fill', 'operator-parcels-line'].forEach((id) => {
      if (!this.instance.getLayer(id)) return;
      this.instance.setLayoutProperty(id, 'visibility', this.parcelsVisible ? 'visible' : 'none');
    });
  }

  /**
   * Draw the results of a cadastre search. The selected parcel reads
   * differently from the rest, so it is obvious which one Confirm would take.
   */
  setCadastreResults(featureCollection) {
    if (!this.instance) return;

    const data = featureCollection || EMPTY_COLLECTION;

    const existing = this.instance.getSource(CADASTRE_SEARCH_SOURCE);
    if (existing) {
      existing.setData(data);
      return;
    }

    this.instance.addSource(CADASTRE_SEARCH_SOURCE, {
      type: 'geojson',
      data,
      // The IDU is the parcel's full cadastral id, unique per feature.
      promoteId: 'idu',
    });

    this.instance.addLayer({
      id: 'cadastre-search-fill',
      type: 'fill',
      source: CADASTRE_SEARCH_SOURCE,
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#6db087",
          "#c98a2e"
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.6,
          0.35
        ]
      },
    });

    this.instance.addLayer({
      id: 'cadastre-search-line',
      type: 'line',
      source: CADASTRE_SEARCH_SOURCE,
      paint: {
        "line-color": "#FFFFFF",
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          4,
          2
        ]
      },
    });
  }

  /** Mark one search result as selected; `null` just clears the previous one. */
  setSelectedCadastreParcel(idu) {
    if (!this.instance || !this.instance.getSource(CADASTRE_SEARCH_SOURCE)) return;

    if (this.selectedCadastreId) {
      this.instance.setFeatureState(
        { source: CADASTRE_SEARCH_SOURCE, id: this.selectedCadastreId },
        { selected: false },
      );
    }

    this.selectedCadastreId = idu || null;

    if (this.selectedCadastreId) {
      this.instance.setFeatureState(
        { source: CADASTRE_SEARCH_SOURCE, id: this.selectedCadastreId },
        { selected: true },
      );
    }
  }

  clearCadastreResults() {
    // Nothing searched yet means nothing to clear — and adding the source here
    // would throw, since teardown can run before the style has finished loading.
    if (!this.instance || !this.instance.getSource(CADASTRE_SEARCH_SOURCE)) return;

    this.setSelectedCadastreParcel(null);
    this.setCadastreResults(null);
  }

  /**
   * Call `handler` when a cadastre parcel is clicked, whether it came from a
   * search result or straight off the vector tiles. The two sources name their
   * properties differently, so they are normalised here. Returns an
   * unsubscribe, like `$auth.onUnauthorized`.
   */
  onCadastreClick(handler) {
    if (!this.instance) return () => {};

    const fromResult = (event) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) return;

      handler({
        source: 'search',
        idu: properties.idu,
        code_insee: properties.code_insee,
        section: properties.section,
        numero: properties.numero,
      });
    };

    const fromTile = (event) => {
      // A search result on top of the tile wins; it is the authoritative one.
      // The layer only exists once a search has run, hence the guard — querying
      // a missing layer makes MapLibre log an error.
      if (this.instance.getLayer('cadastre-search-fill')) {
        const covered = this.instance.queryRenderedFeatures(event.point, {
          layers: ['cadastre-search-fill'],
        });
        if (covered.length) return;
      }

      const properties = event.features?.[0]?.properties;
      if (!properties) return;

      handler({
        source: 'tile',
        idu: properties.id,
        code_insee: properties.commune,
        section: properties.section,
        numero: properties.numero,
      });
    };

    this.instance.on('click', 'cadastre-search-fill', fromResult);
    this.instance.on('click', 'parcels-nl', fromTile);

    return () => {
      this.instance?.off('click', 'cadastre-search-fill', fromResult);
      this.instance?.off('click', 'parcels-nl', fromTile);
    };
  }

  /** Zoom to a FeatureCollection; a no-op when there is nothing to zoom to. */
  fitToFeatures(featureCollection, options = {}) {
    const features = featureCollection?.features || [];
    if (!this.instance || !features.length) return;

    let [minLng, minLat, maxLng, maxLat] = [Infinity, Infinity, -Infinity, -Infinity];

    const visit = (coordinates) => {
      if (typeof coordinates[0] === 'number') {
        const [lng, lat] = coordinates;
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
        return;
      }

      coordinates.forEach(visit);
    };

    features.forEach((feature) => {
      if (feature?.geometry?.coordinates) visit(feature.geometry.coordinates);
    });

    if (!Number.isFinite(minLng)) return;

    this.instance.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 48,
      maxZoom: 15,
      ...options,
    });
  }

  /**
   * Zoom to a single feature — one parcel picked out of a list. Closer than
   * `fitToFeatures` goes, since there is only one thing to frame. Callers with
   * something floating over the map pass asymmetric `padding` so the parcel
   * does not land underneath it.
   */
  flyToFeature(feature, options = {}) {
    if (!feature) return;

    this.fitToFeatures(
      { type: 'FeatureCollection', features: [feature] },
      { maxZoom: 17, duration: 700, ...options },
    );
  }

  /**
   * The French cadastre and the administrative regions — reference layers for
   * finding a parcel, not the Operator's own land. `setOperatorParcels()` draws
   * that, and is what the activity map shows on its own.
   */
  addCadastreLayers() {

    this.instance.addSource('administrative-fr', {
      type: 'vector',
      tiles: [
        'https://openmaptiles.data.gouv.fr/data/decoupage-administratif/{z}/{x}/{y}.pbf'
      ],
      maxzoom: 12,
      promoteId: 'code'
    });


    this.instance.addSource('cadastre-nl', {
      type: "vector",
      tiles: [
        "https://openmaptiles.geo.data.gouv.fr/data/cadastre/{z}/{x}/{y}.pbf",
        // "https://api.pdok.nl/kadaster/brk-kadastrale-kaart/ogc/v1/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt"
      ],
      promoteId: 'id',
      maxzoom: 15,

    })

    this.instance.addLayer({
      id: 'parcels-nl',
      type: 'fill',
      minzoom: 12,
      source: 'cadastre-nl',
      'source-layer': 'parcelles',
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#6db087",
          "#0f3655"
        ],
        "fill-opacity": 0.4
      },
    })

    this.instance.addLayer({
      id: 'parcels-nl_line',
      type: 'line',
      minzoom: 12,
      source: 'cadastre-nl',
      'source-layer': 'parcelles',
      paint: {
        "line-color": "#FFFFFF",
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          4,
          2
        ]
      },
    });

    this.instance.addLayer({
      id: 'zones-nl',
      type: 'fill',
      minzoom: 3,
      maxzoom: 13,
      source: 'administrative-fr',
      'source-layer': 'regions',
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "#6db087",
          "#0f3655"
        ],
        "fill-opacity": 0.4
      },
    })

    this.instance.addLayer({
      id: 'zones-nl_line',
      type: 'line',
      minzoom: 3,
      maxzoom: 13,
      source: 'administrative-fr',
      'source-layer': 'regions',
      paint: {
        "line-color": "#FFFFFF",
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          4,
          2
        ]
      },
    });

    // this.instance.addLayer({
    //   id: 'zones-nl_text',
    //   type: 'symbol',
    //   minzoom: 3,
    //   maxzoom: 13,
    //   source: 'administrative-fr',
    //   'source-layer': 'regions',
    //   paint: {
    //     'text-color': "#FFFFFF",
    //     'text-halo-color': "#0f3655",
    //     'text-halo-width': 2
    //   },
    //   layout: {
    
    //     'text-allow-overlap': false,
    //     "symbol-avoid-edges": true,
    //     'symbol-placement': 'point',
    //     'text-padding': 2,
    //     'text-field':
    //       ["get", "nom"]

    //   }
    // });
  }

  async getFRParcels(filter = {}) {
    let formated = [];

    if (filter.commune) {
      formated.push(`code_insee=${filter.commune}`)
    }

    if (filter.prefixe) {
      formated.push(`prefixe=${filter.prefixe}`)
    }

    if (filter.section) {
      if (filter.section.length === 1) {
        filter.section = `0${filter.section}`;
      }

      formated.push(`section=${filter.section}`)
    }

    if (filter.numero) {
      let numero = `0000`;

      numero = `${numero.substring(0, numero.length - filter.numero.length)}${filter.numero}`;

      formated.push(`numero=${numero}`)
    }

    // The promise has to be returned, or every caller awaits undefined.
    return axios
      .get(`https://data.geopf.fr/tst/collections/parcelles/items/${formated.length ? `?${formated.join('&')}` : ''}`)
      .then(result => result.data);
  }

  createZoneHtml(zone = {}) {
       const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");



    return `
    <section class="ogcr-parcel-popup" aria-label="Parcel details">
      <dl class="ogcr-parcel-popup__list">
       <div class="ogcr-parcel-popup__item">
          <dt class="ogcr-parcel-popup__label">Region</dt>
          <dd class="ogcr-parcel-popup__value">${escapeHtml(zone.nom)}</dd>
        </div>
      </dl>
    </section>
  `;
  }

  createParcelHtml(parcel = {}) {
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formatDate = (value) => {
      if (!value) return "";
      const date = moment(value);
      return date.isValid() ? date.format("YYYY-MM-DD") : escapeHtml(value);
    };

    return `
    <section class="ogcr-parcel-popup" aria-label="Parcel details">
      <div class="ogcr-parcel-popup__header">
        <h5 class="ogcr-parcel-popup__title">Parcel ID</h5>
        <span class="ogcr-parcel-popup__id">${escapeHtml(parcel.id)}</span>
      </div>
      <div class="ogcr-parcel-popup__header">
        <h5 class="ogcr-parcel-popup__title">Area</h5>
        <span class="ogcr-parcel-popup__id">${escapeHtml(parcel.contenance)} m²</span>
      </div>
      <dl class="ogcr-parcel-popup__list">
        <div class="ogcr-parcel-popup__item">
          <dt class="ogcr-parcel-popup__label">INSEE Code</dt>
          <dd class="ogcr-parcel-popup__value">${escapeHtml(parcel.commune)}</dd>
        </div>
        <div class="ogcr-parcel-popup__item">
          <dt class="ogcr-parcel-popup__label">Prefixe</dt>
          <dd class="ogcr-parcel-popup__value">${escapeHtml(parcel.prefixe)}</dd>
        </div>
        <div class="ogcr-parcel-popup__item">
          <dt class="ogcr-parcel-popup__label">Section</dt>
          <dd class="ogcr-parcel-popup__value">${escapeHtml(parcel.section)}</dd>
        </div>
          <div class="ogcr-parcel-popup__item">
            <dt class="ogcr-parcel-popup__label">Numero</dt>
            <dd class="ogcr-parcel-popup__value">${escapeHtml(parcel.numero)}</dd>
          </div>
        <div class="ogcr-parcel-popup__item ogcr-parcel-popup__item--last">
          <dt class="ogcr-parcel-popup__label">Last Update</dt>
          <dd class="ogcr-parcel-popup__value">${formatDate(parcel.updated)}</dd>
        </div>
      </dl>
    </section>
  `;
  }
}

export default new $map();
