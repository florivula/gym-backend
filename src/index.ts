import "dotenv/config";
import express from "express";
import cors from "cors";
import weightRouter from "./routes/weight";
import foodRouter from "./routes/food";
import sessionsRouter from "./routes/sessions";
import dashboardRouter from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/weight", weightRouter);
app.use("/food", foodRouter);
app.use("/sessions", sessionsRouter);
app.use("/dashboard", dashboardRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
