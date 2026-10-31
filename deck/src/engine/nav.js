// Position in the deck: { slide, step }. Each slide has `steps` extra clicks,
// so it has steps + 1 states (0 … steps).

export function next(slides, pos) {
  if (pos.step < slides[pos.slide].steps) return { slide: pos.slide, step: pos.step + 1 };
  if (pos.slide < slides.length - 1) return { slide: pos.slide + 1, step: 0 };
  return pos;
}

export function prev(slides, pos) {
  if (pos.step > 0) return { slide: pos.slide, step: pos.step - 1 };
  if (pos.slide > 0) return { slide: pos.slide - 1, step: slides[pos.slide - 1].steps };
  return pos;
}

export function clamp(slides, pos) {
  const slide = Math.min(Math.max(0, pos.slide | 0), slides.length - 1);
  const step = Math.min(Math.max(0, pos.step | 0), slides[slide].steps);
  return { slide, step };
}

// URL hash: #/<slide number, 1-based>/<step>
export function fromHash(slides, hash = location.hash) {
  const m = /^#\/(\d+)(?:\/(\d+))?/.exec(hash);
  if (!m) return { slide: 0, step: 0 };
  return clamp(slides, { slide: Number(m[1]) - 1, step: Number(m[2] || 0) });
}

export function toHash(pos) {
  return `#/${pos.slide + 1}/${pos.step}`;
}

export function samePos(a, b) {
  return a.slide === b.slide && a.step === b.step;
}
