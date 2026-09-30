/**
 * Baseline rasters that can be drawn under the Operator's parcels on the
 * activity map — imagery, land cover and terrain today, soil or yield rasters
 * later. Adding one is a new entry here; `$map.setOverlay()` handles the rest,
 * and only ever loads a source once somebody switches the overlay on.
 *
 * `layer` is a MapLibre layer spec minus `id` and `source`, which `$map` fills
 * in from the fields beside it.
 *
 * `group` is the heading the layers drawer files the entry under; anything
 * without one lands in a trailing "Layers" group. `LAYER_GROUPS` below fixes
 * the order so the drawer does not reshuffle itself when an entry is added.
 *
 * `opacity` is optional and describes the layer's one strength knob. The
 * property is named explicitly because it is not always `raster-opacity` — a
 * hillshade is dialled with `hillshade-exaggeration`.
 *
 * `legend` is the colour key the drawer shows while the layer is on. Classified
 * rasters need one to mean anything; plain imagery does not, and leaves it off.
 */

import { CLC_LEGEND, TREE_COVER_LOSS_LEGEND } from './mapLegends';

export const LAYER_GROUPS = ['Imagery', 'Environment', 'Terrain'];

export const OVERLAY_LAYERS = [
  {
    id: 'sentinel2-cloudless-layer',
    label: 'Sentinel-2 imagery',
    description: 'Cloud-free 10 m mosaic. Truer colour than the satellite basemap.',
    group: 'Imagery',
    sourceId: 'sentinel2-cloudless',
    source: {
      type: 'raster',
      // WMTS addresses tiles as TileRow/TileCol, so this is {z}/{y}/{x} — not
      // the {z}/{x}/{y} of an XYZ service. Swapping them silently serves the
      // wrong part of the world rather than failing.
      tiles: [
        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
      ],
      tileSize: 256,
      // Native resolution is 10 m; past z15 it still serves, but only overzoom.
      maxzoom: 15,
      attribution:
        'Sentinel-2 cloudless by <a href="https://eox.at" target="_blank">EOX IT Services GmbH</a>'
        + ' (Contains modified Copernicus Sentinel data 2024)',
    },
    layer: {
      type: 'raster',
      paint: {
        'raster-opacity': 1,
      },
    },
    opacity: {
      property: 'raster-opacity',
      default: 1,
      min: 0,
      max: 1,
      step: 0.05,
    },
    // NOTE: EOX publishes s2cloudless under CC BY-NC-SA 4.0 — non-commercial.
    // Shipped on a deliberate decision to treat the commercial tier at
    // https://cloudless.eox.at as a later procurement question. Every other
    // layer here, and both basemaps, are free of that restriction.
  },
  {
    id: 'land-cover-layer',
    label: 'Land cover',
    description: 'CORINE Land Cover 2018 — 44 classes, Europe only.',
    group: 'Environment',
    sourceId: 'land-cover',
    source: {
      // Rendered server-side per tile rather than read from a pyramid, so the
      // bbox is substituted per request. MapLibre fills `{bbox-epsg-3857}` in
      // as minx,miny,maxx,maxy, which is the order this endpoint expects.
      //
      // This replaced ESA WorldCover (services.terrascope.be), which stopped
      // serving tiles. If that host comes back it is the better dataset — 10 m
      // and global, where CORINE is 100 m and stops at the edge of Europe.
      //
      // Deliberately no `layers=show:` parameter: the service holds the raster
      // and the vector rendering of the same data at different scale ranges,
      // and letting it choose is what makes the layer draw at every zoom.
      type: 'raster',
      tiles: [
        'https://image.discomap.eea.europa.eu/arcgis/rest/services/Corine/CLC2018_WM'
        + '/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857'
        + '&size=256,256&format=png32&transparent=true&f=image',
      ],
      tileSize: 256,
      // The data is 100 m; past this a request only buys a blurrier picture, so
      // MapLibre stretches what it already has instead of asking for more.
      maxzoom: 14,
      attribution:
        '&copy; <a href="https://land.copernicus.eu/pan-european/corine-land-cover"'
        + ' target="_blank">European Environment Agency</a> — CORINE Land Cover',
    },
    layer: {
      type: 'raster',
      paint: {
        'raster-opacity': 0.65,
      },
    },
    opacity: {
      property: 'raster-opacity',
      default: 0.65,
      min: 0,
      max: 1,
      step: 0.05,
    },
    legend: CLC_LEGEND,
  },
  {
    id: 'tree-cover-loss-layer',
    label: 'Tree cover loss',
    description: 'Hansen / UMD global forest loss, pre-rendered (GFC v1.13).',
    group: 'Environment',
    sourceId: 'tree-cover-loss',
    source: {
      type: 'raster',
      // The pre-rendered pyramid, not the Global Forest Watch tiles API. GFW
      // serves data-encoded tiles (red channel = loss year index) for a client
      // that decodes them; MapLibre has no raster colour ramp, so those render
      // as a black square. The cost of this one is a single colour for every
      // loss year instead of per-year shading.
      tiles: [
        'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.13'
        + '/loss_alpha/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      // Hard ceiling, not a preference: z13 and above 404.
      maxzoom: 12,
      attribution:
        'Hansen/UMD/Google/USGS/NASA — <a href="https://glad.earthengine.app/view/global-forest-change"'
        + ' target="_blank">Global Forest Change</a>',
    },
    layer: {
      type: 'raster',
      paint: {
        'raster-opacity': 0.85,
      },
    },
    opacity: {
      property: 'raster-opacity',
      default: 0.85,
      min: 0,
      max: 1,
      step: 0.05,
    },
    legend: TREE_COVER_LOSS_LEGEND,
  },
  {
    id: 'hillshade-layer',
    label: 'Terrain',
    description: 'Relief shading from SRTM elevation — slope and aspect at a glance.',
    group: 'Terrain',
    sourceId: 'terrain-dem',
    source: {
      // A DEM, not an image: MapLibre derives the shading itself, so the tiles
      // carry elevation rather than pixels and `encoding` is what makes them
      // readable.
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      // z16 404s.
      maxzoom: 15,
      attribution:
        '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"'
        + ' target="_blank">Tilezen Terrain Tiles</a> — SRTM, USGS, NRCan and others',
    },
    layer: {
      type: 'hillshade',
      paint: {
        'hillshade-exaggeration': 0.4,
      },
    },
    opacity: {
      property: 'hillshade-exaggeration',
      default: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
    },
  },
];

export default OVERLAY_LAYERS;
