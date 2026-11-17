import { useMemo } from "react";
import { ProgressBar, Skeleton } from "@majistudio/ogcr-design-system";
import { DataTable as DsDataTable } from "@majistudio/ogcr-design-system/Table";
import useDeferredFlag from "./useDeferredFlag";

/*
  Placeholder cells are not all the same length — a column of identical bars
  reads as a loading graphic rather than as rows of text.
*/
const SKELETON_CELL_WIDTHS = ["72%", "44%", "88%", "36%", "60%", "52%"];

/**
 * The DS DataTable with the two loading states it does not have.
 *
 * With no rows yet it shows placeholder rows in the real columns, so the
 * header, the borders and the height are already right when the data lands.
 * With rows on screen it keeps them and shows a thin bar on top: a refetch is
 * not a reason to throw away what the user is reading.
 */
function DataTable(props) {
  const {
    data = [],
    columns = [],
    caption,
    ariaLabel = "Data table",
    emptyText = "No records",
    className = "",
    loading = false,
    skeletonRows = 5,
  } = props;

  const showSkeleton = loading && !data.length;
  const isRefetching = useDeferredFlag(loading && data.length > 0);

  const skeleton = useMemo(() => ({
    columns: columns.map((column, columnIndex) => ({
      id: column.id ?? column.accessorKey ?? String(columnIndex),
      header: column.header,
      meta: column.meta,
      enableSorting: false,
      cell: ({ row }) => (
        <Skeleton
          variant="text"
          width={SKELETON_CELL_WIDTHS[(row.index + columnIndex) % SKELETON_CELL_WIDTHS.length]}
        />
      ),
    })),
    data: Array.from({ length: skeletonRows }, () => ({})),
  }), [columns, skeletonRows]);

  return (
    <div
      className={`ogcr-data-table ${className}`.trim()}
      aria-busy={loading || undefined}
      data-refetching={isRefetching || undefined}
    >
      {isRefetching && <ProgressBar value={null} showValue={false} aria-label="Refreshing" />}
      <DsDataTable
        columns={showSkeleton ? skeleton.columns : columns}
        data={showSkeleton ? skeleton.data : data}
        caption={caption}
        regionLabel={ariaLabel}
        emptyState={emptyText}
      />
    </div>
  );
}

export default DataTable;
