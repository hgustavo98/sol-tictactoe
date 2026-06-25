import { config } from "../config";

/** Hide internal error details from API clients in production. */
export function safeApiError(
  err: unknown,
  publicMessage: string,
): string {
  if (!config.isProduction) {
    return err instanceof Error ? err.message : publicMessage;
  }
  return publicMessage;
}
