// ============================================================
// SMS SERVICE
// Swap the mock implementation for real MSG91 when ready
// ============================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const sendSms = async (
  phone: string,
  otp: string
): Promise<void> => {

  // ── MOCK (development) ────────────────────────────────────
  if (!IS_PRODUCTION) {
    console.log(`\n📱 [MOCK SMS] → ${phone}`);
    console.log(`   OTP: ${otp}\n`);
    return;
  }

  // ── REAL MSG91 (production) ───────────────────────────────
  // 1. Sign up at msg91.com
  // 2. Create a template with {{otp}} variable
  // 3. Set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in your .env

  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authkey": process.env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile:      `91${phone}`,   // prefix with country code
      otp,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("MSG91 error:", err);
    throw new Error("SMS_SEND_FAILED");
  }
};