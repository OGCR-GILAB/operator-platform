import { Model, assign } from "./_model";

/**
 * Documents do NOT carry `dcr_id` / `dcr_sync_status` / `dcr_synced_at` — they
 * track their own trip to DCR with `forward_status` / `forwarded_at` /
 * `forward_reference`. Any shared sync badge has to handle both shapes.
 */
class OGCRDocument extends Model {
  // Upload is multipart; `file` is handled separately by the service.
  static WRITABLE = ['kind', 'title', 'description', 'project', 'parcel'];

  static READABLE = [
    'id',
    'operator',
    'version',
    'supersedes',
    'is_current',
    'is_frozen',
    'original_name',
    'content_type',
    'size',
    'sha256',
    'uploaded_by_username',
    'uploaded_at',
    'download_url',
    'forward_status',
    'forwarded_at',
    'forward_reference',
  ];

  static KINDS = [
    'ownership_proof',
    'land_use_agreement',
    'cadastral_extract',
    'methodology',
    'monitoring_report',
    'photo',
    'map',
    'other',
  ];

  constructor(data = {}) {
    super();
    assign(this, data, OGCRDocument.WRITABLE);
    assign(this, data, OGCRDocument.READABLE);
  }

  /** Normalised sync state, so one badge can render documents and mirrors alike. */
  get syncState() {
    if (this.forward_status === 'forwarded') return 'synced';
    if (this.forward_status === 'failed') return 'failed';
    return 'local';
  }

  get syncedAt() {
    return this.forwarded_at || null;
  }

  get sizeLabel() {
    const bytes = Number(this.size);
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * The one sync accessor that works for every record: mirrors expose
 * `dcr_sync_status`, documents expose `forward_status`.
 *
 * This is the *only* signal for whether something exists on DCR. `dcr_id` is
 * assigned by the API before the first submit is even attempted, so a record
 * can carry one while nothing has ever reached DCR — never infer registration
 * from its presence.
 */
export function syncStateOf(record) {
  if (!record) return 'local';
  if (record.forward_status) {
    return record.forward_status === 'forwarded' ? 'synced' : record.forward_status;
  }
  return record.dcr_sync_status || 'local';
}

export function syncedAtOf(record) {
  return record?.forwarded_at || record?.dcr_synced_at || null;
}

export default OGCRDocument;
