/**
 * Label/value pairs as a definition list. The labels and values keep the
 * `.ogcr-project-detail__*` look the rest of the app already uses.
 *
 * `columns`: 1, 2 or 3 — collapses to one on a phone. An item with
 * `span="full"` takes the whole row, for a value too long to share it.
 */
function DetailList({ columns = 2, className = "", children }) {
  return (
    <dl className={`ogcr-detail-list ogcr-detail-list--${columns} ${className}`.trim()}>
      {children}
    </dl>
  );
}

const isEmpty = (value) => value == null || value === "" || value === false;

function DetailItem({ label, span, children }) {
  return (
    <div className={span === "full" ? "ogcr-detail-list__item--full" : undefined}>
      <dt className="ogcr-project-detail__label">{label}</dt>
      <dd className="ogcr-project-detail__value">{isEmpty(children) ? "—" : children}</dd>
    </div>
  );
}

DetailList.Item = DetailItem;

/**
 * A titled block of related facts inside a card — the read-only twin of the
 * plans form's FieldGroup. Groups are divided by a rule, not boxed, so a card
 * never holds cards.
 */
export function DetailGroup({ title, count, hint, action, children }) {
  return (
    <section className="ogcr-detail-group">
      <header className="ogcr-detail-group__header">
        <h4 className="ogcr-detail-group__title">
          {title}
          {count != null ? <span className="ogcr-activity-tab__count">{count}</span> : null}
        </h4>
        {action}
      </header>
      {hint ? <p className="ogcr-detail-group__hint">{hint}</p> : null}
      {children}
    </section>
  );
}

export default DetailList;
