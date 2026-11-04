import assert from "node:assert/strict";
import type { User } from "../db/schema";
import { DAY, evaluateSwitch } from "./switch-rules";

const now = new Date("2026-11-10T09:30:00Z");
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const user = (patch: Partial<User>): User =>
  ({
    switchEnabled: true,
    switchMode: "checkin",
    switchStatus: "active",
    checkInIntervalDays: 30,
    gracePeriodDays: 14,
    lastCheckInAt: ago(1),
    warningStartedAt: null,
    lastReminderAt: null,
    claimRecipientId: null,
    ...patch,
  }) as User;

const cases: [string, User, string][] = [
  ["switch off", user({ switchEnabled: false, lastCheckInAt: ago(90) }), "none"],
  ["check-in not due", user({}), "none"],
  ["check-in due", user({ lastCheckInAt: ago(30) }), "start_warning"],
  ["due within cron drift (1h early)", user({ lastCheckInAt: new Date(ago(30).getTime() + 60 * 60_000) }), "start_warning"],
  ["claim mode never starts on its own", user({ switchMode: "claim", lastCheckInAt: ago(400) }), "none"],
  ["warning, reminder not delivered yet → keep trying", user({ switchStatus: "warning", warningStartedAt: ago(2) }), "remind"],
  [
    "past release date but no reminder ever delivered → never release",
    user({ switchStatus: "warning", warningStartedAt: ago(40), lastReminderAt: null }),
    "remind",
  ],
  ["warning, reminded today → wait", user({ switchStatus: "warning", warningStartedAt: ago(1), lastReminderAt: ago(0.1) }), "none"],
  ["warning, cadence reached → remind", user({ switchStatus: "warning", warningStartedAt: ago(4), lastReminderAt: ago(3) }), "remind"],
  ["grace period over → release", user({ switchStatus: "warning", warningStartedAt: ago(14), lastReminderAt: ago(1) }), "trigger"],
  [
    "release with cron drift (1h before the exact time)",
    user({ switchStatus: "warning", warningStartedAt: new Date(ago(14).getTime() + 60 * 60_000), lastReminderAt: ago(1) }),
    "trigger",
  ],
  [
    "claim pending, owner notified, waiting period over → release",
    user({ switchMode: "claim", switchStatus: "warning", claimRecipientId: "r1", warningStartedAt: ago(14), lastReminderAt: ago(1) }),
    "trigger",
  ],
  [
    "claim mode warning without a claimant (inconsistent) → never release",
    user({ switchMode: "claim", switchStatus: "warning", warningStartedAt: ago(30), lastReminderAt: ago(1) }),
    "none",
  ],
  ["released → retry pending release emails", user({ switchStatus: "triggered" }), "release_pending"],
];
for (const [name, u, expected] of cases) assert.equal(evaluateSwitch(u, now), expected, name);
console.log(`evaluateSwitch: ${cases.length} cases ok`);
