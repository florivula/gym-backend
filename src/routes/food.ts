import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { validate } from "../middleware/validate";

const router = Router();

const foodSchema = z.object({
  name: z.string().min(1).max(200),
  calories: z.number().int().nonnegative(),
  protein: z.number().nonnegative().max(999),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
});

// POST /food - Log a food entry
router.post("/", validate(foodSchema), async (req, res) => {
  const entry = await prisma.foodEntry.create({
    data: {
      name: req.body.name,
      calories: req.body.calories,
      protein: req.body.protein,
      date: new Date(req.body.date),
      time: req.body.time,
    },
  });
  res.status(201).json(entry);
});

// GET /food - List food entries (optional ?date= filter)
router.get("/", async (req, res) => {
  const { date } = req.query;
  const where: Record<string, unknown> = {};

  if (date) {
    where.date = new Date(date as string);
  }

  const entries = await prisma.foodEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json(entries);
});

// GET /food/today - Get today's food entries
router.get("/today", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = await prisma.foodEntry.findMany({
    where: { date: today },
    orderBy: { time: "asc" },
  });
  res.json(entries);
});

// GET /food/totals/:date - Get calorie/protein totals for a date
router.get("/totals/:date", async (req, res) => {
  const date = new Date(req.params.date);
  const result = await prisma.foodEntry.aggregate({
    where: { date },
    _sum: { calories: true, protein: true },
    _count: true,
  });
  res.json({
    date: req.params.date,
    totalCalories: result._sum.calories ?? 0,
    totalProtein: result._sum.protein ?? 0,
    entryCount: result._count,
  });
});

// DELETE /food/:id - Delete a food entry
router.delete("/:id", async (req, res) => {
  await prisma.foodEntry.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
