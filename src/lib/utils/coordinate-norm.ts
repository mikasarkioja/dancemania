/**
 * Normalize / denormalize click coordinates for partner identification.
 * Uses the element's getBoundingClientRect() so the math is robust against
 * padding, borders, or scaling (e.g. maxWidth: 100% on the preview).
 */

/**
 * Normalize viewport click coordinates to percentages (0.0–1.0) relative to
 * the element's bounding rect. Use the same element's getBoundingClientRect()
 * for both normalize and denormalize so padding/borders are consistent.
 *
 * @param clickX - Viewport X (e.g. e.clientX)
 * @param clickY - Viewport Y (e.g. e.clientY)
 * @param rect - Element rect from getBoundingClientRect()
 * @returns { x, y } in 0–1 range (clamped)
 */
export function normalizeCoordinates(
  clickX: number,
  clickY: number,
  rect: DOMRect
): { x: number; y: number } {
  const width = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const x = (clickX - rect.left) / width;
  const y = (clickY - rect.top) / height;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

/**
 * Convert normalized coordinates (0.0–1.0) back to pixel positions for
 * rendering markers. Use the same element's getBoundingClientRect() so
 * markers stay correctly positioned on resize.
 *
 * @param normX - X as percentage (0–1)
 * @param normY - Y as percentage (0–1)
 * @param rect - Element rect from getBoundingClientRect()
 * @returns { x, y } in pixels relative to the element's coordinate system
 */
export function denormalizeCoordinates(
  normX: number,
  normY: number,
  rect: DOMRect
): { x: number; y: number } {
  return {
    x: normX * rect.width,
    y: normY * rect.height,
  };
}
