import express from "express";
import db from "../index.ts";
import { sql } from "drizzle-orm";
import { redisClient } from "../utills/redis.ts";
import { getChannel } from "../utills/rabbitmq.ts";

const healthRouter = express.Router();

healthRouter.get("/", async (req, res) => {
  let dbStatus = "down";
  let redisStatus = "down";
  let rabbitmqStatus = "down";

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch (e) {
    console.error("Healthcheck: DB failed", e);
  }

  try {
    if (redisClient && redisClient.isOpen) {
      // Light ping check
      await redisClient.ping();
      redisStatus = "ok";
    }
  } catch (e) {
    console.error("Healthcheck: Redis failed", e);
  }

  try {
    const channel = getChannel();
    if (channel) {
      rabbitmqStatus = "ok";
    }
  } catch (e) {
    console.error("Healthcheck: RabbitMQ failed", e);
  }

  const overallStatus =
    dbStatus === "ok" && redisStatus === "ok" && rabbitmqStatus === "ok"
      ? "healthy"
      : "degraded";

  return res.status(overallStatus === "healthy" ? 200 : 503).json({
    status: overallStatus,
    services: {
      database: dbStatus,
      redis: redisStatus,
      rabbitmq: rabbitmqStatus,
    },
    timestamp: new Date().toISOString()
  });
});

export default healthRouter;
