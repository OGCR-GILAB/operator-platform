import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

export function CloseGlyph({ color = "currentColor" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

function Modal(props) {
  const {
    isOpen = false,
    onClose = () => {},
    title,
    subtitle,
    description,
    children,
    actions,
    size = "md",
    fullscreen = false,
    hideCloseButton = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    primaryAction,
    secondaryAction,
    className = "",
    contentClassName = "",
    closeLabel = "Close modal",
  } = props;

  const generatedId = useId();
  const titleId = `ogcr-modal-title-${generatedId}`;
  const subtitleId = `ogcr-modal-subtitle-${generatedId}`;
  const resolvedSubtitle = subtitle || description;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) {
      return undefined;
    }

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayMouseDown = (event) => {
    if (!closeOnOverlayClick) {
      return;
    }

    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const hasFooter = Boolean(actions || primaryAction || secondaryAction);

  return createPortal(
    <div className="ogcr-modal" role="presentation" onMouseDown={handleOverlayMouseDown}>
      <div
        className={[
          "ogcr-modal__dialog",
          fullscreen ? "ogcr-modal__dialog--fullscreen" : `ogcr-modal__dialog--${size}`,
          className,
        ].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={resolvedSubtitle ? subtitleId : undefined}
      >
        {(title || resolvedSubtitle || !hideCloseButton) ? (
          <header className="ogcr-modal__header">
            <div className="ogcr-modal__heading">
              {title ? <h3 id={titleId} className="ogcr-modal__title">{title}</h3> : null}
              {resolvedSubtitle ? <p id={subtitleId} className="ogcr-modal__subtitle">{resolvedSubtitle}</p> : null}
            </div>

            {!hideCloseButton ? (
              <button
                type="button"
                className="ogcr-modal__close"
                onClick={onClose}
                aria-label={closeLabel}
              >
                <CloseGlyph />
              </button>
            ) : null}
          </header>
        ) : null}

        <div className={["ogcr-modal__content", contentClassName].filter(Boolean).join(" ")}>
          {children}
        </div>

        {hasFooter ? (
          <footer className="ogcr-modal__footer">
            {actions || (
              <>
                {secondaryAction ? (
                  <Button
                    variant={secondaryAction.variant || "outlined"}
                    onClick={secondaryAction.onClick}
                    disabled={secondaryAction.disabled}
                  >
                    {secondaryAction.label}
                  </Button>
                ) : null}
                {primaryAction ? (
                  <Button
                    variant={primaryAction.variant || "filled"}
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    tone={primaryAction.tone}
                  >
                    {primaryAction.label}
                  </Button>
                ) : null}
              </>
            )}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
