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

/**
 * The same capability from `GET auth/dcr/permissions/`, which also names the
 * roles DCR could not confirm either way (`unknown_roles`). Null-safe like the
 * rest: no permissions read yet means `allowed: null`.
 */
export function liveCapabilityOf(permissions, name) {
  const capability = permissions?.capabilities?.[name];

  if (!capability) return { allowed: null, missing_roles: [], unknown_roles: [] };

  return {
    allowed: typeof capability.allowed === 'boolean' ? capability.allowed : null,
    missing_roles: Array.isArray(capability.missing_roles) ? capability.missing_roles : [],
    unknown_roles: Array.isArray(capability.unknown_roles) ? capability.unknown_roles : [],
  };
}

/** True only when DCR itself answered role by role, not the login-time fallback. */
export const isLivePermissions = (permissions) => permissions?.source === 'live';

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

/** The roles that count for OGCR entities: system-level plus those granted at `bank_id`. */
export function dcrRoles(me) {
  const roles = dcrBlock(me)?.roles;
  return Array.isArray(roles) ? roles : [];
}

/**
 * Grants per bank. Those at `bank_id` already appear in `roles`; callers filter
 * them out and flag only the rest. The guide does not pin the shape down, so
 * accept either an object map or a list and always hand back
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

/**
 * `{ tone, label }` for a capability's `allowed`. `null` is "Unknown", never
 * "Not allowed" — see `dcrAccountState`.
 */
export function capabilityStatus(allowed) {
  if (allowed === true) return { tone: 'positive', label: 'Allowed' };
  if (allowed === false) return { tone: 'warning', label: 'Not allowed' };
  return { tone: 'neutral', label: 'Unknown' };
}

const ROLE_PATTERN = /^Can([A-Z][a-z]+)([A-Z].*)$/;
const ROLE_SCOPES = [
  ['AtAnyBank', 'any bank'],
  ['AtOneBank', 'one bank'],
  ['AtBank', 'one bank'],
];
const VERB_ORDER = ['Create', 'Get', 'Update', 'Delete'];
const OTHER_GROUP = 'Other';

const splitCamelCase = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

// `Operators` and `Operator` are the same entity; `Status` / `Address` are not plurals.
const singular = (entity) => {
  if (entity.length <= 3) return entity;
  if (/ies$/.test(entity)) return `${entity.slice(0, -3)}y`;
  if (/(ss|us|x|z|ch|sh)es$/.test(entity)) return entity.slice(0, -2);
  if (/s$/.test(entity) && !/(ss|us)$/.test(entity)) return entity.slice(0, -1);
  return entity;
};

/**
 * OBP-style roles read `Can<Verb><Entity>[AtAnyBank]`, e.g.
 * `CanGetOperatorsAtAnyBank` -> verb `Get`, entity `Operator`, scope `any bank`.
 * Anything else is kept whole, with `verb: null`.
 */
export function parseDcrRole(role) {
  const match = ROLE_PATTERN.exec(String(role));

  if (!match) {
    return { role, verb: null, entity: OTHER_GROUP, entityLabel: OTHER_GROUP, scope: null };
  }

  let [, verb, entity] = match;
  let scope = null;

  for (const [suffix, label] of ROLE_SCOPES) {
    if (entity.endsWith(suffix) && entity.length > suffix.length) {
      entity = entity.slice(0, -suffix.length);
      scope = label;
      break;
    }
  }

  entity = singular(entity);
  return { role, verb, entity, entityLabel: splitCamelCase(entity), scope };
}

const verbRank = (verb) => {
  const index = VERB_ORDER.indexOf(verb);
  return index === -1 ? VERB_ORDER.length : index;
};

/**
 * Roles grouped by the entity they act on, so a long role list reads as a
 * short table: `[{ key, label, roles: parsed[] }]`, groups by label with
 * `Other` last, and Create / Get / Update / Delete first within a group.
 */
export function groupDcrRoles(roles) {
  const groups = new Map();

  for (const role of Array.isArray(roles) ? roles : []) {
    const parsed = parseDcrRole(role);
    if (!groups.has(parsed.entity)) {
      groups.set(parsed.entity, { key: parsed.entity, label: parsed.entityLabel, roles: [] });
    }
    groups.get(parsed.entity).roles.push(parsed);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      roles: group.roles.sort((a, b) => (
        verbRank(a.verb) - verbRank(b.verb)
        || String(a.verb || a.role).localeCompare(String(b.verb || b.role))
        || String(a.scope || '').localeCompare(String(b.scope || ''))
      )),
    }))
    .sort((a, b) => {
      if (a.key === OTHER_GROUP) return 1;
      if (b.key === OTHER_GROUP) return -1;
      return a.label.localeCompare(b.label);
    });
}
