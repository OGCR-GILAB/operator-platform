import { Model, assign } from "./_model";

class Parcel extends Model {
  static WRITABLE = [
    'operator',
    'geometry',
    'name',
    'cadastral_reference',
    'iacs_codes',
    'lpis_codes',
  ];

  static READABLE = [
    'id',
    'area_ha',
    'has_owner_verification',
    'project_count',
    'document_count',
    'operator_name',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
    'created_at',
    'updated_at',
  ];

  static REQUIRED = ['operator', 'geometry'];

  constructor(data = {}) {
    super();
    assign(this, data, Parcel.WRITABLE);
    assign(this, data, Parcel.READABLE);

    if (this.iacs_codes == null) this.iacs_codes = [];
    if (this.lpis_codes == null) this.lpis_codes = [];
  }

  missingRequired() {
    return Parcel.REQUIRED.filter((field) => !this[field]);
  }

  /** The API stores and returns MultiPolygon in EPSG:4326. */
  toFeature() {
    if (!this.geometry) return null;

    return {
      type: 'Feature',
      id: this.id,
      geometry: this.geometry,
      properties: {
        id: this.id,
        name: this.name,
        cadastral_reference: this.cadastral_reference,
        operator: this.operator,
        area_ha: this.area_ha,
        dcr_sync_status: this.dcr_sync_status,
      },
    };
  }
}

/** The join row from `projects/{id}/parcels/`. */
export class ProjectParcel extends Model {
  // On DCR the link is a bare `parcel_activity` — no status, no amount. Each
  // parcel's verification comes back through `projects/{id}/dcr-status/`.
  static WRITABLE = ['parcel', 'amount', 'status_message'];

  static READABLE = [
    'id',
    'project',
    'parcel_detail',
    'parcel_dcr_id',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
  ];

  constructor(data = {}) {
    super();
    assign(this, data, ProjectParcel.WRITABLE);
    assign(this, data, ProjectParcel.READABLE);
  }
}

/**
 * `parcels/{id}/owner-verification/` — a single object; no field is required.
 * Local preparation data: submit does not push it (the certifier writes it on
 * DCR), and `dcr-status` overwrites it once DCR has a verdict.
 */
export class OwnerVerification extends Model {
  static WRITABLE = [
    'status_code',
    'authority',
    'parcel_owner_legal_name',
    'status_message',
  ];

  static READABLE = [
    'id',
    'parcel',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
    'created_at',
    'updated_at',
  ];

  static STATUS_CODES = ['in_progress', 'verified', 'failed'];

  constructor(data = {}) {
    super();
    assign(this, data, OwnerVerification.WRITABLE);
    assign(this, data, OwnerVerification.READABLE);
  }
}

export default Parcel;
