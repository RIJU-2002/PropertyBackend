import { Router } from "express";
import { handleSendOtp, handleVerifyOtp, handleGetMe } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import rateLimit from "express-rate-limit";

const router = Router();
// Strict limiter — auth routes only
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max:      10,               // only 10 OTP attempts per 10 mins
  message:  { success: false, message: "Too many OTP attempts, please wait" },

  skip: () => process.env.NODE_ENV === "test",
});
// Public routes — no JWT needed
router.post("/send-otp",     authLimiter,handleSendOtp);    // POST /auth/send-otp
router.post("/verify-otp",  authLimiter,handleVerifyOtp);  // POST /auth/verify-otp

// Protected route — JWT required
router.get("/me", protect, handleGetMe);       // GET  /auth/me

export default router;