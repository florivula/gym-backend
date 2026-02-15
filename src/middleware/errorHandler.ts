import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.status(400).json({ error: "Database error", code: err.code });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
