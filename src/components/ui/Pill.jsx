const pillPresetLabels = {
  new: "NEW",
  dev: "DEV",
  test: "TEST",
  ready: "READY",
};

function resolvePillLabel({ preset, label, children }) {
  if (children !== undefined && children !== null) {
    return children;
  }

  if (label !== undefined && label !== null) {
    return label;
  }

  if (typeof preset === "string") {
    return pillPresetLabels[preset.toLowerCase()] ?? preset.toUpperCase();
  }

  return null;
}

function Pill({ tone = "neutral", preset, label, children, className = "", as: Component = "span" }) {
  const content = resolvePillLabel({ preset, label, children });

  if (content === null) {
    return null;
  }

  return (
    <Component className={`ogcr-pill ogcr-pill--${tone} ${className}`.trim()}>
      {content}
    </Component>
  );
}

export function PillTag(props) {
  const {
    tone = "neutral",
    preset,
    label,
    children,
    position = "top-right",
    className = "",
    tagClassName = "",
    as: Component = "div",
  } = props;

  const positionClass = `ogcr-pill-tag--${position}`;

  return (
    <Component className={`ogcr-pill-tag ${positionClass} ${className}`.trim()}>
      {children}
      <Pill tone={tone} preset={preset} label={label} className={`ogcr-pill-tag__label ${tagClassName}`.trim()} />
    </Component>
  );
}

export default Pill;
