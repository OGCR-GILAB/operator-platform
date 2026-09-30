import { useEffect, useId, useMemo, useRef, useState } from "react";
import moment from "moment";
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_OPTIONS = moment.months();

function toMoment(value) {
  if (!value) return null;

  if (moment.isMoment(value)) {
    return value.clone().startOf("day");
  }

  if (value instanceof Date) {
    return moment(value).startOf("day");
  }

  if (typeof value === "string") {
    const parsed = moment(value, ["YYYY-MM-DD", moment.ISO_8601], true);
    return parsed.isValid() ? parsed.startOf("day") : null;
  }

  return null;
}

function getRangeValue(value) {
  if (!value || typeof value !== "object") {
    return { start: null, end: null };
  }

  return {
    start: toMoment(value.start),
    end: toMoment(value.end),
  };
}

function isSameDay(first, second) {
  if (!first || !second) return false;
  return first.isSame(second, "day");
}

function DatePicker(props) {
  const {
    mode = "single",
    label,
    helperText,
    required = false,
    error = false,
    disabled = false,
    id,
    className = "",
    style = {},
    placeholder,
    value,
    defaultValue,
    onChange = () => {},
  } = props;

  const isRange = mode === "range";
  const generatedId = useId();
  const controlId = id || `ogcr-datepicker-${generatedId}`;
  const helperId = `${controlId}-help`;
  const hasHelper = Boolean(helperText);

  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);

  const [internalSingleValue, setInternalSingleValue] = useState(toMoment(defaultValue));
  const [internalRangeValue, setInternalRangeValue] = useState(getRangeValue(defaultValue));

  const selectedSingle = useMemo(
    () => (value !== undefined ? toMoment(value) : internalSingleValue),
    [value, internalSingleValue],
  );
  const selectedRange = useMemo(
    () => (value !== undefined ? getRangeValue(value) : internalRangeValue),
    [value, internalRangeValue],
  );
  const selectedStart = selectedRange.start;
  const selectedEnd = selectedRange.end;

  const getAnchorMonth = () => {
    if (isRange && selectedStart) return selectedStart.clone().startOf("month");
    if (!isRange && selectedSingle) return selectedSingle.clone().startOf("month");
    return moment().startOf("month");
  };

  const [viewMonth, setViewMonth] = useState(() => getAnchorMonth());

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const displayValue = useMemo(() => {
    if (isRange) {
      if (!selectedStart && !selectedEnd) {
        return placeholder || "Select date range";
      }

      if (selectedStart && !selectedEnd) {
        return `${selectedStart.format("DD MMM YYYY")} →`;
      }

      if (selectedStart && selectedEnd) {
        return `${selectedStart.format("DD MMM YYYY")} — ${selectedEnd.format("DD MMM YYYY")}`;
      }

      return placeholder || "Select date range";
    }

    return selectedSingle ? selectedSingle.format("DD MMM YYYY") : (placeholder || "Select date");
  }, [isRange, selectedSingle, selectedStart, selectedEnd, placeholder]);

  const calendarDays = useMemo(() => {
    const startOfMonth = viewMonth.clone().startOf("month");
    const firstGridDay = startOfMonth.clone().startOf("isoWeek");

    return Array.from({ length: 42 }, (_, index) => firstGridDay.clone().add(index, "day"));
  }, [viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = moment().year();
    const anchorYear = viewMonth.year();
    const start = Math.min(currentYear - 60, anchorYear - 40);
    const end = Math.max(currentYear + 20, anchorYear + 40);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [viewMonth]);

  const commitSingle = (nextDate) => {
    if (value === undefined) {
      setInternalSingleValue(nextDate);
    }

    onChange(nextDate ? nextDate.format("YYYY-MM-DD") : "");
  };

  const commitRange = (nextRange) => {
    if (value === undefined) {
      setInternalRangeValue(nextRange);
    }

    onChange({
      start: nextRange.start ? nextRange.start.format("YYYY-MM-DD") : "",
      end: nextRange.end ? nextRange.end.format("YYYY-MM-DD") : "",
    });
  };

  const handleDaySelect = (day) => {
    if (disabled) return;

    if (!isRange) {
      commitSingle(day.clone().startOf("day"));
      setOpen(false);
      return;
    }

    if (!selectedStart || (selectedStart && selectedEnd)) {
      commitRange({ start: day.clone().startOf("day"), end: null });
      return;
    }

    if (day.isBefore(selectedStart, "day")) {
      commitRange({ start: day.clone().startOf("day"), end: selectedStart.clone().startOf("day") });
      return;
    }

    commitRange({ start: selectedStart.clone().startOf("day"), end: day.clone().startOf("day") });
  };

  const clearValue = () => {
    if (disabled) return;

    if (isRange) {
      commitRange({ start: null, end: null });
    } else {
      commitSingle(null);
    }
  };

  const wrapperClassName = [
    "ogcr-datepicker",
    error ? "ogcr-datepicker--error" : "",
    disabled ? "ogcr-datepicker--disabled" : "",
    className,
  ]
    .join(" ")
    .trim();

  const handleTogglePanel = () => {
    if (disabled) return;

    setOpen((prev) => {
      if (!prev) {
        setViewMonth(getAnchorMonth());
      }

      return !prev;
    });
  };

  return (
    <div className={wrapperClassName} style={style} ref={wrapperRef}>
      {label ? (
        <label className="ogcr-datepicker__label" htmlFor={controlId}>
          {label}
          {required ? <span className="text-negative" aria-hidden="true"> *</span> : null}
        </label>
      ) : null}

      <button
        id={controlId}
        type="button"
        className="ogcr-datepicker__field"
        onClick={handleTogglePanel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={hasHelper ? helperId : undefined}
        disabled={disabled}
      >
        <span className="ogcr-datepicker__icon" aria-hidden="true">
          <CalendarBlankIcon />
        </span>
        <span className={`ogcr-datepicker__value${(isRange ? !selectedStart && !selectedEnd : !selectedSingle) ? " ogcr-datepicker__value--placeholder" : ""}`}>
          {displayValue}
        </span>
      </button>

      {open ? (
        <div className="ogcr-datepicker__panel" role="dialog" aria-label={isRange ? "Date range picker" : "Date picker"}>
          <div className="ogcr-datepicker__panel-header">
            <button
              type="button"
              className="ogcr-datepicker__nav-btn"
              onClick={() => setViewMonth((prev) => prev.clone().subtract(1, "month"))}
              aria-label="Previous month"
            >
              <CaretLeftIcon />
            </button>

            <div className="ogcr-datepicker__month-year" aria-label="Select month and year">
              <label className="ogcr-datepicker__sr-only" htmlFor={`${controlId}-month`}>
                Month
              </label>
              <select
                id={`${controlId}-month`}
                className="ogcr-datepicker__month-select"
                value={viewMonth.month()}
                onChange={(event) => {
                  const nextMonth = Number(event.target.value);
                  setViewMonth((prev) => prev.clone().month(nextMonth));
                }}
              >
                {MONTH_OPTIONS.map((monthLabel, index) => (
                  <option key={monthLabel} value={index}>
                    {monthLabel}
                  </option>
                ))}
              </select>

              <label className="ogcr-datepicker__sr-only" htmlFor={`${controlId}-year`}>
                Year
              </label>
              <select
                id={`${controlId}-year`}
                className="ogcr-datepicker__year-select"
                value={viewMonth.year()}
                onChange={(event) => {
                  const nextYear = Number(event.target.value);
                  setViewMonth((prev) => prev.clone().year(nextYear));
                }}
              >
                {yearOptions.map((yearValue) => (
                  <option key={yearValue} value={yearValue}>
                    {yearValue}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="ogcr-datepicker__nav-btn"
              onClick={() => setViewMonth((prev) => prev.clone().add(1, "month"))}
              aria-label="Next month"
            >
              <CaretRightIcon />
            </button>
          </div>

          <div className="ogcr-datepicker__weekdays">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="ogcr-datepicker__weekday">{weekday}</span>
            ))}
          </div>

          <div className="ogcr-datepicker__days">
            {calendarDays.map((day) => {
              const inMonth = day.isSame(viewMonth, "month");
              const selected = isRange
                ? isSameDay(day, selectedStart) || isSameDay(day, selectedEnd)
                : isSameDay(day, selectedSingle);
              const inRange = Boolean(
                isRange && selectedStart && selectedEnd
                  && day.isAfter(selectedStart, "day")
                  && day.isBefore(selectedEnd, "day"),
              );
              const today = day.isSame(moment(), "day");

              return (
                <button
                  key={day.format("YYYY-MM-DD")}
                  type="button"
                  className={[
                    "ogcr-datepicker__day",
                    inMonth ? "" : "ogcr-datepicker__day--muted",
                    selected ? "ogcr-datepicker__day--selected" : "",
                    inRange ? "ogcr-datepicker__day--in-range" : "",
                    today ? "ogcr-datepicker__day--today" : "",
                  ].join(" ").trim()}
                  onClick={() => handleDaySelect(day)}
                  aria-pressed={selected}
                >
                  {day.date()}
                </button>
              );
            })}
          </div>

          <div className="ogcr-datepicker__panel-actions">
            <button type="button" className="ogcr-datepicker__clear" onClick={clearValue}>
              <XIcon size={14} />
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {hasHelper ? <p id={helperId} className="ogcr-datepicker__helper">{helperText}</p> : null}
    </div>
  );
}

export default DatePicker;
