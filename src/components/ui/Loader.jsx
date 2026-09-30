function Loader(props) {
  const {
    variant = "spinner",
    size = "m",
    tone = "primary",
    label = "Loading",
    className = "",
  } = props;

  const classes = [
    "ogcr-loader",
    `ogcr-loader--${variant}`,
    `ogcr-loader--${size}`,
    `ogcr-loader--${tone}`,
    className,
  ]
    .join(" ")
    .trim();

  return (
    <span className={classes} role="status" aria-label={label}>
      {variant === "dots" ? (
        <span className="ogcr-loader__dots" aria-hidden="true">
          <span className="ogcr-loader__dot" />
          <span className="ogcr-loader__dot" />
          <span className="ogcr-loader__dot" />
        </span>
      ) : (
        <span className="ogcr-loader__spinner" aria-hidden="true" />
      )}
    </span>
  );
}

export default Loader;
