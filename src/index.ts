import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema.ts";
import { connectRedis } from "./utills/redis.ts";
import { connectRabbitMQ } from "./utills/rabbitmq.ts";



const db = drizzle(process.env.DATABASE_URL!, { schema });

// Connect to Redis and RabbitMQ
(async () => {
  try {
    await connectRedis();
  } catch (err) {
    console.error("Failed to connect to Redis on startup:", err);
  }

  try {
    await connectRabbitMQ();
  } catch (err) {
    console.error("Failed to connect to RabbitMQ on startup:", err);
  }
})();

export default db;
