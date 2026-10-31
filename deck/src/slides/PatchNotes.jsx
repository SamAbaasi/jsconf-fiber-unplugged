import { LINES as L } from '../content/lines.js';
import { useStepSound } from '../audio/useStepSound.js';
import '../styles/patch.css';

// The four corrections from CLAIMS.md "Corrections to say on stage":
// E1/E2 (Part 9 startTransition), G2 (Part 9 useEffect), H3 (Part 9 Header), C10 + A4 (Part 1 "5 ms").
const ENTRIES = [
  { part: 'Part 9', old: L.patch1Old, fix: L.patch1New, code: true },
  { part: 'Part 9', old: L.patch2Old, fix: L.patch2New },
  { part: 'Part 9', old: L.patch3Old, fix: L.patch3New },
  { part: 'Part 1', old: L.patch4Old, fix: L.patch4New },
];

export function PatchNotes({ step, preview }) {
  useStepSound(step, { 1: 'blip', 2: 'blip', 3: 'blip', 4: 'blip' }, preview);
  return (
    <div className="pn">
      <div className="pn-head">
        <div className="pn-title">{L.patchTitle.text}</div>
        <div className="pn-sub">{L.patchSub.text}</div>
      </div>
      <div className="pn-list">
        {ENTRIES.map((e, i) =>
          step > i ? (
            <div key={i} className="pn-entry pop-in">
              <span className={i > 0 && ENTRIES[i - 1].part === e.part ? 'pn-part is-same' : 'pn-part'}>{e.part}</span>
              <div className="pn-body">
                <s className={e.code ? 'pn-old is-code' : 'pn-old'}>{e.old.text}</s>
                <div className="pn-fix">
                  <span className="pn-check">✔</span> {e.fix.text}
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="pn-entry is-empty" />
          ),
        )}
      </div>
    </div>
  );
}
