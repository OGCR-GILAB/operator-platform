function Button(props) {
  const {
    variant = "filled",
    tone,
    startIcon,
    endIcon,
    style = {},
    className = "",
    children,
    onClick = () => {},
    type = "button",
    disabled = false,
    ariaLabel,
  } = props;

  const toneClass = tone ? `ogcr-button--tone-${tone}` : "";

  return (
    <button
      onClick={onClick}
      className={`ogcr-button ogcr-button--${variant} ${toneClass} ${className}`.trim()}
      type={type}
      style={{ ...style }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {startIcon && <span className="ogcr-button__icon" aria-hidden="true">{startIcon}</span>}
      <span className="ogcr-button__label">{children}</span>
      {endIcon && <span className="ogcr-button__icon" aria-hidden="true">{endIcon}</span>}
    </button>
  );
}

export default Button;