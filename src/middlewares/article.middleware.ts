import { RequestHandler } from "express";
import { z, ZodError } from "zod";

export const validate =
  (schema: z.ZodType): RequestHandler =>
  async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: err.issues.map((e) => ({
            field: e.path.slice(1).join("."),
            message: e.message,
          })),
        });
      }

      next(err);
    }
  };