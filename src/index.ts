import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema.ts";
import { connectRedis } from "./utills/redis.ts";
import { connectRabbitMQ } from "./utills/rabbitmq.ts";

const db = drizzle(process.env.DATABASE_URL!, { schema });

// Connect to Redis and RabbitMQ
(async () => {
  await connectRedis();
  await connectRabbitMQ();
})();

export default db;
