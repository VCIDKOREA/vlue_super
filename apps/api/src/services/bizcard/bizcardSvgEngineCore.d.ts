declare module "../../../../../src/lib/bizcardSvgEngineCore.js" {
  export const BIZCARD_ASPECT: number;
  export function buildBizcardCardSvgDocument(input: Record<string, unknown>): string;
  export function buildBizcardSvg(input: Record<string, unknown>): string;
  export function normalizeBizcardSnapshot(input: Record<string, unknown>): Record<string, unknown>;
  export function cardToSvgSnapshot(input: Record<string, unknown>): Record<string, unknown>;
  export function themePalette(template: string): Record<string, string>;
}
