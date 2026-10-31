import { Sprite } from '../ui/Sprite.jsx';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { GOBLIN, GOBLIN_PALETTE } from '../sprites/goblin.js';
import { TRUCK, TRUCK_PALETTE } from '../sprites/truck.js';
import { TORII, TORII_PALETTE } from '../sprites/torii.js';
import '../styles/story.css';

// Small icons for the entries that have no sprite of their own (8×8, original).
const ICON_PAL = { k: '#120c2c', w: '#ffffff', y: '#ffd166', r: '#ff5d73', g: '#34e0a1', b: '#8a5a2b', c: '#9af5ea', p: '#9a8cf0' };
const ICONS = {
  pause: ['........', '.ww..ww.', '.ww..ww.', '.ww..ww.', '.ww..ww.', '.ww..ww.', '.ww..ww.', '........'],
  board: ['bbbbbbbb', 'byywyywb', 'bwywwyyb', 'byywywwb', 'bbbbbbbb', '..b..b..', '..b..b..', '..b..b..'],
  alarm: ['...rr...', '...rr...', '...rr...', '...rr...', '...rr...', '........', '...rr...', '...rr...'],
  flag: ['.g......', '.gggg...', '.ggggg..', '.ggg....', '.g......', '.g......', '.g......', 'kkk.....'],
  respawn: ['...cc...', '..cccc..', '.cccccc.', '...cc...', '...cc...', '...cc...', '.cccccc.', '.cccccc.'],
  dragon: ['.p......', 'pp...pp.', '.pppppp.', '..pppppp', '..ppppp.', '..p...p.', '..p...p.', '........'],
};

// 図鑑: the recap people will photograph. One line per entry: game name → React name.
// The CLAIMS rows (ids) are in the speaker notes and the appendix, not on screen.
const ENTRIES = [
  { icon: [TRUCK, TRUCK_PALETTE, 2], name: 'LONG TASK truck', real: 'a main-thread task of 50 ms or more', ids: 'L1' },
  { icon: [TORII, TORII_PALETTE, 1.4], name: 'Dungeon · Gate', real: 'the main thread · one task', ids: 'L2 L3' },
  { icon: [FIBER_KUN.idle[0], PALETTE, 3], name: 'Fiber-kun', real: 'a FiberNode: a plain JS object', ids: 'A8' },
  { icon: [FIBER_KUN.idle[0], PALETTE, 3, true], name: 'Twin', real: 'alternate: current ↔ work-in-progress', ids: 'A8' },
  { icon: [ICONS.pause, ICON_PAL, 6], name: '《Yield》', real: 'shouldYield(): pause after 5 ms, resume', ids: 'A2 B1 C4' },
  { icon: [ICONS.board, ICON_PAL, 6], name: 'Quest board', real: '31 lanes · lower bit = more urgent', ids: 'D1' },
  { icon: [ICONS.alarm, ICON_PAL, 6], name: 'Emergency quest', real: 'SyncLane: a microtask, no Scheduler queue', ids: 'C2' },
  { icon: [ICONS.flag, ICON_PAL, 6], name: 'Expedition', real: 'Transition lane: sliced, interruptible', ids: 'A4 E4' },
  { icon: [ICONS.respawn, ICON_PAL, 6], name: 'RESPAWN AT ROOT', real: 'interrupt: throw away, restart from root', ids: 'B2' },
  { icon: [GOBLIN[0], GOBLIN_PALETTE, 6], name: 'Goblin', real: 'one keystroke (SyncLane)', ids: 'D2' },
  { icon: [ICONS.dragon, ICON_PAL, 6], name: 'Dragon', real: 'the heavy list render', ids: 'A4 E4 F1' },
];

export function Bestiary() {
  return (
    <div className="bs-slide">
      <div className="bs-head">
        <span className="bs-title" lang="ja">
          図鑑
        </span>
        <span className="bs-sub">BESTIARY · game name → real name</span>
      </div>
      <div className="bs-list">
        {ENTRIES.map((e) => (
          <div key={e.name} className="bs-row">
            <span className="bs-icon">{e.icon && <Sprite frame={e.icon[0]} palette={e.icon[1]} scale={e.icon[2]} flip={e.icon[3]} />}</span>
            <span className="bs-name">{e.name}</span>
            <span className="bs-real">{e.real}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
