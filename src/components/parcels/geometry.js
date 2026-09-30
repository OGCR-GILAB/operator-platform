// Parcel geometry helpers.
//
// The API accepts a GeoJSON Polygon or MultiPolygon in any SRID (WGS84 when
// unspecified) and always stores and returns MultiPolygon in EPSG:4326.
// Self-intersecting geometries are rejected with an explanatory message.

const ACCEPTED_TYPES = ["Polygon", "MultiPolygon"];

/**
 * Pull a usable geometry out of whatever GeoJSON the cadastre returned: a bare
 * geometry, a Feature, or a FeatureCollection (whose polygons are merged into
 * one MultiPolygon).
 */
export function extractGeometry(geojson) {
  if (!geojson || typeof geojson !== "object") {
    return { error: "That is not GeoJSON." };
  }

  if (ACCEPTED_TYPES.includes(geojson.type)) {
    return { geometry: geojson };
  }

  if (geojson.type === "Feature") {
    return extractGeometry(geojson.geometry);
  }

  if (geojson.type === "FeatureCollection") {
    const polygons = (geojson.features || [])
      .map((feature) => feature?.geometry)
      .filter((geometry) => ACCEPTED_TYPES.includes(geometry?.type));

    if (!polygons.length) {
      return { error: "That FeatureCollection contains no polygons." };
    }

    if (polygons.length === 1) {
      return { geometry: polygons[0] };
    }

    // Several features become one MultiPolygon — one parcel, one geometry.
    const coordinates = polygons.flatMap((geometry) => (
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
    ));

    return { geometry: { type: "MultiPolygon", coordinates } };
  }

  return { error: `Unsupported GeoJSON type "${geojson.type}". Use a Polygon or MultiPolygon.` };
}

/** Rough ring count, so the form can say something about the chosen parcel. */
export function describeGeometry(geometry) {
  if (!geometry) return "";

  if (geometry.type === "Polygon") {
    return `Polygon — ${geometry.coordinates?.[0]?.length ?? 0} points`;
  }

  if (geometry.type === "MultiPolygon") {
    const parts = geometry.coordinates?.length ?? 0;
    return `MultiPolygon — ${parts} part${parts === 1 ? "" : "s"}`;
  }

  return geometry.type || "";
}
