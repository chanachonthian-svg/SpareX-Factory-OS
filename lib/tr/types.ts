/** Shared type for per-module translation dictionaries.
 *  key = English source string → localized variants. */
export type TrDict = Record<string, { th: string; ja: string; zh: string }>;
