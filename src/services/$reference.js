import api, { toList } from "./$api";

// `reference/` and `reference/countries/` are public and change rarely, so the
// answers are memoised for the lifetime of the page.
let referenceCache = null;
let countriesCache = null;

class $reference {
  /**
   * Vocabularies for every select: activity_types, unit_types, project_statuses,
   * verification_statuses, document_kinds, practice_examples, cobenefit_examples,
   * document_max_size_mb, document_allowed_extensions. Returns a single object.
   */
  async all({ refresh = false } = {}) {
    if (referenceCache && !refresh) return referenceCache;

    const { data } = await api.get('/reference/');
    referenceCache = data;

    return referenceCache;
  }

  /** Bare array of all 249 ISO 3166-1 entries: `[{ code, name }]`. */
  async countries({ refresh = false } = {}) {
    if (countriesCache && !refresh) return countriesCache;

    const { data } = await api.get('/reference/countries/');
    countriesCache = toList(data);

    return countriesCache;
  }

  async health() {
    const { data } = await api.get('/health/');
    return data;
  }

  /**
   * `unit_types` implies `type`, never the reverse: two unit types map to
   * CARBON_FARMING. Falls back to the documented mapping when reference data
   * has not loaded yet.
   */
  activityTypeForUnitType(unitType, reference = referenceCache) {
    const match = toList(reference?.unit_types).find((item) => item.value === unitType);
    if (match?.activity_type) return match.activity_type;

    return UNIT_TYPE_TO_ACTIVITY_TYPE[unitType] || null;
  }
}

export const UNIT_TYPE_TO_ACTIVITY_TYPE = {
  'Permanent Removal': 'PERMANENT_REMOVAL',
  'Carbon Farming Sequestration': 'CARBON_FARMING',
  'Soil Emission Reduction': 'CARBON_FARMING',
  'Carbon Storage in Product': 'CARBON_STORAGE_IN_PRODUCTS',
};

export const ACTIVITY_TYPES = [
  'CARBON_FARMING',
  'PERMANENT_REMOVAL',
  'CARBON_STORAGE_IN_PRODUCTS',
];

export const PROJECT_STATUSES = ['draft', 'ready', 'submitted', 'accepted', 'rejected'];

export const DCR_SYNC_STATUSES = ['local', 'synced', 'failed'];

export const FORWARD_STATUSES = ['local', 'forwarded', 'failed'];

export const VERIFICATION_STATUSES = ['in_progress', 'verified', 'failed'];

export default new $reference();
