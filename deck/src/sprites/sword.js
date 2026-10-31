// The hero's sword, drawn on canvas. angle: 0 = pointing forward, -π/2 = up.
export function drawSword(ctx, x, y, angle, { cancelled = false, scale = 1, flip = false } = {}) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#120c2c';
  ctx.fillRect(4, -9, 138, 18);
  ctx.fillStyle = cancelled ? '#ff9fb2' : '#e8ecff';
  ctx.fillRect(8, -5, 130, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8, -5, 130, 3);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-4, -20, 12, 40);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-28, -6, 24, 12);
  ctx.restore();
}
