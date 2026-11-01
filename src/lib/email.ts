import "server-only";
import nodemailer from "nodemailer";
import { APP_NAME, appUrl } from "./config";

export type Email = { to: string; subject: string; html: string; text: string; replyTo?: string };

/** Sender is always shown as APP_NAME; EMAIL_FROM may be "Name <addr>" or a bare address. */
function from(): string {
  const raw = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const address = raw.match(/<([^>]+)>/)?.[1] ?? raw.trim();
  return `${APP_NAME.replace(/["<>]/g, "")} <${address}>`;
}

export function emailProvider(): "resend" | "smtp" | "console" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

export async function sendEmail(email: Email): Promise<void> {
  const provider = emailProvider();
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from(),
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return;
  }
  if (provider === "smtp") {
    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: from(), ...email });
    return;
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("No email provider configured. Set RESEND_API_KEY (or SMTP_*) in Vercel.");
  }
  console.log(`\n📧 [dev email] to=${email.to} subject=${JSON.stringify(email.subject)}\n${email.text}\n`);
}

// ---------- templates ----------

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Minimal, client-safe HTML layout. `body` must already be escaped HTML. */
function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-size:15px;line-height:1.6">
<div style="font-weight:600;font-size:18px;margin-bottom:24px;color:#0f766e">${esc(APP_NAME)}</div>
${body}
</td></tr></table>
<div style="font-size:12px;color:#78716c;margin-top:16px">${esc(APP_NAME)} · ${esc(appUrl())}</div>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:28px 0"><a href="${esc(href)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(label)}</a></p>
<p style="font-size:13px;color:#78716c">Or paste this link into your browser:<br><span style="word-break:break-all">${esc(href)}</span></p>`;
}

const p = (s: string) => `<p>${s}</p>`;

export function loginEmail(to: string, link: string): Email {
  return {
    to,
    subject: `Your ${APP_NAME} sign-in link`,
    html: layout(
      p("Click the button below to sign in. The link expires in 20 minutes and can be used once.") +
        button(link, "Sign in") +
        p(`<span style="font-size:13px;color:#78716c">If you didn't request this, you can ignore this email.</span>`),
    ),
    text: `Sign in to ${APP_NAME}: ${link}\n\nThe link expires in 20 minutes. If you didn't request it, ignore this email.`,
  };
}

export function reminderEmail(opts: {
  to: string;
  name: string | null;
  link: string;
  releaseDate: Date;
  recipientCount: number;
  test?: boolean;
}): Email {
  const date = opts.releaseDate.toUTCString().replace(/ \d\d:\d\d:\d\d GMT$/, "");
  const who = `${opts.recipientCount} trusted contact${opts.recipientCount === 1 ? "" : "s"}`;
  return {
    to: opts.to,
    subject: `${opts.test ? "[Test] " : ""}Please confirm you're OK — ${APP_NAME} check-in`,
    html: layout(
      p(`Hi ${esc(opts.name || "there")},`) +
        p(`It's time for your regular ${esc(APP_NAME)} check-in. Please confirm you're OK by clicking the button below.`) +
        p(`<strong>If we don't hear from you by ${esc(date)}, your vault will be released to ${esc(who)}.</strong>`) +
        button(opts.link, "I'm OK — reset my timer"),
    ),
    text: `Hi ${opts.name || "there"},\n\nIt's time for your ${APP_NAME} check-in. Confirm you're OK here: ${opts.link}\n\nIf we don't hear from you by ${date}, your vault will be released to ${who}.`,
  };
}

export function releaseEmail(opts: { to: string; recipientName: string; ownerName: string; ownerEmail: string; link: string }): Email {
  return {
    to: opts.to,
    subject: `${opts.ownerName} left important information for you`,
    html: layout(
      p(`Dear ${esc(opts.recipientName)},`) +
        p(
          `${esc(opts.ownerName)} (${esc(opts.ownerEmail)}) used ${esc(APP_NAME)} to leave you important information — such as accounts, subscriptions and personal messages — to be shared if they could no longer check in.`,
        ) +
        p(`They have not responded to repeated check-in reminders, so this information is now available to you.`) +
        button(opts.link, "View the information") +
        p(`<span style="font-size:13px;color:#78716c">This link is personal to you — please don't forward it. We're sorry if this message reaches you at a difficult time.</span>`),
    ),
    text: `Dear ${opts.recipientName},\n\n${opts.ownerName} (${opts.ownerEmail}) used ${APP_NAME} to leave you important information to be shared if they could no longer check in. They have not responded to repeated check-in reminders, so it is now available to you:\n\n${opts.link}\n\nThis link is personal to you — please don't forward it.`,
  };
}

export function releasedNoticeEmail(opts: { to: string; count: number }): Email {
  const link = `${appUrl()}/login`;
  return {
    to: opts.to,
    subject: `Your ${APP_NAME} vault has been released`,
    html: layout(
      p(`You didn't respond to your check-in reminders, so your vault was released to ${opts.count} trusted contact(s).`) +
        p(`If this was a mistake, sign in to revoke their access and reset your timer.`) +
        button(link, "Sign in"),
    ),
    text: `Your ${APP_NAME} vault was released to ${opts.count} trusted contact(s). If this was a mistake, sign in to revoke access: ${link}`,
  };
}

