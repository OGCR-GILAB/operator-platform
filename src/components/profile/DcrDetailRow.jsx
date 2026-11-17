/**
 * One label/value pair. Shares the `.ogcr-project-detail__*` classes with
 * `ui/DetailList` — they are global selectors, not scoped to one view, and a
 * 7000-line stylesheet does not need a second copy of the same three rules.
 */
function DcrDetailRow({ label, children }) {
  return (
    <div>
      <span className="ogcr-project-detail__label">{label}</span>
      <span className="ogcr-project-detail__value">{children ?? "—"}</span>
    </div>
  );
}

export default DcrDetailRow;
