import { Request, Response } from "express";
import { z } from "zod";
import { sendOtp, verifyOtp, getMe } from "../services/auth.service";

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  code: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

// ============================================================
// POST /auth/send-otp
// Body: { phone: "9876543210" }
// ============================================================

export const handleSendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);

    await sendOtp(phone);

    return res.json({
      success: true,
      message:
        process.env.NODE_ENV === "production"
          ? "OTP sent to your mobile number"
          : "OTP sent (dev mode: use 123456)",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    if (error.message === "SMS_SEND_FAILED") {
      return res.status(502).json({
        success: false,
        message: "Could not send OTP. Please try again.",
      });
    }

    console.error("SEND OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// ============================================================
// POST /auth/verify-otp
// Body: { phone: "9876543210", code: "123456" }
// ============================================================

export const handleVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body);

    const { token, user, isNewUser } = await verifyOtp(phone, code);

    return res.json({
      success:   true,
      message:   isNewUser ? "Account created successfully" : "Logged in successfully",
      isNewUser,
      token,
      user,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0].message,
      });
    }

    if (error.message === "INVALID_OTP") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    if (error.message === "USER_BANNED") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support.",
      });
    }

    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// ============================================================
// GET /auth/me  (protected — requires JWT)
// ============================================================

export const handleGetMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getMe(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};