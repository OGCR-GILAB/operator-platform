import { Model, assign } from "./_model";

/** `projects/{id}/plan/` — a single object, not a list. No field is required. */
class ActivityPlan extends Model {
  static WRITABLE = [
    'date_submitted',
    'activity_eligibility',
    'legal_parcel_ownership',
    'coordinate_reference_system',
    'iacs_codes',
    'lpis_codes',
    'article_8_1_information',
    'methodology_quantification_baseline',
    'methodology_additionality_funding_sources',
    'methodology_long_term_storage',
    'methodology_sustainability',
    'expected_total_carbon_removals',
    'expected_total_soil_emissions',
    'expected_total_ghg_emissions_associated',
    'expected_net_benefit',
    'group_advisory_services_description',
    'group_internal_control_system_description',
  ];

  static READABLE = ['id', 'project', 'created_at', 'updated_at'];

  constructor(data = {}) {
    super();
    assign(this, data, ActivityPlan.WRITABLE);
    assign(this, data, ActivityPlan.READABLE);

    if (this.iacs_codes == null) this.iacs_codes = [];
    if (this.lpis_codes == null) this.lpis_codes = [];
  }

  /** True once anything has been filled in — used for the readiness checklist. */
  get isStarted() {
    return ActivityPlan.WRITABLE.some((field) => {
      const value = this[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }
}

export default ActivityPlan;
