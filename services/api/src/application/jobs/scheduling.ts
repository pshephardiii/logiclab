/** Skip missed slots, keeping the first future occurrence aligned to the saved cadence. */
export function nextScheduledTime(occurrence: Date, intervalSeconds: number, now: Date): Date {
  const interval = intervalSeconds * 1000;
  const steps = Math.floor((now.getTime() - occurrence.getTime()) / interval) + 1;
  return new Date(occurrence.getTime() + steps * interval);
}

/** Stable occurrence identity makes repeated scheduler cycles idempotent. */
export function scheduledOccurrenceKey(scheduleId: string, occurrence: Date): string {
  return `schedule:${scheduleId}:${occurrence.toISOString()}`;
}
