// The DCR account block that rides along inside `GET auth/me/`.
//
// Deliberately plain functions rather than a `Model` subclass: `Model` exists to
// build request bodies (`WRITABLE` / `toPayload` / `toPatch`), and nothing here
// is ever written back. `document.js` sets the same precedent with
// `syncStateOf` / `syncedAtOf`.
//
// Every export is null-safe — `me.dcr` is `null` for accounts that are local to
// this platform (admin), and absent entirely until `auth/me/` has answered.

export const DCR_CAPABILITIES = ['submit', 'status', 'reference'];

export const CAPABILITY_LABELS = {
  submit: 'Submit activities to DCR',
  status: 'Read DCR outcomes',
  reference: 'Read DCR reference data',
};

/** The raw block, or null for a local-only account. */
export function dcrBlock(me) {
  return me?.dcr || null;
}

/**
 * Three states, because "we do not know yet" must never be rendered as "not
 * allowed". `meStatus` comes from GlobalProvider and is only `fresh` once
 * `auth/me/` has answered in this tab.
 */
export function dcrAccountState(me, meStatus) {
  if (meStatus !== 'fresh') return 'unknown';
  return dcrBlock(me) ? 'linked' : 'local_only';
}

/**
 * `{ allowed, missing_roles }` for one capability. `allowed` is `null` — not
 * `false` — whenever the answer is unknown, so callers can tell a refusal apart
 * from a missing read.
 */
export function capabilityOf(me, name) {
  const capability = dcrBlock(me)?.capabilities?.[name];

  if (!capability) return { allowed: null, missing_roles: [] };

  return {
    allowed: typeof capability.allowed === 'boolean' ? capability.allowed : null,
    missing_roles: Array.isArray(capability.missing_roles) ? capability.missing_roles : [],
  };
}

/** All three at once, for the context value. */
export function capabilitiesOf(me) {
  return DCR_CAPABILITIES.reduce((all, name) => {
    all[name] = capabilityOf(me, name);
    return all;
  }, {});
}

export function missingRolesLabel(capability) {
  return (capability?.missing_roles || []).join(', ');
}

/** The system-level roles — the ones that count for OGCR entities. */
export function dcrRoles(me) {
  const roles = dcrBlock(me)?.roles;
  return Array.isArray(roles) ? roles : [];
}

/**
 * Grants per bank, which DCR ignores for these entities. The guide does not pin
 * the shape down, so accept either an object map or a list and always hand back
 * `[label, roles[]]` pairs.
 */
export function bankScopedRolesEntries(me) {
  const scoped = dcrBlock(me)?.bank_scoped_roles;

  if (!scoped) return [];

  if (Array.isArray(scoped)) {
    return scoped.map((entry, index) => {
      if (typeof entry === 'string') return [entry, []];
      const label = entry?.bank_id || entry?.bank || `Bank ${index + 1}`;
      const roles = Array.isArray(entry?.roles) ? entry.roles : [];
      return [label, roles];
    });
  }

  if (typeof scoped === 'object') {
    return Object.entries(scoped).map(([bank, roles]) => [
      bank,
      Array.isArray(roles) ? roles : [roles].filter(Boolean),
    ]);
  }

  return [];
}
