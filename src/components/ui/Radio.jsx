import { useId } from "react";

function Radio(props) {
  const {
    id,
    name,
    value,
    checked,
    defaultChecked,
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
  const controlId = id || `ogcr-radio-${generatedId}`;

  return (
    <label
      className={[
        "ogcr-radio",
        `ogcr-radio--${layout}`,
        checked ? "ogcr-radio--checked" : "",
        error ? "ogcr-radio--error" : "",
        disabled ? "ogcr-radio--disabled" : "",
        className,
      ].filter(Boolean).join(" ")}
      htmlFor={controlId}
    >
      <input
        id={controlId}
        className="ogcr-radio__input"
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange}
        {...rest}
      />
      <span className="ogcr-radio__box" aria-hidden="true">
        <span className="ogcr-radio__dot"></span>
      </span>
      {(label || description) ? (
        <span className="ogcr-radio__text">
          {label ? <span className="ogcr-radio__line1">{label}</span> : null}
          {description ? <span className="ogcr-radio__line2">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export default Radio;