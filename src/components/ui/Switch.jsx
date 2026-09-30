import { useId } from "react";

function Switch(props) {
  const {
    id,
    checked,
    defaultChecked,
    disabled = false,
    error = false,
    label,
    description,
    helperText,
    className = "",
    onChange = () => {},
    ...rest
  } = props;

  const generatedId = useId();
  const controlId = id || `ogcr-switch-${generatedId}`;
  const helperId = `${controlId}-help`;
  const hasHelper = Boolean(helperText);

  return (
    <div className={[
      "ogcr-switch",
      checked === true ? "ogcr-switch--checked" : "",
      error ? "ogcr-switch--error" : "",
      disabled ? "ogcr-switch--disabled" : "",
      className,
    ].filter(Boolean).join(" ")}>
      <label className="ogcr-switch__label-wrap" htmlFor={controlId}>
        <span className="ogcr-switch__text">
          {label ? <span className="ogcr-switch__label">{label}</span> : null}
          {description ? <span className="ogcr-switch__description">{description}</span> : null}
        </span>
        <span className="ogcr-switch__control-wrap">
          <input
            id={controlId}
            className="ogcr-switch__input"
            type="checkbox"
            role="switch"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            aria-describedby={hasHelper ? helperId : undefined}
            onChange={onChange}
            {...rest}
          />
          <span className="ogcr-switch__track" aria-hidden="true">
            <span className="ogcr-switch__thumb"></span>
          </span>
        </span>
      </label>
      {hasHelper ? <p id={helperId} className="ogcr-switch__helper">{helperText}</p> : null}
    </div>
  );
}

export default Switch;