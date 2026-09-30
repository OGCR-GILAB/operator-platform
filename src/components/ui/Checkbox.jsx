import { useEffect, useId, useRef, useState } from "react";

function Checkbox(props) {
  const {
    id,
    name,
    value,
    checked,
    defaultChecked,
    indeterminate,
    defaultIndeterminate = false,
    error = false,
    disabled = false,
    layout = "inline",
    label,
    description,
    className = "",
    onChange = () => {},
    ...rest
  } = props;

  const generatedId = useId();
  const controlId = id || `ogcr-checkbox-${generatedId}`;
  const inputRef = useRef(null);
  const [internalIndeterminate, setInternalIndeterminate] = useState(defaultIndeterminate);
  const isIndeterminateControlled = typeof indeterminate === "boolean";
  const isIndeterminate = isIndeterminateControlled ? indeterminate : internalIndeterminate;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const isChecked = checked === true;
  const stateClass = isIndeterminate ? "ogcr-check--indeterminate" : isChecked ? "ogcr-check--checked" : "";

  const handleChange = (event) => {
    if (!isIndeterminateControlled && internalIndeterminate) {
      setInternalIndeterminate(false);
    }

    onChange(event);
  };

  return (
    <label
      className={[
        "ogcr-check",
        `ogcr-check--${layout}`,
        stateClass,
        error ? "ogcr-check--error" : "",
        disabled ? "ogcr-check--disabled" : "",
        className,
      ].filter(Boolean).join(" ")}
      htmlFor={controlId}
    >
      <input
        ref={inputRef}
        id={controlId}
        className="ogcr-check__input"
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={handleChange}
        aria-checked={isIndeterminate ? "mixed" : checked}
        {...rest}
      />
      <span className="ogcr-check__box" aria-hidden="true">
        <svg
          className="ogcr-check__icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isIndeterminate ? <line x1="3" y1="8" x2="13" y2="8" /> : <polyline points="3.5 8.5 6.5 11.5 12.5 5" />}
        </svg>
      </span>
      {(label || description) ? (
        <span className="ogcr-check__text">
          {label ? <span className="ogcr-check__line1">{label}</span> : null}
          {description ? <span className="ogcr-check__line2">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export default Checkbox;