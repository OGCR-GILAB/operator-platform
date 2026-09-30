/**
 * The one-line introduction every activity tab opens with: what this tab is for
 * on the left, its actions on the right.
 *
 * The tabs used to each do this differently — two borrowed the page-title
 * pattern with an empty slot where the heading would go, two had nothing. The
 * activity's name already sits in the workspace header above, so a tab needs a
 * sentence and its buttons, not a second title.
 */
function ActivityTabHeader({ description, actions }) {
  if (!description && !actions) return null;

  return (
    <div className="ogcr-activity-tab__header">
      {description ? (
        <p className="ogcr-activity-tab__description">{description}</p>
      ) : <span />}
      {actions ? <div className="ogcr-activity-tab__actions">{actions}</div> : null}
    </div>
  );
}

export default ActivityTabHeader;
