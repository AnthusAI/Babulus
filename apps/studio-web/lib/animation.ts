/**
 * Interpolates a value based on the current frame.
 * Modeled after Remotion's interpolate function for compatibility and familiarity.
 * 
 * @param frame The current frame number.
 * @param inputRange Array of frame numbers [start, end].
 * @param outputRange Array of output values [startValue, endValue].
 * @param options Configuration options.
 */
export function interpolate(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options: {
    extrapolateLeft?: "clamp" | "extend" | "identity";
    extrapolateRight?: "clamp" | "extend" | "identity";
    easing?: (t: number) => number;
  } = {}
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  const { extrapolateLeft = "clamp", extrapolateRight = "clamp", easing } = options;

  // Avoid division by zero
  if (inMax - inMin === 0) return outMin;

  let t = (frame - inMin) / (inMax - inMin);

  if (t < 0) {
    if (extrapolateLeft === "clamp") t = 0;
    else if (extrapolateLeft === "identity") return frame;
  }
  
  if (t > 1) {
    if (extrapolateRight === "clamp") t = 1;
    else if (extrapolateRight === "identity") return frame;
  }

  if (easing) {
    t = easing(t);
  }

  return outMin + t * (outMax - outMin);
}

/**
 * Basic easing functions for frame-based animations.
 */
export const Easing = {
  linear: (t: number) => t,
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  // Common easings
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};
