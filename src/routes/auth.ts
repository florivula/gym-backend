import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import type { JwtPayload } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

// POST /auth/register
router.post("/register", validate(registerSchema), async (req, res) => {
  const { username, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email: `${username}@local`, passwordHash },
  });

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// POST /auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// GET /auth/me
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      dailyCalorieGoal: true,
      dailyProteinGoal: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// PUT /auth/profile
const profileSchema = z.object({
  dailyCalorieGoal: z.number().int().positive().nullable().optional(),
  dailyProteinGoal: z.number().int().positive().nullable().optional(),
});

router.put("/profile", authenticate, validate(profileSchema), async (req, res) => {
  const { dailyCalorieGoal, dailyProteinGoal } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...(dailyCalorieGoal !== undefined && { dailyCalorieGoal }),
      ...(dailyProteinGoal !== undefined && { dailyProteinGoal }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      dailyCalorieGoal: true,
      dailyProteinGoal: true,
    },
  });

  res.json(user);
});

export default router;
