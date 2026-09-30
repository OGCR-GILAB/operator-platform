import { useId } from "react";

function TextField(props) {
  const {
    error = false,
    required = false,
    placeholder = "",
    label,
    startIcon,
    endIcon,
    helperText,
    type = "text",
    id,
    value,
    onChange = () => {},
    style = {},
    className = "",
    disabled = false,
    ...rest
  } = props;

  const generatedId = useId();
  const controlId = id || `ogcr-input-${generatedId}`;
  const helperId = `${controlId}-help`;
  const hasHelper = Boolean(helperText);

  return (
    <div className={`ogcr-input${error ? " ogcr-input--error" : ""} ${className}`.trim()} style={{ ...style }}>
      {label ? (
        <label className="ogcr-input__label" htmlFor={controlId}>
          {label}
          {required ? <span className="text-negative" aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      <div className="ogcr-input__field">
        {startIcon && <span className="ogcr-input__icon">{startIcon}</span>}
        <input
          value={value}
          onChange={onChange}
          id={controlId}
          className="ogcr-input__control"
          type={type}
          placeholder={placeholder}
          aria-describedby={hasHelper ? helperId : undefined}
          required={required}
          disabled={disabled}
          {...rest}
        />
        {endIcon && <span className="ogcr-input__icon">{endIcon}</span>}
      </div>
      {hasHelper ? (
        <p id={helperId} className="ogcr-input__helper">{helperText}</p>
      ) : null}
    </div>
  );
}

export default TextField;