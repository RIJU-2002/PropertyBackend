const isTest = process.env.NODE_ENV === "test";

const provider = (process.env.SMS_PROVIDER || "fast2sms").toLowerCase();

export const isDummyOtp = () =>
  isTest ||
  process.env.OTP_DUMMY === "true" ||
  process.env.OTP_DUMMY === "1";

const toTenDigit = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const toIndiaMobile = (phone: string) => `91${toTenDigit(phone)}`;

export const sendSms = async (phone: string, otp: string): Promise<void> => {
  if (isDummyOtp()) {
    console.log(`\n📱 [DUMMY OTP] ${phone} → ${otp} (set OTP_DUMMY=false to send real SMS)\n`);
    return;
  }

  const mobile = toTenDigit(phone);

  if (provider === "msg91") {
    await sendViaMsg91(mobile, otp);
    return;
  }

  if (provider === "twilio") {
    await sendViaTwilio(mobile, otp);
    return;
  }

  await sendViaFast2Sms(mobile, otp);
};

const sendViaFast2Sms = async (mobile: string, otp: string) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: mobile,
      flash: 0,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.return === false) {
    console.error("Fast2SMS error:", payload);
    throw new Error("SMS_SEND_FAILED");
  }
};

const sendViaMsg91 = async (mobile: string, otp: string) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile: toIndiaMobile(mobile),
      otp,
      otp_expiry: 10,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("MSG91 error:", err);
    throw new Error("SMS_SEND_FAILED");
  }
};

const sendViaTwilio = async (mobile: string, otp: string) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const body = new URLSearchParams({
    To: `+${toIndiaMobile(mobile)}`,
    From: from,
    Body: `Your Samriddh Realty verification code is ${otp}. It expires in 10 minutes.`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Twilio error:", err);
    throw new Error("SMS_SEND_FAILED");
  }
};
