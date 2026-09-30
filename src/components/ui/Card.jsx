function Card(props) {
  const {
    title,
    subtitle,
    trailing,
    children,
    elevated = false,
    style = {},
    className = "",
  } = props;

  const hasHeader = Boolean(title || subtitle || trailing);
  const hasBody = Boolean(children);

  return (
    <section
      className={`ogcr-card ${elevated ? "ogcr-card--floating" : ""} ${className}`.trim()}
      style={{ ...style }}
    >
      {hasHeader ? (
        <header className="ogcr-card__header">
          {(title || subtitle) ? (
            <div className="ogcr-card__titles">
              {title ? <h3 className="ogcr-card__title">{title}</h3> : null}
              {subtitle ? <p className="ogcr-card__subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {trailing ? <div className="ogcr-card__trailing">{trailing}</div> : null}
        </header>
      ) : null}
      {hasBody ? <div className="ogcr-card__body">{children}</div> : null}
    </section>
  );
}

export default Card;