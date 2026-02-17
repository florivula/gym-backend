import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /public/kpi - Public KPIs
router.get("/kpi", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [latestWeight, todayFood, weekSessions] = await Promise.all([
    prisma.weight.findFirst({ orderBy: { date: "desc" } }),
    prisma.foodEntry.aggregate({
      where: { date: today },
      _sum: { calories: true },
    }),
    prisma.gymSession.count({
      where: { startedAt: { gte: weekAgo }, isActive: false },
    }),
  ]);

  res.json({
    currentWeight: latestWeight?.weight ?? null,
    todayCalories: todayFood._sum.calories ?? 0,
    weekSessionCount: weekSessions,
  });
});

// GET /public/weight - All weight entries (read-only)
router.get("/weight", async (_req, res) => {
  const entries = await prisma.weight.findMany({
    orderBy: { date: "asc" },
    select: { id: true, weight: true, date: true },
  });
  res.json(entries);
});

// GET /public/sessions - Completed sessions (paginated)
router.get("/sessions", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const where = { isActive: false };

  const [sessions, total] = await Promise.all([
    prisma.gymSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: "desc" },
      include: { exercises: { include: { sets: true } } },
    }),
    prisma.gymSession.count({ where }),
  ]);

  res.json({ data: sessions, page, limit, total });
});

// GET /public/calendar/:year/:month - Calendar data (no food detail)
router.get("/calendar/:year/:month", async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [weights, sessions] = await Promise.all([
    prisma.weight.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, weight: true },
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
    sessions: sessions.map((s) => ({
      date: s.startedAt.toISOString().split("T")[0],
      plan: s.plan,
      dayType: s.dayType,
    })),
  });
});

export default router;
