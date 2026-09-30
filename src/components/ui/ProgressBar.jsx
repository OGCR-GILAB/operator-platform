function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ProgressBar(props) {
  const {
    value = 0,
    indeterminate = false,
    tone = "default",
    label,
    labelIcon,
    showPercentage = true,
    ariaLabel,
    className = "",
  } = props;

  const clampedValue = clamp(Number.isFinite(value) ? value : 0, 0, 100);
  const shouldRenderText = Boolean(label || (showPercentage && !indeterminate));
  const toneClass = tone !== "default" ? `ogcr-progress--${tone}` : "";

  return (
    <div
      className={`ogcr-progress ${toneClass} ${indeterminate ? "ogcr-progress--indeterminate" : ""} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-label={ariaLabel || label || "Progress"}
    >
      {shouldRenderText ? (
        <div className="ogcr-progress__text">
          {label ? (
            <span className="ogcr-progress__label">
              {labelIcon ? <span className="ogcr-progress__label-icon">{labelIcon}</span> : null}
              {label}
            </span>
          ) : null}
          {showPercentage && !indeterminate ? (
            <span className="ogcr-progress__value">{clampedValue}%</span>
          ) : null}
        </div>
      ) : null}

      <div className="ogcr-progress__track">
        <div
          className="ogcr-progress__fill"
          style={indeterminate ? undefined : { width: `${clampedValue}%` }}
        ></div>
      </div>
    </div>
  );
}

export default ProgressBar;
