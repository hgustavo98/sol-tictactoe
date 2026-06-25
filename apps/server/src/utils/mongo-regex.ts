/** Escape user input for safe use inside MongoDB $regex / RegExp. */
export function escapeMongoRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mongoRegexFilter(input: string): RegExp {
  return new RegExp(escapeMongoRegex(input.trim()), "i");
}
