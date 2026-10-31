// Maps a keydown to a deck action. Presentation clickers send PageUp / PageDown
// (some send arrows, and "b" or "." for a black screen).

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function keyToAction(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  // The clicker must always work, even while the demo input has focus.
  if (e.key === 'PageDown') return 'next';
  if (e.key === 'PageUp') return 'prev';
  if (isTyping(e.target)) return e.key === 'Escape' ? 'blur' : null;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
      return 'next';
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'Backspace':
      return 'prev';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'b':
    case 'B':
    case '.':
      return 'blank';
    case 'f':
    case 'F':
      return 'fullscreen';
    case 'p':
    case 'P':
      return 'presenter';
    default:
      return null;
  }
}

export { isTyping };
