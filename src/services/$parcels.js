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

  /** The operator sets `status_code` to in_progress / verified / failed; a DCR verdict may be any VERIFICATION_STATUSES code. */
  async saveOwnerVerification(parcelId, model) {
    const { data } = await api.put(`/parcels/${parcelId}/owner-verification/`, model);
    return data;
  }

  async patchOwnerVerification(parcelId, model) {
    const { data } = await api.patch(`/parcels/${parcelId}/owner-verification/`, model);
    return data;
  }

  /** The declared owner (DCR `parcel_owner`); `404` while none is declared. */
  async owner(parcelId) {
    const { data } = await api.get(`/parcels/${parcelId}/owner/`);
    return data;
  }

  /** `{legal_name, owner_type, country_code, document}`; `document` may be null. */
  async saveOwner(parcelId, model) {
    const { data } = await api.put(`/parcels/${parcelId}/owner/`, model);
    return data;
  }

  async patchOwner(parcelId, model) {
    const { data } = await api.patch(`/parcels/${parcelId}/owner/`, model);
    return data;
  }

  /**
   * Legal-person holders the land registry knows for a French parcel
   * (DGFiP open data), with `matches_declared` against the declared owner.
   * `404` when the parcel has no French cadastral reference.
   */
  async registryOwners(parcelId) {
    const { data } = await api.get(`/parcels/${parcelId}/registry-owners/`);
    return data;
  }
}

export default new $parcels();
