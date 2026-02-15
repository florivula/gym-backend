import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.exerciseSet.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.gymSession.deleteMany();
  await prisma.foodEntry.deleteMany();
  await prisma.weight.deleteMany();

  // Seed weight entries (past 7 days)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    await prisma.weight.create({
      data: {
        weight: 82.5 - i * 0.1,
        date,
      },
    });
  }

  // Seed food entries for today
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  await prisma.foodEntry.createMany({
    data: [
      { name: "Oatmeal with banana", calories: 350, protein: 12, date: todayDate, time: "08:00" },
      { name: "Chicken breast with rice", calories: 550, protein: 45, date: todayDate, time: "12:30" },
      { name: "Protein shake", calories: 200, protein: 30, date: todayDate, time: "15:00" },
      { name: "Salmon with vegetables", calories: 480, protein: 38, date: todayDate, time: "19:00" },
    ],
  });

  // Seed a completed gym session
  const session = await prisma.gymSession.create({
    data: {
      plan: "PPL",
      dayType: "Push",
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      completedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      isActive: false,
      exercises: {
        create: [
          {
            name: "Bench Press",
            sets: {
              create: [
                { weight: 80, reps: 8, setNumber: 1 },
                { weight: 85, reps: 6, setNumber: 2 },
                { weight: 85, reps: 5, setNumber: 3 },
              ],
            },
          },
          {
            name: "Overhead Press",
            sets: {
              create: [
                { weight: 50, reps: 10, setNumber: 1 },
                { weight: 55, reps: 8, setNumber: 2 },
                { weight: 55, reps: 7, setNumber: 3 },
              ],
            },
          },
          {
            name: "Tricep Pushdown",
            sets: {
              create: [
                { weight: 25, reps: 12, setNumber: 1 },
                { weight: 27.5, reps: 10, setNumber: 2 },
                { weight: 27.5, reps: 10, setNumber: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seed complete:", {
    weights: 7,
    foodEntries: 4,
    sessions: 1,
    sessionId: session.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
