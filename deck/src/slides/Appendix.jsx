import '../styles/story.css';

// Appendix (hidden by default; open the deck with ?appendix): every slide and the CLAIMS.md rows
// it depends on. The IDs are not shown on the projected slides.
export function makeAppendix(getSlides) {
  return function Appendix() {
    const rows = getSlides().filter((s) => s.id !== 'appendix' && s.claims && s.claims.length);
    return (
      <div className="ax-slide">
        <div className="ax-title">APPENDIX · sources (CLAIMS.md)</div>
        <div className="ax-list">
          {rows.map((s) => (
            <div key={s.id} className="ax-row">
              <span className="ax-name">{s.title}</span>
              <span className="ax-ids">{[...new Set(s.claims)].join(' ')}</span>
            </div>
          ))}
        </div>
        <div className="ax-foot">github.com/samabaasi · CLAIMS.md has every source link</div>
      </div>
    );
  };
}
