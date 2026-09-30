export function Container({ children, className = "" }) {
  return <div className={`grid-container ${className}`.trim()} style={{position: 'relative'}}>{children}</div>;
}

export function Row({ children, className = "" }) {
  return <div className={`grid-row ${className}`.trim()}>{children}</div>;
}

export function Col({
  children,
  span,
  mobileL,
  tablet,
  desktop,
  desktopL,
  className = "",
}) {
  const style = {
    ...(typeof span === "number" && { "--col-span": span }),
    ...(mobileL && { "--col-span-ml": mobileL }),
    ...(tablet && { "--col-span-t": tablet }),
    ...(desktop && { "--col-span-d": desktop }),
    ...(desktopL && { "--col-span-dl": desktopL }),
  };

  return (
    <div className={`grid-col ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
