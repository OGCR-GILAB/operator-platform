import api, { fetchAllPages, toList } from "./$api";

/**
 * Projects are DCR "activities". Everything here stays local to this API until
 * `submit()` — nothing reaches DCR before that, then it all goes in one call.
 */
class $projects {
  /** Filters: status, type, operator, dcr_sync_status. Plus search / ordering / page. */
  async list(params) {
    const { data } = await api.get('/projects/', { params });
    return data;
  }

  async listAll(params) {
    return fetchAllPages('/projects/', params);
  }

  async get(projectId) {
    const { data } = await api.get(`/projects/${projectId}/`);
    return data;
  }

  /**
   * The schema only requires `name`, but readiness blocks submission without
   * `operator`, `start_date`, `end_date` and `type` (or `unit_types`) — send them.
   */
  async create(model) {
    const { data } = await api.post('/projects/', model);
    return data;
  }

  async update(projectId, model) {
    const { data } = await api.put(`/projects/${projectId}/`, model);
    return data;
  }

  async patch(projectId, model) {
    const { data } = await api.patch(`/projects/${projectId}/`, model);
    return data;
  }

  async remove(projectId) {
    const { data } = await api.delete(`/projects/${projectId}/`);
    return data;
  }

  // --- plans (single objects, not lists) ---------------------------------

  async plan(projectId) {
    const { data } = await api.get(`/projects/${projectId}/plan/`);
    return data;
  }

  /** PUT creates or replaces the activity plan; no field is required. */
  async savePlan(projectId, model) {
    const { data } = await api.put(`/projects/${projectId}/plan/`, model);
    return data;
  }

  async patchPlan(projectId, model) {
    const { data } = await api.patch(`/projects/${projectId}/plan/`, model);
    return data;
  }

  async monitoringPlan(projectId) {
    const { data } = await api.get(`/projects/${projectId}/monitoring-plan/`);
    return data;
  }

  async saveMonitoringPlan(projectId, model) {
    const { data } = await api.put(`/projects/${projectId}/monitoring-plan/`, model);
    return data;
  }

  async patchMonitoringPlan(projectId, model) {
    const { data } = await api.patch(`/projects/${projectId}/monitoring-plan/`, model);
    return data;
  }

  // --- parcels -----------------------------------------------------------

  async parcels(projectId, params) {
    const { data } = await api.get(`/projects/${projectId}/parcels/`, { params });
    return data;
  }

  async allParcels(projectId, params) {
    return fetchAllPages(`/projects/${projectId}/parcels/`, params);
  }

  /**
   * Only `parcel` matters. DCR's `parcel_activity` link has no status or amount;
   * per-parcel verification comes from `dcrStatus()`.
   */
  async linkParcel(projectId, model) {
    const payload = typeof model === 'object' ? model : { parcel: model };
    const { data } = await api.post(`/projects/${projectId}/parcels/`, payload);
    return data;
  }

  async unlinkParcel(projectId, parcelId) {
    const { data } = await api.delete(`/projects/${projectId}/parcels/${parcelId}/`);
    return data;
  }

  // --- lifecycle ---------------------------------------------------------

  /** `{ ready, editable, errors[], warnings[], checks[] }` — errors block submit. */
  async readiness(projectId) {
    const { data } = await api.get(`/projects/${projectId}/readiness/`);
    return data;
  }

  async markReady(projectId) {
    const { data } = await api.post(`/projects/${projectId}/ready/`);
    return data;
  }

  async reopen(projectId) {
    const { data } = await api.post(`/projects/${projectId}/reopen/`);
    return data;
  }

  /**
   * Pushes operator, activity, plans, parcels and documents to DCR in one call.
   * 400 -> `{detail, problems[]}`; 502 -> `{detail, step}` and the project stays
   * editable, so the UI should offer a resubmit rather than a dead end.
   */
  async submit(projectId) {
    const { data } = await api.post(`/projects/${projectId}/submit/`);
    return data;
  }

  /** Last known DCR outcome. Poll on page load, not continuously. */
  async dcrStatus(projectId) {
    const { data } = await api.get(`/projects/${projectId}/dcr-status/`);
    return data;
  }

  /** Refresh the outcome from DCR. 409 if the project was never submitted. */
  async refreshDcrStatus(projectId) {
    const { data } = await api.post(`/projects/${projectId}/dcr-status/`);
    return data;
  }
}

export const SUBMIT_STEP_LABELS = {
  operator: 'operator',
  activity: 'activity',
  activity_plan: 'activity plan',
  monitoring_plan: 'monitoring plan',
  parcel: 'parcel',
  document: 'document',
};

export { toList };

export default new $projects();
