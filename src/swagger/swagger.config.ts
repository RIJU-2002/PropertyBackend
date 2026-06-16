import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title:       "PropTiger Clone API",
      version:     "1.0.0",
      description: "Real estate portal API — properties, projects, cities, leads, auth",
      contact: {
        name:  "API Support",
        email: "support@yoursite.com",
      },
    },
    servers: [
      {
        url:         "http://localhost:5000",
        description: "Development server",
      },
      {
        url:         "https://your-api.railway.app",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         "http",
          scheme:       "bearer",
          bearerFormat: "JWT",
          description:  "Enter your JWT token from /auth/verify-otp",
        },
      },
      schemas: {
        // ── AUTH ──────────────────────────────────────────────
        SendOtpRequest: {
          type:     "object",
          required: ["phone"],
          properties: {
            phone: { type: "string", example: "9876543210", description: "10-digit Indian mobile number" },
          },
        },
        VerifyOtpRequest: {
          type:     "object",
          required: ["phone", "code"],
          properties: {
            phone: { type: "string", example: "9876543210" },
            code:  { type: "string", example: "123456", description: "6-digit OTP" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success:   { type: "boolean", example: true },
            token:     { type: "string",  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
            isNewUser: { type: "boolean", example: false },
            user: {
              type: "object",
              properties: {
                id:    { type: "integer", example: 1 },
                phone: { type: "string",  example: "+919876543210" },
                name:  { type: "string",  example: "Rahul Mohanty" },
                role:  { type: "string",  example: "BUYER" },
              },
            },
          },
        },
        // ── PROPERTY ──────────────────────────────────────────
        Property: {
          type: "object",
          properties: {
            id:              { type: "integer",  example: 1 },
            title:           { type: "string",   example: "3 BHK Flat for Sale in Patia" },
            slug:            { type: "string",   example: "3bhk-flat-patia-bhubaneswar-k7x2" },
            price:           { type: "string",   example: "8200000", description: "BigInt as string" },
            bhk:             { type: "integer",  example: 3 },
            bathrooms:       { type: "integer",  example: 2 },
            superArea:       { type: "number",   example: 1750 },
            listingType:     { type: "string",   enum: ["BUY", "RENT", "PG"] },
            propertyType:    { type: "string",   enum: ["APARTMENT", "VILLA", "PLOT", "INDEPENDENT_HOUSE"] },
            furnishingStatus:{ type: "string",   enum: ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"] },
            possessionStatus:{ type: "string",   enum: ["READY_TO_MOVE", "UNDER_CONSTRUCTION", "NEW_LAUNCH"] },
            isNegotiable:    { type: "boolean",  example: true },
            isVerified:      { type: "boolean",  example: true },
            isActive:        { type: "boolean",  example: true },
            latitude:        { type: "number",   example: 20.3541 },
            longitude:       { type: "number",   example: 85.8191 },
          },
        },
        // ── LEAD ──────────────────────────────────────────────
        SubmitLeadRequest: {
          type: "object",
          properties: {
            propertyId:    { type: "integer", example: 1 },
            projectId:     { type: "integer", example: 1 },
            guestName:     { type: "string",  example: "Amit Kumar" },
            guestPhone:    { type: "string",  example: "9876543210" },
            message:       { type: "string",  example: "Interested, please call me" },
            budget:        { type: "string",  example: "9000000" },
            bhkPreference: { type: "array",   items: { type: "integer" }, example: [2, 3] },
            source:        { type: "string",  example: "listing_page" },
          },
        },
        // ── ERROR ─────────────────────────────────────────────
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string",  example: "Something went wrong" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string",  example: "Operation successful" },
          },
        },
      },
    },
  },
  // ← Scans these files for @swagger JSDoc comments
  apis: ["./src/swagger/swagger.routes.ts"],
  // apis: [
  // "./src/routes/*.ts",
  // "./src/controllers/*.ts"
  //]
};

export const swaggerSpec = swaggerJsdoc(options);