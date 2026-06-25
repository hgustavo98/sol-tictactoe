/** Formats remaining reconnect grace as M:SS */
export function formatGraceRemainingMs(ms: number): string {
  const total = Math.max(0, ms);
  const min = Math.floor(total / 60000);
  const sec = Math.ceil((total % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Formats a duration in whole seconds as M:SS */
export function formatDurationSeconds(totalSec: number): string {
  const sec = Math.max(0, Math.ceil(totalSec));
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${rem.toString().padStart(2, "0")}`;
}
