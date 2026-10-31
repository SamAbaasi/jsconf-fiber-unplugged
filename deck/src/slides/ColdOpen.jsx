import { Dialogue } from '../ui/Dialogue.jsx';
import { LINES } from '../content/lines.js';

// Black screen. Then a voice in the dark.
export function ColdOpen({ step, preview }) {
  return (
    <div className="cold-black">
      {step >= 1 && <Dialogue line={LINES.coldWake} preview={preview} className="cold-dlg" />}
    </div>
  );
}
