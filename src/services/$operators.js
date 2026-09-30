import api, { fetchAllPages, toList } from "./$api";

class $operators {
  /** Paginated; the API already scopes this to the operators you belong to. */
  async list(params) {
    const { data } = await api.get('/operators/', { params });
    return data;
  }

  async listAll(params) {
    return fetchAllPages('/operators/', params);
  }

  async get(operatorId) {
    const { data } = await api.get(`/operators/${operatorId}/`);
    return data;
  }

  /** Requires legal_name, email, country_code. The creator becomes the first member. */
  async create(model) {
    const { data } = await api.post('/operators/', model);
    return data;
  }

  async update(operatorId, model) {
    const { data } = await api.put(`/operators/${operatorId}/`, model);
    return data;
  }

  async patch(operatorId, model) {
    const { data } = await api.patch(`/operators/${operatorId}/`, model);
    return data;
  }

  async remove(operatorId) {
    const { data } = await api.delete(`/operators/${operatorId}/`);
    return data;
  }

  async members(operatorId, params) {
    const { data } = await api.get(`/operators/${operatorId}/members/`, { params });
    return toList(data);
  }

  /** The person must have logged in at least once. Pass username or email. */
  async addMember(operatorId, { username, email, relationship }) {
    const { data } = await api.post(`/operators/${operatorId}/members/`, {
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      relationship,
    });
    return data;
  }

  /** 409 when it would remove the last member. */
  async removeMember(operatorId, userId) {
    const { data } = await api.delete(`/operators/${operatorId}/members/${userId}/`);
    return data;
  }

  /**
   * DCR's own operator record, read live:
   * `{ dcr_id, dcr_synced_at, fetched_at, record, ogcr_wallet_address }`.
   *
   * 404 until the operator has been registered on DCR, which happens on the
   * first project submit — an empty state, not a failure. 502 with
   * `step: "operator"` when DCR itself cannot be read. Both are left to the
   * caller via `classifyOperatorDcr`, so neither is swallowed here.
   */
  async dcr(operatorId) {
    const { data } = await api.get(`/operators/${operatorId}/dcr/`);
    return data;
  }
}

export const OPERATOR_DCR_STATES = {
  registered: 'registered',
  unregistered: 'unregistered',
  unavailable: 'unavailable',
  error: 'error',
};

/** Which of the three failure shapes `dcr()` hit. */
export function classifyOperatorDcr(err) {
  const status = err?.response?.status;

  if (status === 404) return OPERATOR_DCR_STATES.unregistered;
  if (status === 502) return OPERATOR_DCR_STATES.unavailable;

  return OPERATOR_DCR_STATES.error;
}

export default new $operators();
