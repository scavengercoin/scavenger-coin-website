import { Resend } from "resend";

const NOTIFY_TO = "scavengercoin@gmail.com";

export async function sendClaimNotification(details: {
  code: string;
  week: string | null;
  wallet: string;
  amount: number;
  txSignature: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set — skipping claim notification email");
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Scavenger Coin <onboarding@resend.dev>";

  try {
    // The SDK resolves with { data, error } instead of throwing on API-level
    // failures (bad recipient, restricted key, etc.) — both must be checked,
    // or a rejected send looks identical to a successful one in the logs.
    const { data, error } = await resend.emails.send({
      from,
      to: NOTIFY_TO,
      subject: `SCAV claimed — coin ${details.code}`,
      text: [
        `A coin was just claimed.`,
        ``,
        `Coin code: ${details.code}`,
        `Week: ${details.week ?? "n/a"}`,
        `Finder wallet: ${details.wallet}`,
        `Amount: ${details.amount.toLocaleString()} SCAV`,
        `Tx signature: ${details.txSignature}`,
        `Explorer: https://explorer.solana.com/tx/${details.txSignature}`,
      ].join("\n"),
    });
    if (error) {
      console.error("Resend rejected the claim notification email:", error);
    } else {
      console.log("Claim notification email sent:", data?.id);
    }
  } catch (err) {
    // Never let a notification failure block the claim itself — but always log so it's visible.
    console.error("Failed to send claim notification email:", err);
  }
}
