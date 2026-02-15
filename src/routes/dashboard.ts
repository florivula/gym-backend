import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /dashboard/kpi - Key performance indicators
router.get("/kpi", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [latestWeight, todayFood, weekSessions] = await Promise.all([
    prisma.weight.findFirst({ orderBy: { date: "desc" } }),
    prisma.foodEntry.aggregate({
      where: { date: today },
      _sum: { calories: true, protein: true },
    }),
    prisma.gymSession.count({
      where: { startedAt: { gte: weekAgo }, isActive: false },
    }),
  ]);

  res.json({
    currentWeight: latestWeight?.weight ?? null,
    todayCalories: todayFood._sum.calories ?? 0,
    todayProtein: todayFood._sum.protein ?? 0,
    weekSessionCount: weekSessions,
  });
});

// GET /dashboard/calendar/:year/:month - Calendar heatmap data for a month
router.get("/calendar/:year/:month", async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const [weights, foodDays, sessions] = await Promise.all([
    prisma.weight.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, weight: true },
    }),
    prisma.foodEntry.groupBy({
      by: ["date"],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { calories: true, protein: true },
      _count: true,
    }),
    prisma.gymSession.findMany({
      where: {
        startedAt: { gte: startDate, lte: new Date(year, month, 0, 23, 59, 59) },
        isActive: false,
      },
      select: { startedAt: true, plan: true, dayType: true },
    }),
  ]);

  res.json({
    year,
    month,
    weights: weights.map((w) => ({
      date: w.date.toISOString().split("T")[0],
      weight: w.weight,
    })),
    food: foodDays.map((f) => ({
      date: f.date.toISOString().split("T")[0],
      totalCalories: f._sum.calories ?? 0,
      totalProtein: f._sum.protein ?? 0,
      entryCount: f._count,
    })),
    sessions: sessions.map((s) => ({
      date: s.startedAt.toISOString().split("T")[0],
      plan: s.plan,
      dayType: s.dayType,
    })),
  });
});

export default router;
