// CPU work per grid cell. The amount is calibrated at startup so that one full
// render of the grid costs about the same on any laptop. The work is real
// arithmetic, not a sleep: it only blocks the thread the way real render code does.

let itersPerMicro = 50;
let itersPerCell = 0;
let sink = 0;

export const settings = { microsPerCell: 12 };

function spin(iters) {
  let x = sink | 1;
  for (let i = 0; i < iters; i++) x = (Math.imul(x, 1103515245) + 12345) | 0;
  sink ^= x;
}

export function calibrate() {
  // Warm up the JIT, then measure.
  spin(200000);
  let iters = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 40) {
    spin(5000);
    iters += 5000;
  }
  itersPerMicro = iters / ((performance.now() - t0) * 1000);
  setMicrosPerCell(settings.microsPerCell);
  return itersPerMicro;
}

export function setMicrosPerCell(us) {
  settings.microsPerCell = Math.max(0, Math.min(60, us));
  itersPerCell = Math.round(itersPerMicro * settings.microsPerCell);
}

export function burnCell() {
  spin(itersPerCell);
}
