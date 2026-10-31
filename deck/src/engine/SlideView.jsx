// Renders one slide at one step. In a preview (presenter window), live demos
// show a placeholder instead of running a second copy of the real work.
export function SlideView({ slide, step, preview = false }) {
  if (preview && slide.live) {
    return (
      <div className="live-placeholder">
        <div className="live-placeholder-tag">LIVE DEMO</div>
        <div>{slide.title}</div>
        <div className="live-placeholder-step">step {step} / {slide.steps}</div>
      </div>
    );
  }
  const Component = slide.Component;
  // Floor label (story spine): which dungeon floor this slide is on.
  return (
    <>
      <Component step={step} preview={preview} />
      {slide.floor && <div className="floor-chip">{slide.floor}</div>}
    </>
  );
}