export function contactAddedEmail(opts: { to: string; recipientName: string; ownerName: string; ownerEmail: string }): Email {
  return {
    to: opts.to,
    subject: `${opts.ownerName} named you as a trusted contact`,
    html: layout(
      p(`Hi ${esc(opts.recipientName)},`) +
        p(
          `${esc(opts.ownerName)} (${esc(opts.ownerEmail)}) has named you as a trusted contact on ${esc(APP_NAME)}. They are keeping a record of important information — like accounts and subscriptions — that should reach you if something happens to them.`,
        ) +
        p(`<strong>You don't need to do anything now.</strong> If ${esc(opts.ownerName)} ever stops responding to regular check-ins, you'll receive an email from us with a private link. Please make sure emails from this address don't go to spam.`),
    ),
    text: `Hi ${opts.recipientName},\n\n${opts.ownerName} (${opts.ownerEmail}) has named you as a trusted contact on ${APP_NAME}. You don't need to do anything now. If they ever stop responding to regular check-ins, you'll receive an email from us with a private link.`,
  };
}

// ---------- claim mode ----------

function fmtDate(d: Date): string {
  return d.toUTCString().replace(/ \d\d:\d\d:\d\d GMT$/, "");
}

/** Sent to each trusted contact when the owner uses claim mode: their personal "request access" link. */
export function claimInviteEmail(opts: { to: string; recipientName: string; ownerName: string; ownerEmail: string; link: string; waitDays: number }): Email {
  return {
    to: opts.to,
    subject: `${opts.ownerName} named you as a trusted contact`,
    html: layout(
      p(`Hi ${esc(opts.recipientName)},`) +
        p(
          `${esc(opts.ownerName)} (${esc(opts.ownerEmail)}) has named you as a trusted contact on ${esc(APP_NAME)}. They keep a private record of important information — accounts, subscriptions, personal messages — meant for you if something happens to them.`,
        ) +
        p(`<strong>You don't need to do anything now.</strong> Please keep this email. If something ever happens to ${esc(opts.ownerName)}, use the button below to request access.`) +
        button(opts.link, "Request access") +
        p(
          `<span style="font-size:13px;color:#78716c">When you request access, ${esc(opts.ownerName)} is notified and has ${opts.waitDays} days to respond. If they don't, the information is released to you and their other trusted contacts. This link is personal — please don't share it.</span>`,
        ),
    ),
    text: `Hi ${opts.recipientName},\n\n${opts.ownerName} (${opts.ownerEmail}) has named you as a trusted contact on ${APP_NAME}. You don't need to do anything now — please keep this email.\n\nIf something ever happens to ${opts.ownerName}, request access here:\n${opts.link}\n\n${opts.ownerName} will be notified and has ${opts.waitDays} days to respond. If they don't, the information is released to you and their other trusted contacts. This link is personal — please don't share it.`,
  };
}

/** Sent to the owner when a contact requests access (and as reminders while it's pending). */
export function claimPendingEmail(opts: { to: string; name: string | null; claimantName: string; link: string; releaseDate: Date; reminder?: boolean }): Email {
  const date = fmtDate(opts.releaseDate);
  return {
    to: opts.to,
    subject: `${opts.reminder ? "Reminder: " : ""}${opts.claimantName} requested access to your ${APP_NAME} vault`,
    html: layout(
      p(`Hi ${esc(opts.name || "there")},`) +
        p(`${esc(opts.claimantName)} has requested access to your ${esc(APP_NAME)} vault, which usually means they believe something has happened to you.`) +
        p(`<strong>If you're OK, reject the request with the button below. Otherwise your vault will be released to your trusted contacts on ${esc(date)}.</strong>`) +
        button(opts.link, "I'm OK — reject this request") +
        p(`<span style="font-size:13px;color:#78716c">${esc(opts.claimantName)} will be told you responded. If you didn't expect this, you can also remove them as a trusted contact after signing in.</span>`),
    ),
    text: `Hi ${opts.name || "there"},\n\n${opts.claimantName} has requested access to your ${APP_NAME} vault.\n\nIf you're OK, reject the request here: ${opts.link}\n\nOtherwise your vault will be released to your trusted contacts on ${date}.`,
  };
}

/** Sent to the contact whose request the owner rejected. */
export function claimRejectedEmail(opts: { to: string; recipientName: string; ownerName: string }): Email {
  return {
    to: opts.to,
    subject: `${opts.ownerName} responded to your request`,
    html: layout(
      p(`Hi ${esc(opts.recipientName)},`) +
        p(`${esc(opts.ownerName)} confirmed they're OK, so your request for access was cancelled. Nothing has been shared.`) +
        p(`Your personal link keeps working if you ever need it again.`),
    ),
    text: `Hi ${opts.recipientName},\n\n${opts.ownerName} confirmed they're OK, so your request for access was cancelled. Nothing has been shared. Your personal link keeps working if you ever need it again.`,
  };
}
