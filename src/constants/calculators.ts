/**
 * Available calculator types that can be enabled for an exam.
 */
export const CALCULATOR_TYPES = [
    "3D",
    "four function",
    "geometry",
    "graph",
    "matrix",
    "scientific",
] as const;

export type CalculatorType = typeof CALCULATOR_TYPES[number];
