import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Skeleton from "./Skeleton";
import useDeferredFlag from "./useDeferredFlag";

/*
  Placeholder cells are not all the same length — a column of identical bars
  reads as a loading graphic rather than as rows of text.
*/
const SKELETON_CELL_WIDTHS = ["72%", "44%", "88%", "36%", "60%", "52%"];

function DataTable(props) {
  const {
    data = [],
    columns = [],
    caption,
    ariaLabel = "Data table",
    emptyText = "No records",
    className = "",
    onRowClick,
    loading = false,
    skeletonRows = 5,
  } = props;

  /*
    Two loading states, and the difference is the whole point. With no rows yet
    the table shows placeholder rows in its real columns, so the header, the
    borders and the height are all already correct when the data lands. With
    rows on screen it keeps them — a refetch is not a reason to throw away what
    the user is reading and drop the page to a spinner.
  */
  const showSkeleton = loading && !data.length;
  const isRefetching = useDeferredFlag(loading && data.length > 0);

  const [sorting, setSorting] = useState([]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  const sortIconByState = useMemo(
    () => ({
      false: "↕",
      asc: "↑",
      desc: "↓",
    }),
    [],
  );

  return (
    <div className={`ogcr-table ${className}`.trim()} data-busy={isRefetching ? "true" : undefined}>
      {isRefetching ? <div className="ogcr-table__progress" aria-hidden="true" /> : null}

      <div
        className="ogcr-table__scroll"
        role="region"
        aria-label={ariaLabel}
        aria-busy={loading ? "true" : undefined}
      >
        <table className="ogcr-table__table">
          {caption ? <caption className="ogcr-table__caption">{caption}</caption> : null}

          <thead className="ogcr-table__thead">
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta || {};
                  const align = meta.align || "left";
                  const isSortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const sortStateClass =
                    sorted === "asc"
                      ? "ogcr-table__sort--asc"
                      : sorted === "desc"
                        ? "ogcr-table__sort--desc"
                        : "ogcr-table__sort--none";

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="ogcr-table__th"
                      data-align={align}
                      aria-sort={
                        !isSortable
                          ? undefined
                          : sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                      }
                    >
                      {header.isPlaceholder ? null : isSortable ? (
                        <button
                          type="button"
                          className={`ogcr-table__sort ${sortStateClass}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="ogcr-table__sort-label">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          <span className="ogcr-table__sort-icon" aria-hidden="true">
                            {sortIconByState[sorted || false]}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="ogcr-table__tbody">
            {showSkeleton ? (
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="ogcr-table__tr ogcr-table__tr--skeleton">
                  {visibleColumns.map((column, columnIndex) => {
                    const meta = column.columnDef.meta || {};

                    return (
                      <td
                        key={column.id}
                        className="ogcr-table__td"
                        data-align={meta.align || "left"}
                      >
                        <Skeleton
                          height="1.5em"
                          width={SKELETON_CELL_WIDTHS[(rowIndex + columnIndex) % SKELETON_CELL_WIDTHS.length]}
                          delay={rowIndex * 80}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`ogcr-table__tr ${onRowClick ? "ogcr-table__tr--clickable" : ""}`.trim()}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onClick={onRowClick
                    // A row action is its own target — don't open the row as well.
                    ? (event) => {
                      if (event.target.closest("button, a, input, select")) return;
                      onRowClick(row.original);
                    }
                    : undefined}
                  onKeyDown={onRowClick
                    ? (event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                    : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta || {};
                    const align = meta.align || "left";
                    const numeric = Boolean(meta.numeric);

                    return (
                      <td
                        key={cell.id}
                        className="ogcr-table__td"
                        data-align={align}
                        data-numeric={numeric ? "true" : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="ogcr-table__empty" colSpan={visibleColumns.length || 1}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
