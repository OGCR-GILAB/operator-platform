import Button from "./Button";

function IconBase({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function InfoGlyph() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function CheckCircleGlyph() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 11 15 16 9" />
    </IconBase>
  );
}

function WarningGlyph() {
  return (
    <IconBase>
      <polygon points="12 3 22 20 2 20 12 3" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function ErrorGlyph() {
  return (
    <IconBase>
      <polygon points="8 3 16 3 21 8 21 16 16 21 8 21 3 16 3 8 8 3" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function CloseGlyph() {
  return (
    <IconBase>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </IconBase>
  );
}

const variantIcons = {
  neutral: <InfoGlyph />,
  success: <CheckCircleGlyph />,
  warning: <WarningGlyph />,
  error: <ErrorGlyph />,
};

function Message(props) {
  const {
    variant = "neutral",
    floating = false,
    title,
    description,
    action,
    actionLabel,
    onAction = () => {},
    onClose,
    closeLabel = "Dismiss",
    icon,
    className = "",
  } = props;

  const role = variant === "error" ? "alert" : "status";
  const resolvedIcon = icon ?? variantIcons[variant] ?? variantIcons.neutral;

  return (
    <div
      className={[
        "ogcr-message",
        variant !== "neutral" ? `ogcr-message--${variant}` : "",
        floating ? "ogcr-message--floating" : "",
        className,
      ].filter(Boolean).join(" ")}
      role={role}
    >
      <div className="ogcr-message__content">
        <span className="ogcr-message__icon" aria-hidden="true">
          {resolvedIcon}
        </span>
        <div className="ogcr-message__text">
          {title ? <p className="ogcr-message__title">{title}</p> : null}
          {description ? <p className="ogcr-message__description">{description}</p> : null}
        </div>
      </div>

      {action ? action : null}

      {!action && actionLabel ? (
        <Button variant="outlined" className="ogcr-message__action" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}

      {floating && onClose ? (
        <button className="ogcr-message__close" onClick={onClose} aria-label={closeLabel} type="button">
          <CloseGlyph />
        </button>
      ) : null}
    </div>
  );
}

export default Message;