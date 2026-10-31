export const APP_NAME = process.env.APP_NAME || "Afterword";

/** Absolute base URL used in emails. */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SESSION_DAYS = 30;
export const LOGIN_TOKEN_MINUTES = 20;
/** During the grace period, re-send the reminder every 1–3 days so there are always several reminders. */
export function reminderEveryDays(gracePeriodDays: number): number {
  return Math.min(3, Math.max(1, Math.floor(gracePeriodDays / 3)));
}

export const INTERVAL_OPTIONS = [7, 14, 30, 60, 90, 180] as const;
export const GRACE_OPTIONS = [3, 7, 14, 30] as const;
