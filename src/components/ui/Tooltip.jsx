import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

function Tooltip({
  content,
  children,
  placement = "auto",
  arrow = true,
  className = "",
  contentClassName = "",
  delay = 200,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const fadeTimeoutRef = useRef(null);

  const ARROW_SIZE = 8;
  const OFFSET = 8;

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let newPlacement = placement;
    let top = 0;
    let left = 0;

    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - OFFSET - (arrow ? ARROW_SIZE : 0),
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      },
      bottom: {
        top: triggerRect.bottom + OFFSET + (arrow ? ARROW_SIZE : 0),
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      },
      left: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.left - tooltipRect.width - OFFSET - (arrow ? ARROW_SIZE : 0),
      },
      right: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.right + OFFSET + (arrow ? ARROW_SIZE : 0),
      },
    };

    if (placement === "auto") {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if tooltip fits in preferred placements, fallback to others
      if (
        triggerRect.top - tooltipRect.height - OFFSET - (arrow ? ARROW_SIZE : 0) > 0
      ) {
        newPlacement = "top";
      } else if (
        triggerRect.bottom + tooltipRect.height + OFFSET + (arrow ? ARROW_SIZE : 0) <
        viewportHeight
      ) {
        newPlacement = "bottom";
      } else if (
        triggerRect.left - tooltipRect.width - OFFSET - (arrow ? ARROW_SIZE : 0) > 0
      ) {
        newPlacement = "left";
      } else if (
        triggerRect.right + tooltipRect.width + OFFSET + (arrow ? ARROW_SIZE : 0) <
        viewportWidth
      ) {
        newPlacement = "right";
      } else {
        newPlacement = "top";
      }
    } else {
      newPlacement = placement;
    }

    top = positions[newPlacement].top;
    left = positions[newPlacement].left;

    // Keep tooltip within viewport
    const padding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    if (top < padding) {
      top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setPosition({ top, left });
    setActualPlacement(newPlacement);
  };

  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure DOM is updated before calculating
      const frameId = requestAnimationFrame(() => {
        calculatePosition();
      });

      window.addEventListener("scroll", calculatePosition, true);
      window.addEventListener("resize", calculatePosition);

      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener("scroll", calculatePosition, true);
        window.removeEventListener("resize", calculatePosition);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      // Cleanup timeouts on unmount
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsFading(true);
    
    // Wait for fade-out animation to complete before hiding
    fadeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsFading(false);
    }, 150); // Match the fade-out animation duration
  };

  const getArrowStyle = () => {
    const arrowBase = {
      position: "absolute",
      width: 0,
      height: 0,
      borderStyle: "solid",
      filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08))",
    };

    const arrowPositions = {
      top: {
        ...arrowBase,
        bottom: `-${ARROW_SIZE}px`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
        borderColor: `var(--surface-light) transparent transparent transparent`,
      },
      bottom: {
        ...arrowBase,
        top: `-${ARROW_SIZE}px`,
        left: "50%",
        transform: "translateX(-50%)",
        borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent var(--surface-light) transparent`,
      },
      left: {
        ...arrowBase,
        right: `-${ARROW_SIZE}px`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent transparent var(--surface-light)`,
      },
      right: {
        ...arrowBase,
        left: `-${ARROW_SIZE}px`,
        top: "50%",
        transform: "translateY(-50%)",
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
        borderColor: `transparent var(--surface-light) transparent transparent`,
      },
    };

    return arrowPositions[actualPlacement];
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`ogcr-tooltip ${isFading ? "ogcr-tooltip--fading" : ""} ${contentClassName}`.trim()}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 1000,
            }}
          >
            {arrow && <div style={getArrowStyle()} className="ogcr-tooltip__arrow" />}
            <div className="ogcr-tooltip__content">{content}</div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Tooltip;
