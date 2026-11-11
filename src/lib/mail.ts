import "server-only";
import { env, isProduction } from "@/lib/env";
import { OPERATOR } from "@/lib/legal";

export const CODE_MINUTES = 10;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** "482913" -> "482 913", easier to read and type. Pure. */
export const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** The sign-in code email, as on the canvas: dark card, the code big, the Impressum line at the bottom. */
export function codeEmail(code: string) {
  const c = esc(spaced(code));
  const address = esc(`${OPERATOR.name} · ${OPERATOR.co}, ${OPERATOR.street}, ${OPERATOR.city}`);
  return {
    // the code in the subject, so the notification alone is enough
    subject: `${spaced(code)} is your Lateshow code`,
    text: `Your Lateshow sign-in code: ${spaced(code)}\n\nType it where you asked for it. It works for ${CODE_MINUTES} minutes, once.\nDidn't ask? Ignore this email. Nobody can sign in without the code.\n\n${OPERATOR.name}, ${OPERATOR.co}, ${OPERATOR.street}, ${OPERATOR.city}`,
    html: `<!doctype html><html><body style="margin:0;background:#1c1c1e;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif">
<div style="max-width:440px;margin:0 auto;background:#000;color:#f5f5f7;border-radius:28px;padding:44px 36px">
<div style="font-size:22px;font-weight:700;letter-spacing:-0.035em">Lateshow</div>
<div style="padding-top:28px;font-size:15px;color:#86868b">Your sign-in code</div>
<div style="padding-top:8px;font-size:52px;font-weight:700;letter-spacing:0.06em">${c}</div>
<p style="margin:24px 0 0;font-size:15px;line-height:1.55;color:#86868b">Type it where you asked for it. It works for ${CODE_MINUTES} minutes, once.<br>Didn't ask? Ignore this email. Nobody can sign in without the code.</p>
<div style="height:1px;background:#222;margin:28px 0"></div>
<p style="margin:0;font-size:12px;line-height:1.6;color:#6e6e73">${address}</p>
</div></body></html>`,
  };
}

/**
 * Sends the sign-in code. Production: Resend's API (no SDK, one request). Dev: printed in the terminal.
 * Throws when sending fails. auth.ts turns that into an error for the sign-in screen (Better Auth itself would
 * swallow it).
 */
export async function sendCode(to: string, code: string) {
  if (!isProduction) {
    console.log(`\n  Sign in code for ${to}: ${code}\n`);
    return;
  }
  const { RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO } = env("mail");
  const mail = codeEmail(code);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], reply_to: MAIL_REPLY_TO, ...mail }),
    signal: AbortSignal.timeout(10_000), // a hung Resend must not leave the button on "Sending" forever
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: the sign-in email didn't go out`);
}
