// Shared plumbing for the API models.
//
// Field names below are the API's, which are in turn the DCR property names, so
// every model maps 1:1 onto a request or response body. Each model exposes:
//   - `WRITABLE`  the fields the API accepts on POST / PUT / PATCH
//   - `toPayload()`  only those fields, so read-only values are never echoed back
//   - `toPatch(changed)`  the subset that actually changed

/** Copy `keys` from `source` onto `target`, leaving absent keys undefined. */
export function assign(target, source, keys) {
  keys.forEach((key) => { target[key] = source?.[key]; });
  return target;
}

/** Drop undefined values so a PATCH never clears a field by accident. */
export function compact(object) {
  return Object.entries(object).reduce((result, [key, value]) => {
    if (value !== undefined) result[key] = value;
    return result;
  }, {});
}

export class Model {
  /** The writable fields only, ready to POST or PUT. */
  toPayload() {
    return compact(assign({}, this, this.constructor.WRITABLE));
  }

  /** Only the named fields, for a PATCH. */
  toPatch(fields) {
    const keys = fields?.length ? fields : this.constructor.WRITABLE;
    return compact(assign({}, this, keys.filter((key) => this.constructor.WRITABLE.includes(key))));
  }

  static from(data) {
    return data ? new this(data) : null;
  }

  static fromList(data) {
    const rows = Array.isArray(data) ? data : (data?.results || []);
    return rows.map((row) => new this(row));
  }
}
