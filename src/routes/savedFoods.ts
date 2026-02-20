import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { validate } from "../middleware/validate";

const router = Router();

const savedFoodSchema = z.object({
  name: z.string().min(1).max(200),
  calories: z.number().int().nonnegative(),
  protein: z.number().nonnegative().max(999),
});

const addToTodaySchema = z.object({
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .optional(),
});

// POST /saved-foods - Create a saved food
router.post("/", validate(savedFoodSchema), async (req, res) => {
  const savedFood = await prisma.savedFood.create({
    data: {
      name: req.body.name,
      calories: req.body.calories,
      protein: req.body.protein,
    },
  });
  res.status(201).json(savedFood);
});

// GET /saved-foods - List all saved foods
router.get("/", async (_req, res) => {
  const savedFoods = await prisma.savedFood.findMany({
    orderBy: { name: "asc" },
  });
  res.json(savedFoods);
});

// DELETE /saved-foods/:id - Delete a saved food
router.delete("/:id", async (req, res) => {
  await prisma.savedFood.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// POST /saved-foods/:id/add-to-today - Quick-add to today's food entries
router.post("/:id/add-to-today", validate(addToTodaySchema), async (req, res) => {
  const savedFood = await prisma.savedFood.findUniqueOrThrow({
    where: { id: Number(req.params.id) },
  });

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const time =
    req.body.time ??
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const entry = await prisma.foodEntry.create({
    data: {
      name: savedFood.name,
      calories: savedFood.calories,
      protein: savedFood.protein,
      date: today,
      time,
    },
  });
  res.status(201).json(entry);
});

export default router;
