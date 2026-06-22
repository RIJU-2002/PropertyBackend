import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import swaggerUi             from "swagger-ui-express";
import { swaggerSpec }       from "./swagger/swagger.config";



import propertyRoutes from "./routes/property.routes";
import authRoutes from "./routes/auth.routes";
import uploadRoutes from "./routes/upload.routes";
import cityRoutes from "./routes/city.routes";
import leadRoutes from "./routes/lead.routes";
import projectRoutes from "./routes/project.routes";
import userRoutes from "./routes/user.routes";
import localityRoutes from "./routes/locality.routes";
import states from "./routes/state.routes";
import amenityRoutes from "./routes/amenity.routes";
import geocodeRoutes from "./routes/geocode.routes";


const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

app.use(helmet());

app.use(cors({
  origin: "*", // change in production frontend URL
  credentials: true,
}));

// ============================================================
// BODY PARSER
// ============================================================

app.use(express.json());

// ============================================================
// RATE LIMITER
// ============================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

app.use(globalLimiter);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (_req, res) => {
  res.send("API running...");
});


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "PropTiger Clone API",
  swaggerOptions: {
    persistAuthorization: true,  // keeps JWT token between page refreshes
  },
}));

// Optional — expose raw JSON spec for tools like Postman import
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
// ============================================================
// ROUTES
// ============================================================

app.use("/properties", propertyRoutes);
app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);
app.use("/cities", cityRoutes);
app.use("/lead", leadRoutes);
app.use("/projects", projectRoutes);
app.use("/users", userRoutes);
app.use("/locality", localityRoutes);
app.use("/states",states )
app.use("/amenities", amenityRoutes);
app.use("/geo", geocodeRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;