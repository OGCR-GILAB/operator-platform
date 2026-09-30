import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { CaretDownIcon } from "@phosphor-icons/react";

function Select(props) {
  const {
    error = false,
    required = false,
    label,
    helperText,
    id,
    value,
    onChange = () => {},
    style = {},
    className = "",
    disabled = false,
    startIcon,
    options = [],
    placeholder = "Select an option",
    children,
    name,
    ...rest
  } = props;

  const generatedId = useId();
  const controlId = id || `ogcr-select-${generatedId}`;
  const helperId = `${controlId}-help`;
  const listboxId = `${controlId}-listbox`;
  const hasHelper = Boolean(helperText);
  const hasPlaceholder = placeholder !== undefined && placeholder !== null && placeholder !== false;

  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const resolvedOptions = useMemo(() => {
    if (children) {
      return Children.toArray(children)
        .filter((child) => isValidElement(child) && child.type === "option")
        .map((child) => ({
          value: child.props.value,
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        }));
    }

    return options.map((option) => {
      if (typeof option === "string" || typeof option === "number") {
        return {
          value: String(option),
          label: option,
          disabled: false,
        };
      }

      return {
        value: String(option.value),
        label: option.label,
        disabled: Boolean(option.disabled),
      };
    });
  }, [children, options]);

  const normalizedValue = value === undefined || value === null ? "" : String(value);

  const selectedIndex = resolvedOptions.findIndex(
    (option) => String(option.value) === normalizedValue
  );

  const selectedOption = selectedIndex >= 0 ? resolvedOptions[selectedIndex] : null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const emitChange = (nextValue) => {
    onChange({
      target: {
        value: nextValue,
        name,
        id: controlId,
      },
      currentTarget: {
        value: nextValue,
        name,
        id: controlId,
      },
    });
  };

  const selectOption = (option) => {
    if (!option || option.disabled || disabled) {
      return;
    }

    emitChange(String(option.value));
    setOpen(false);
  };

  const getEnabledIndex = (startIndex, step) => {
    if (!resolvedOptions.length) {
      return -1;
    }

    let index = startIndex;

    for (let count = 0; count < resolvedOptions.length; count += 1) {
      index = (index + step + resolvedOptions.length) % resolvedOptions.length;

      if (!resolvedOptions[index].disabled) {
        return index;
      }
    }

    return -1;
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        const nextIndex = selectedIndex >= 0
          ? getEnabledIndex(selectedIndex - 1, 1)
          : getEnabledIndex(-1, 1);
        setActiveIndex(nextIndex);
        setOpen(true);
        return;
      }

      setActiveIndex((current) => {
        const base = current >= 0 ? current : selectedIndex;
        return getEnabledIndex(base, 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        const nextIndex = selectedIndex >= 0
          ? getEnabledIndex(selectedIndex + 1, -1)
          : getEnabledIndex(0, -1);
        setActiveIndex(nextIndex);
        setOpen(true);
        return;
      }

      setActiveIndex((current) => {
        const base = current >= 0 ? current : selectedIndex;
        return getEnabledIndex(base, -1);
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
        return;
      }

      if (activeIndex >= 0) {
        selectOption(resolvedOptions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const toggleOpen = () => {
    if (disabled) {
      return;
    }

    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) {
        setActiveIndex(selectedIndex);
      }
      return nextOpen;
    });
  };

  return (
    <div
      ref={wrapperRef}
      className={`ogcr-select${error ? " ogcr-select--error" : ""}${open ? " ogcr-select--open" : ""} ${className}`.trim()}
      style={{ ...style }}
    >
      {label ? (
        <label className="ogcr-select__label" htmlFor={controlId}>
          {label}
          {required ? <span className="text-negative" aria-hidden="true"> *</span> : null}
        </label>
      ) : null}

      <div className="ogcr-select__field">
        {startIcon ? <span className="ogcr-select__icon">{startIcon}</span> : null}
        <button
          id={controlId}
          type="button"
          className="ogcr-select__control"
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-describedby={hasHelper ? helperId : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          {...rest}
        >
          <span
            className={`ogcr-select__control-text${!selectedOption ? " ogcr-select__control-text--placeholder" : ""}`}
          >
            {selectedOption ? selectedOption.label : (hasPlaceholder ? placeholder : "")}
          </span>
        </button>
        <span className="ogcr-select__icon ogcr-select__icon--trailing" aria-hidden="true">
          <CaretDownIcon />
        </span>

        {open ? (
          <div className="ogcr-select__menu" role="presentation">
            <ul id={listboxId} className="ogcr-select__listbox" role="listbox" aria-labelledby={label ? controlId : undefined}>
              {hasPlaceholder ? (
                <li>
                  <button
                    type="button"
                    role="option"
                    className={`ogcr-select__option${normalizedValue === "" ? " ogcr-select__option--selected" : ""}`}
                    aria-selected={normalizedValue === ""}
                    onClick={() => {
                      if (!required) {
                        emitChange("");
                        setOpen(false);
                      }
                    }}
                    disabled={required}
                  >
                    {placeholder}
                  </button>
                </li>
              ) : null}

              {resolvedOptions.map((option, index) => {
                const isSelected = String(option.value) === normalizedValue;
                const isActive = index === activeIndex;

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      className={[
                        "ogcr-select__option",
                        isSelected ? "ogcr-select__option--selected" : "",
                        isActive ? "ogcr-select__option--active" : "",
                        option.disabled ? "ogcr-select__option--disabled" : "",
                      ].filter(Boolean).join(" ")}
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}

              {!resolvedOptions.length && !hasPlaceholder ? (
                <li className="ogcr-select__empty">No options</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      {hasHelper ? (
        <p id={helperId} className="ogcr-select__helper">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Select;