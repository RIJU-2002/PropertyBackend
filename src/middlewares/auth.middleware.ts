import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ============================================================
// TYPES
// ============================================================

interface JwtPayload {
  id:   number;
  role: string;
}

// Extend Express Request so req.user is typed everywhere
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ============================================================
// PROTECT — blocks request if no valid JWT
// Use on routes that always require login
// e.g. router.post("/", protect, createProperty)
// ============================================================

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // JWT comes in header:  Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided — please log in",
      });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    req.user = decoded; // ← this is what sets req.user in your controllers
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired — please log in again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token — please log in",
    });
  }
};

// ============================================================
// OPTIONAL AUTH — attaches user if token exists, but doesn't
// block the request if missing. Use on routes that work for
// both guests and logged-in users (e.g. GET /properties)
// ============================================================

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token   = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      req.user = decoded;
    }
  } catch (_) {
    // Token invalid or missing — fine, just continue as guest
  }

  next();
};

// ============================================================
// ADMIN ONLY — use after protect
// e.g. router.delete("/:id", protect, adminOnly, deleteUser)
// ============================================================

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};