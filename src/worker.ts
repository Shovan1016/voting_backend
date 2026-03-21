import "dotenv/config";
import * as amqp from "amqplib";
import { createClient } from "redis";
import db from "./index.ts";
import { votesTable } from "./db/schemas/votes.schema.ts";

const START_WORKER = async () => {
  try {
    // 1. Connect to Redis
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => console.log("Worker Redis Error", err));
    await redisClient.connect();
    console.log("🔴 Worker connected to Redis");

    // 2. Connect to RabbitMQ
    const rmqUrl = process.env.RABBITMQ_URL || "amqp://localhost";
    const connection = await amqp.connect(rmqUrl);
    const channel = await connection.createChannel();
    
    const queue = "votes.incoming";
    await channel.assertQueue(queue, { durable: true });
    // channel.prefetch(1); // Optional: Process 1 message at a time

    console.log("🐰 Worker connected to RabbitMQ. Waiting for messages...");

    // 3. Consume messages
    channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const { pollId, optionId, userId, voteId } = content;

          console.log(`Processing vote ${voteId} for poll ${pollId}`);

          // a. Insert into votes table using Drizzle
          await db.insert(votesTable).values({
            id: voteId,
            pollId,
            optionId,
            userId,
          });

          // b. Increment Redis vote count
          const hashKey = `poll:${pollId}`;
          const optionKey = `option_${optionId}`;
          await redisClient.hIncrBy(hashKey, optionKey, 1);

          // c. Fetch fresh totals
          const rawTotals = await redisClient.hGetAll(hashKey);
          
          // Fetch poll options from Postgres to build the full payload
          const { eq } = await import("drizzle-orm");
          const { pollOptionsTable } = await import("./db/schemas/options.schema.ts");

          const optionsList = await db
            .select({
              id: pollOptionsTable.id,
              text: pollOptionsTable.option,
            })
            .from(pollOptionsTable)
            .where(eq(pollOptionsTable.pollId, pollId));

          let total = 0;
          const options = optionsList.map((opt: any) => {
            const votes = parseInt(rawTotals[`option_${opt.id}`] || "0", 10);
            total += votes;
            return {
              id: opt.id,
              text: opt.text,
              votes
            };
          });

          // d. Broadcast using HTTP POST
          const apiUrl = `http://localhost:${process.env.APP_PORT || 3000}/polls/internal/broadcast`;
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ pollId, options, total }),
          });

          console.log(`Broadcasting vote update for poll ${pollId} via API:`, { total });

          // e. Acknowledge message
          channel.ack(msg);
        } catch (error) {
          console.error("Worker Error processing message:", error);
          // Only reject if it's NOT a duplicate vote error (maybe check Postgres error code 23505)
          // If it's a structural error, you might want to reject and DLQ it, but we ack for simplicity now to avoid blocking
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error("Worker failed to start:", error);
  }
};

START_WORKER();
