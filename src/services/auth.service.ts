import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import { sendSms } from "./sms.service";

const OTP_EXPIRY_MINUTES = 10;
const JWT_EXPIRY          = "7d";

// ============================================================
// HELPERS
// ============================================================

const generateOtp = (): string => {
    console.log('OTP sending');
  // In development → always return 123456 so you never need SMS
  if (process.env.NODE_ENV !== "production") {
    return "123456";
  }
  // Production → random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId: number, role: string): string => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: JWT_EXPIRY }
  );
};

// ============================================================
// SEND OTP
// ============================================================

export const sendOtp = async (phone: string): Promise<void> => {
  // Invalidate any existing unused OTPs for this phone
  await prisma.otp.updateMany({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date() }, // expire them immediately
  });

  const code      = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Save OTP to database
  await prisma.otp.create({
    data: { phone, code, expiresAt },
  });

  // Send SMS (mock in dev, real in prod)
  await sendSms(phone, code);
};

// ============================================================
// VERIFY OTP
// ============================================================

export const verifyOtp = async (
  phone: string,
  code: string
): Promise<{ token: string; user: any; isNewUser: boolean }> => {

  // Find the latest valid unused OTP
  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      code,
      usedAt:    null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new Error("INVALID_OTP");
  }

  // Mark OTP as used
  await prisma.otp.update({
    where: { id: otp.id },
    data:  { usedAt: new Date() },
  });

  // Find or create user
  let isNewUser = false;

  let user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id:        true,
      phone:     true,
      name:      true,
      email:     true,
      role:      true,
      avatarUrl: true,
      isActive:  true,
    },
  });

  if (!user) {
    // First time login → create the user
    user = await prisma.user.create({
      data: { phone, role: "BUYER" },
      select: {
        id:        true,
        phone:     true,
        name:      true,
        email:     true,
        role:      true,
        avatarUrl: true,
        isActive:  true,
      },
    });
    isNewUser = true;
  }

  if (!user.isActive) {
    throw new Error("USER_BANNED");
  }

  const token = generateToken(user.id, user.role);

  return { token, user, isNewUser };
};

// ============================================================
// GET CURRENT USER (for /auth/me)
// ============================================================

export const getMe = async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:        true,
      phone:     true,
      name:      true,
      email:     true,
      role:      true,
      avatarUrl: true,
      createdAt: true,
    },
  });
};