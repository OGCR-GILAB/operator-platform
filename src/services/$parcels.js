import api, { fetchAllPages } from "./$api";

class $parcels {
  /** Filters: operator, cadastral_reference, dcr_sync_status. */
  async list(params) {
    const { data } = await api.get('/parcels/', { params });
    return data;
  }

  async listAll(params) {
    return fetchAllPages('/parcels/', params);
  }

  async get(parcelId) {
    const { data } = await api.get(`/parcels/${parcelId}/`);
    return data;
  }

  /** Requires `operator` and a GeoJSON `geometry` (Polygon or MultiPolygon). */
  async create(model) {
    const { data } = await api.post('/parcels/', model);
    return data;
  }

  async update(parcelId, model) {
    const { data } = await api.put(`/parcels/${parcelId}/`, model);
    return data;
  }

  async patch(parcelId, model) {
    const { data } = await api.patch(`/parcels/${parcelId}/`, model);
    return data;
  }

  async remove(parcelId) {
    const { data } = await api.delete(`/parcels/${parcelId}/`);
    return data;
  }

  /**
   * A complete FeatureCollection (not paginated), ready for a MapLibre source.
   * Accepts the same filters as `list()`.
   */
  async geojson(params) {
    const { data } = await api.get('/parcels/geojson/', { params });
    return data;
  }

  async ownerVerification(parcelId) {
    const { data } = await api.get(`/parcels/${parcelId}/owner-verification/`);
    return data;
  }

  /** `status_code` is one of in_progress / verified / failed. */
  async saveOwnerVerification(parcelId, model) {
    const { data } = await api.put(`/parcels/${parcelId}/owner-verification/`, model);
    return data;
  }

  async patchOwnerVerification(parcelId, model) {
    const { data } = await api.patch(`/parcels/${parcelId}/owner-verification/`, model);
    return data;
  }
}

export default new $parcels();
