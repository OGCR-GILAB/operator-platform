import { Model, assign } from "./_model";

/** A membership row from `operators/{id}/members/`. */
class UserOperatorRelationship extends Model {
  static WRITABLE = ['username', 'email', 'relationship'];

  static READABLE = [
    'id',
    'user_id',
    'operator',
    'first_name',
    'last_name',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
  ];

  constructor(data = {}) {
    super();
    assign(this, data, UserOperatorRelationship.WRITABLE);
    assign(this, data, UserOperatorRelationship.READABLE);
  }

  get displayName() {
    const full = [this.first_name, this.last_name].filter(Boolean).join(' ');
    return full || this.username || this.email || `User ${this.user_id ?? ''}`.trim();
  }
}

export default UserOperatorRelationship;
