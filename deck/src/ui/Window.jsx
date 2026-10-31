// A JRPG-style status window.
export function Window({ title, className = '', style, children }) {
  return (
    <div className={`win ${className}`} style={style}>
      {title && <div className="win-title">{title}</div>}
      {children}
    </div>
  );
}
