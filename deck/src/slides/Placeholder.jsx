import '../styles/story.css';

// A floor that is planned in STORYBOARD.md but not built yet. Shows the storyboard text only.
export function makePlaceholder({ floor, title, real, rows }) {
  return function Placeholder() {
    return (
      <div className="ph-slide">
        <div className="ph-tag">PLACEHOLDER · storyboard only · built in a later phase</div>
        <div className="ph-floor">{floor}</div>
        <div className="ph-title">{title}</div>
        <div className="ph-real">{real}</div>
        <ol className="ph-rows">
          {rows.map(([idea, ids]) => (
            <li key={idea}>
              {idea} <span className="ph-ids">{ids}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  };
}
