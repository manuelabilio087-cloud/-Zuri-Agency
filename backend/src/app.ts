import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "@/config/env";
import { authRoutes } from "@/modules/auth/auth.routes";
import { companiesRoutes } from "@/modules/companies/companies.routes";
import { leadsRoutes } from "@/modules/leads/leads.routes";
import { aiRoutes } from "@/modules/ai/ai.routes";
import { adminRoutes } from "@/modules/admin/admin.routes";
import { errorHandler } from "@/middlewares/error-handler.middleware";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.isProduction ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);
