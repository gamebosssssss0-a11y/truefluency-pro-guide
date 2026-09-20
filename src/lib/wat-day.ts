/**
 * One shared Africa/Lagos calendar-day helper for the client.
 * The server has its own copy inside entitlements.server.ts (access.watToday);
 * this is the browser-side equivalent used for "today" comparisons on Home.
 */
export function lagosDay(timestamp: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}
