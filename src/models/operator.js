import { Model, assign } from "./_model";

class Operator extends Model {
  static WRITABLE = [
    'legal_name',
    'email',
    'country_code',
    'phone',
    'address_line_1',
    'address_line_2',
    'postcode',
    'ogcr_wallet_address',
    'relationship',
  ];

  static READABLE = [
    'id',
    'my_relationship',
    'dcr_id',
    'dcr_sync_status',
    'dcr_synced_at',
    'created_at',
    'updated_at',
  ];

  constructor(data = {}) {
    super();
    assign(this, data, Operator.WRITABLE);
    assign(this, data, Operator.READABLE);
  }

  /** POST /operators/ requires these three. */
  static REQUIRED = ['legal_name', 'email', 'country_code'];

  missingRequired() {
    return Operator.REQUIRED.filter((field) => !this[field]);
  }
}

export default Operator;
