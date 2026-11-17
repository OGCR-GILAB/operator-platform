export function Container({ children, className = "" }) {
  return <div className={`grid-container ${className}`.trim()} style={{position: 'relative'}}>{children}</div>;
}
