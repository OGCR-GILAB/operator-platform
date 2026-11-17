import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button, Input, Pill } from "@majistudio/ogcr-design-system";
import { groupDcrRoles } from "../../models/dcr";

const SEARCH_FROM = 8;
const INITIAL_GROUPS = 6;

/**
 * A role list as one row per entity, with the verbs as pills — `CanCreateOperator`,
 * `CanGetOperators` and `CanDeleteOperator` read as "Operator: Create Get Delete".
 * The full role name stays on each pill's tooltip, since that is what DCR admins
 * grant and what `missing_roles` names.
 */
function DcrRoleGroups({ roles, emptyText = "No roles granted.", initialGroups = INITIAL_GROUPS }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => groupDcrRoles(roles), [roles]);

  if (!roles?.length) {
    return <span className="ogcr-project-detail__value">{emptyText}</span>;
  }

  const query = search.trim().toLowerCase();
  const visibleGroups = query
    ? groups
      .map((group) => (group.label.toLowerCase().includes(query)
        ? group
        : { ...group, roles: group.roles.filter(({ role }) => role.toLowerCase().includes(query)) }))
      .filter((group) => group.roles.length > 0)
    : groups;
  const matchCount = visibleGroups.reduce((count, group) => count + group.roles.length, 0);
  // A search shows every match; otherwise a long list folds after a few groups.
  const collapsible = !query && visibleGroups.length > initialGroups + 1;
  const shownGroups = collapsible && !expanded ? visibleGroups.slice(0, initialGroups) : visibleGroups;

  return (
    <div className="ogcr-dcr-roles">
      {roles.length >= SEARCH_FROM && (
        <div className="ogcr-dcr-roles__toolbar">
          <Input
            className="ogcr-projects__search"
            type="search"
            value={search}
            placeholder="Filter roles…"
            aria-label="Filter roles"
            iconLeft={<MagnifyingGlassIcon size={16} />}
            onChange={(event) => setSearch(event.target.value)}
          />
          {query && (
            <span className="ogcr-dcr-roles__count">
              {matchCount} of {roles.length} roles
            </span>
          )}
        </div>
      )}

      {shownGroups.length > 0 ? (
        <ul className="ogcr-dcr-roles__list">
          {shownGroups.map((group) => (
            <li key={group.key} className="ogcr-dcr-roles__group">
              <span className="ogcr-dcr-roles__entity">{group.label}</span>
              <span className="ogcr-dcr-roles__verbs">
                {group.roles.map(({ role, verb, scope }) => (
                  <span key={role} title={role} className="ogcr-dcr-roles__verb">
                    <Pill tone="neutral">
                      {verb || role}
                      {scope && <span className="ogcr-dcr-roles__scope"> · {scope}</span>}
                    </Pill>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="ogcr-project-detail__value">No roles match “{search.trim()}”.</span>
      )}

      {collapsible && (
        <Button variant="text" size="s" className="ogcr-dcr-roles__more" onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Show fewer" : `Show all ${visibleGroups.length} groups`}
        </Button>
      )}
    </div>
  );
}

export default DcrRoleGroups;
