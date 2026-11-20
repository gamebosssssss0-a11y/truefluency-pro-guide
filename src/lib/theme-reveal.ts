/** Browser-safe geometry shared by pointer and keyboard theme controls. */
export function themeRevealGeometry(width: number, height: number, origin: { x: number; y: number }) {
  const x = Math.max(0, Math.min(width, origin.x));
  const y = Math.max(0, Math.min(height, origin.y));
  return { x, y, radius: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) };
}