import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { validate } from "../middleware/validate";

const router = Router();

const startSessionSchema = z.object({
  plan: z.string().min(1).max(50),
  dayType: z.string().min(1).max(50),
});

const addExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  sets: z.array(
    z.object({
      weight: z.number().nonnegative().max(9999),
      reps: z.number().int().positive(),
      setNumber: z.number().int().positive(),
    })
  ),
});

// POST /sessions/start - Start a new gym session
router.post("/start", validate(startSessionSchema), async (req, res) => {
  const session = await prisma.gymSession.create({
    data: {
      plan: req.body.plan,
      dayType: req.body.dayType,
    },
    include: { exercises: { include: { sets: true } } },
  });
  res.status(201).json(session);
});

// POST /sessions/:id/exercise - Add an exercise with sets to a session
router.post("/:id/exercise", validate(addExerciseSchema), async (req, res) => {
  const sessionId = Number(req.params.id);
  const exercise = await prisma.exercise.create({
    data: {
      sessionId,
      name: req.body.name,
      sets: {
        create: req.body.sets.map(
          (s: { weight: number; reps: number; setNumber: number }) => ({
            weight: s.weight,
            reps: s.reps,
            setNumber: s.setNumber,
          })
        ),
      },
    },
    include: { sets: true },
  });
  res.status(201).json(exercise);
});

// POST /sessions/:id/complete - Mark a session as completed
router.post("/:id/complete", async (req, res) => {
  const session = await prisma.gymSession.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false, completedAt: new Date() },
    include: { exercises: { include: { sets: true } } },
  });
  res.json(session);
});

// GET /sessions - List sessions (paginated: ?page=1&limit=10)
router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.gymSession.findMany({
      skip,
      take: limit,
      orderBy: { startedAt: "desc" },
      include: { exercises: { include: { sets: true } } },
    }),
    prisma.gymSession.count(),
  ]);

  res.json({ data: sessions, page, limit, total });
});

// GET /sessions/latest - Get the most recent completed session
router.get("/latest", async (_req, res) => {
  const session = await prisma.gymSession.findFirst({
    where: { isActive: false },
    orderBy: { completedAt: "desc" },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) {
    res.status(404).json({ error: "No completed sessions found" });
    return;
  }
  res.json(session);
});

// GET /sessions/active - Get the currently active session
router.get("/active", async (_req, res) => {
  const session = await prisma.gymSession.findFirst({
    where: { isActive: true },
    orderBy: { startedAt: "desc" },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) {
    res.status(404).json({ error: "No active session" });
    return;
  }
  res.json(session);
});

// GET /sessions/stats/week - Get session count and total exercises for the past 7 days
router.get("/stats/week", async (_req, res) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sessions = await prisma.gymSession.findMany({
    where: { startedAt: { gte: weekAgo }, isActive: false },
    include: { _count: { select: { exercises: true } } },
  });

  const totalExercises = sessions.reduce(
    (sum, s) => sum + s._count.exercises,
    0
  );

  res.json({
    sessionCount: sessions.length,
    totalExercises,
    period: { from: weekAgo.toISOString(), to: new Date().toISOString() },
  });
});

// DELETE /sessions/:id - Delete a session and its exercises/sets (cascade)
router.delete("/:id", async (req, res) => {
  await prisma.gymSession.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
