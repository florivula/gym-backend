import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { validate } from "../middleware/validate";

const router = Router();

const weightSchema = z.object({
  weight: z.number().positive().max(999),
  date: z.string().date(),
});

// POST /weight - Log a weight entry
router.post("/", validate(weightSchema), async (req, res) => {
  const entry = await prisma.weight.create({
    data: {
      weight: req.body.weight,
      date: new Date(req.body.date),
    },
  });
  res.status(201).json(entry);
});

// GET /weight - List weight entries (optional ?from=&to= date range)
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  const where: Record<string, unknown> = {};

  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }

  const entries = await prisma.weight.findMany({
    where,
    orderBy: { date: "desc" },
  });
  res.json(entries);
});

// GET /weight/latest - Get most recent weight entry
router.get("/latest", async (_req, res) => {
  const entry = await prisma.weight.findFirst({
    orderBy: { date: "desc" },
  });
  if (!entry) {
    res.status(404).json({ error: "No weight entries found" });
    return;
  }
  res.json(entry);
});

// DELETE /weight/:id - Delete a weight entry
router.delete("/:id", async (req, res) => {
  await prisma.weight.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
