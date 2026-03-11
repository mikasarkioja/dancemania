/**
 * Geometry helpers for partner overlay: pixel ↔ normalized (0–1) coordinates.
 * Use the preview element's getBoundingClientRect() so the math is robust
 * against padding, borders, or scaling.
 */

/**
 * Convert pixel coordinates (e.g. from a click in viewport) to normalized
 * decimals (0.0–1.0) relative to the given rect.
 *
 * @param px - Viewport X (e.g. e.clientX)
 * @param py - Viewport Y (e.g. e.clientY)
 * @param rect - Element rect from getBoundingClientRect()
 * @returns { x, y } in 0–1 range (clamped)
 */
export function toNormalized(
  px: number,
  py: number,
  rect: DOMRect
): { x: number; y: number } {
  const { width, height, left, top } = rect;
  if (width <= 0 || height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const x = (px - left) / width;
  const y = (py - top) / height;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

/**
 * Convert normalized coordinates (0.0–1.0) to pixel positions for UI
 * rendering (e.g. positioning markers).
 *
 * @param nx - X as decimal (0–1)
 * @param ny - Y as decimal (0–1)
 * @param rect - Element rect from getBoundingClientRect()
 * @returns { px, py } in pixels relative to the element
 */
export function fromNormalized(
  nx: number,
  ny: number,
  rect: DOMRect
): { px: number; py: number } {
  return {
    px: nx * rect.width,
    py: ny * rect.height,
  };
}
