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
    'has_owner',
    // `true` / `false`, `null` while nothing is declared.
    'owner_is_complete',
    // The declared owner against the land registry, as `registry-owners` ->
    // `matches_declared`: `true` / `false`, `null` when there is nothing to compare.
    'registry_match',
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
  // We no longer write DCR's `parcel_activity`: after a submit the certification
  // platform registers the parcels on DCR itself and the next status refresh
  // matches them by cadastral reference. Each parcel's verification comes back
  // through `projects/{id}/dcr-status/`.
  static WRITABLE = ['parcel'];

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

  // What the operator can set. A verdict mirrored from DCR may also be
  // `pending` or `under_review` (`VERIFICATION_STATUSES` in services/$reference).
  static STATUS_CODES = ['in_progress', 'verified', 'failed'];

  constructor(data = {}) {
    super();
    assign(this, data, OwnerVerification.WRITABLE);
    assign(this, data, OwnerVerification.READABLE);
  }
}

/**
 * `parcels/{id}/owner/` — DCR's `parcel_owner`: who owns the parcel, as the
 * operator declares it, with the deed or cadastre extract behind it. `404`
 * while none is declared. Editable until the parcel's verification is final
 * (`409` after that), so also after submit and once the parcel is registered.
 */
export class ParcelOwner extends Model {
  static WRITABLE = ['legal_name', 'owner_type', 'country_code', 'document'];

  static READABLE = [
    'id',
    'document_title',
    'is_complete',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
    'supporting_document_dcr_id',
    'created_at',
    'updated_at',
  ];

  static REQUIRED = ['legal_name', 'owner_type', 'country_code'];

  static OWNER_TYPES = ['natural_person', 'legal_person', 'public_entity'];

  // The document kinds that can back a declaration.
  static PROOF_KINDS = ['ownership_proof', 'cadastral_extract'];

  constructor(data = {}) {
    super();
    assign(this, data, ParcelOwner.WRITABLE);
    assign(this, data, ParcelOwner.READABLE);
  }

  /** `compact` would drop a cleared document; `null` is how it is cleared. */
  toPayload() {
    return { ...super.toPayload(), document: this.document ?? null };
  }
}

export default Parcel;
