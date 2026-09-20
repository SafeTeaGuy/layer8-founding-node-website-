/**
 * Transactional email (receipts, magic-link sign-in). No RESEND_API_KEY is
 * configured yet, so this never claims a send that didn't happen -- it
 * logs and returns NOT_SENT_NO_PROVIDER_CONFIGURED, the same way Phase 4's
 * licensing spec insists remote activation "must never report fake
 * success." Swap in the real Resend call once RESEND_API_KEY exists.
 */
export type SendResult = "sent" | "NOT_SENT_NO_PROVIDER_CONFIGURED";

export async function sendReceiptEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[notifications] RESEND_API_KEY not set -- not sending "${subject}" to ${to}`);
    return "NOT_SENT_NO_PROVIDER_CONFIGURED";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Layer8 <noreply@layer8.dev>",
      to,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    console.error(`[notifications] Resend send failed: ${res.status} ${await res.text()}`);
    return "NOT_SENT_NO_PROVIDER_CONFIGURED";
  }
  return "sent";
}
