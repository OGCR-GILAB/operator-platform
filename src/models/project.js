import { Model, assign } from "./_model";
import { UNIT_TYPE_TO_ACTIVITY_TYPE } from "../services/$reference";

/** A project is a DCR "activity". */
class Project extends Model {
  static WRITABLE = [
    'name',
    'operator',
    'start_date',
    'end_date',
    'type',
    'unit_types',
    'summary',
    'description',
    'website',
    'image',
    'hero_image',
    'media_links',
    'technologies_practices_processes',
    'cobenefits',
    'city',
    'country_code',
    'geometry',
    'term_commitment',
    'methodologies',
    'monitoring_period_years',
    'monitoring_period_start_date',
    'monitoring_period_end_date',
    'certification_scheme_id',
    'certification_scheme_name',
  ];

  static READABLE = [
    'id',
    'status',
    'is_editable',
    'has_plan',
    'has_monitoring_plan',
    'parcel_count',
    'document_count',
    'operator_name',
    'owner_username',
    'submitted_at',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
    'created_at',
    'updated_at',
  ];

  // The schema only requires `name`, but readiness blocks submission without these.
  static REQUIRED_FOR_SUBMISSION = ['name', 'operator', 'start_date', 'end_date'];

  constructor(data = {}) {
    super();
    assign(this, data, Project.WRITABLE);
    assign(this, data, Project.READABLE);

    // List fields come back as arrays; keep them arrays even when absent.
    ['media_links', 'technologies_practices_processes', 'cobenefits'].forEach((key) => {
      if (this[key] == null) this[key] = [];
    });
  }

  /**
   * `unit_types` implies `type`, never the reverse — two unit types map to
   * CARBON_FARMING, so the derivation only runs in this direction.
   */
  deriveType() {
    if (this.type) return this.type;
    return UNIT_TYPE_TO_ACTIVITY_TYPE[this.unit_types] || null;
  }

  missingForSubmission() {
    const missing = Project.REQUIRED_FOR_SUBMISSION.filter((field) => !this[field]);
    if (!this.deriveType()) missing.push('type');
    return missing;
  }

  get isEditable() {
    // `is_editable` is authoritative; fall back to the status for local drafts.
    if (this.is_editable != null) return this.is_editable;
    return this.status === 'draft' || this.status === 'ready';
  }

  get isSubmitted() {
    return ['submitted', 'accepted', 'rejected'].includes(this.status);
  }
}

export default Project;
