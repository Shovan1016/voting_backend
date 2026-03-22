import express from "express";
import { authIsNeeded } from "../middlewares/auth.middleware.ts";
import { createPoolValidation } from "../validations/pool.validation.ts";
import { AppError } from "../utills/AppError.ts";
import {
  createPool,
  deletePool,
  findPollById,
  getPollById,
  myPolls,
  poolStatusUpdate,
  publicPolls,
  updatePool,
} from "../services/poll.service.ts";
import { redisClient } from "../utills/redis.ts";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const pollsRouter = express.Router();

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests from this IP, please try again after a minute" },
});

pollsRouter.post("/internal/broadcast", async (req, res, next) => {
  try {
    const internalSecret = req.headers["x-internal-secret"];
    if (internalSecret !== (process.env.INTERNAL_SECRET || "supersecret")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { pollId, options, total } = req.body;
    const io = req.app.get("io");
    if (io) {
      io.to(`poll:${pollId}`).emit("poll-update", { pollId, options, total });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

pollsRouter.post("/createPoll", authIsNeeded, async (req, res, next) => {
  const validationResult = await createPoolValidation.safeParseAsync(req.body);

  if (!validationResult.success) {
    return next(
      new AppError(
        validationResult.error?.issues[0].message ?? "Validation failed",
        400,
      ),
    );
  }

  const { question, notes, closedAt } = validationResult.data;
  const { id } = req.user!;

  const createPoolPayload = {
    question,
    notes: notes ?? "",
    createdBy: id,
    closedAt: closedAt ? new Date(closedAt) : null,
  };
  const newPool = await createPool(createPoolPayload);
  //   console.log("Create pool payload:", createPoolPayload);
  return res
    .status(201)
    .json({ message: "Poll created successfully", poll: newPool });
});

pollsRouter.post("/updatePool/:id", authIsNeeded, async (req, res, next) => {
  const validationResult = await createPoolValidation.safeParseAsync(req.body);

  if (!validationResult.success) {
    return next(
      new AppError(
        validationResult.error?.issues[0].message ?? "Validation failed",
        400,
      ),
    );
  }

  const { question, notes, closedAt } = validationResult.data;

  const { id } = req.user!;
  console.log(req.params.id, "Pool ID from params");
  const existingPool = await findPollById(Number(req.params.id));
  console.log("Existing pool:", existingPool);
  if (!existingPool) {
    return next(new AppError("Pool with this id does not exist", 404));
  } else if (existingPool?.createdBy !== id) {
    return next(
      new AppError("You are not authorized to update this pool", 403),
    );
  }

  const updatePoolPayload = {
    question: question ?? existingPool.question,
    notes: notes ?? existingPool.notes,
    closedAt: closedAt ? new Date(closedAt) : null,
    pollId: Number(req.params.id),
  };

  const modifiedPool = await updatePool(updatePoolPayload);
  return res.json({ message: "Pool updated successfully", pool: modifiedPool });
});

pollsRouter.delete("/deletePool/:id", authIsNeeded, async (req, res, next) => {
  const { id } = req.user!;

  const existingPool = await findPollById(Number(req.params.id));
  if (!existingPool) {
    return next(new AppError("Pool with this id does not exist", 404));
  } else if (existingPool?.createdBy !== id) {
    return next(
      new AppError("You are not authorized to delete this pool", 403),
    );
  }

  const deletedPool = await deletePool(Number(req.params.id));
  
  // Cleanup Redis
  await redisClient.del(`poll:${req.params.id}`);
  
  return res.json({ message: "Pool deleted successfully", pool: deletedPool });
});

pollsRouter.post(
  "/updatePoolStatus/:id",
  authIsNeeded,
  async (req, res, next) => {
    const { id } = req.user!;
    const { closed } = req.body;
    if (closed === undefined) {
      return next(new AppError("Status field is required", 400));
    }
    const existingPool = await findPollById(Number(req.params.id));
    if (!existingPool) {
      return next(new AppError("Pool with this id does not exist", 404));
    } else if (existingPool?.createdBy !== id) {
      return next(
        new AppError("You are not authorized to update this pool", 403),
      );
    }

    const updatedPool = await poolStatusUpdate(
      Number(req.params.id),
      Boolean(closed),
    );

    // If poll is closed -> Delete cache & broadcast
    if (closed) {
      await redisClient.del(`poll:${req.params.id}`);
      const io = req.app.get("io");
      if (io) {
        io.to(`poll:${req.params.id}`).emit("poll-closed", { pollId: Number(req.params.id) });
      }
    }

    return res.json({
      message: "Pool status updated successfully",
      pool: updatedPool,
    });
  },
);

pollsRouter.get("/myPolls", authIsNeeded, async (req, res, next) => {
  const { id } = req.user!;
  const myPools = await myPolls(id);
  return res.json({
    message: "My pools retrieved successfully",
    pools: myPools,
  });
});

pollsRouter.get("/publicPolls", authIsNeeded, async (req, res, next) => {
  // const { id } = req.user!;
  const myPools = await publicPolls();
  return res.json({
    message: "Public pools retrieved successfully",
    pools: myPools,
  });
});

pollsRouter.get("/getPoll/:id", authIsNeeded, async (req, res, next) => {
  try {
    const pollId = Number(req.params.id);
    const pool = await getPollById(pollId);
    
    if (!pool) {
      return next(new AppError("Pool not found", 404));
    }

    const hashKey = `poll:${pollId}`;
    let exists = false;
    let rawTotals: Record<string, string> = {};

    try {
      // Use truthy check since exists returns a number (1 or 0)
      if (await redisClient.exists(hashKey)) {
        exists = true;
        rawTotals = await redisClient.hGetAll(hashKey);
        console.log(`Cache HIT for poll ${pollId}`);
      }
    } catch (redisErr) {
      console.warn(`Redis GET failed for poll ${pollId}, falling back to PostgreSQL:`, redisErr);
      exists = false;
    }

    let totals: Record<string, number> = {};

    if (exists) {
      totals = Object.fromEntries(
        Object.entries(rawTotals).map(([k, v]) => [k, parseInt(v, 10)])
      );
    } else {
      console.log(`Cache MISS for poll ${pollId}`);
      const { sql } = await import("drizzle-orm");
      const db = (await import("../index.ts")).default;
      const { votesTable } = await import("../db/schemas/votes.schema.ts");

      // Query PostgreSQL count
      const voteCounts = await db
        .select({
          optionId: votesTable.optionId,
          count: sql<number>`cast(count(${votesTable.id}) as int)`,
        })
        .from(votesTable)
        .where(sql`${votesTable.pollId} = ${pollId}`)
        .groupBy(votesTable.optionId);

      // Initialize all options to 0
      pool.options.forEach((opt: any) => {
        totals[`option_${opt.id}`] = 0;
      });

      // Populate from Postgres
      voteCounts.forEach((vc) => {
        totals[`option_${vc.optionId}`] = vc.count;
      });

      // Prepare Redis HSET args as [key1, val1, key2, val2...] matching strings
      const hsetArgs: string[] = [];
      Object.entries(totals).forEach(([key, value]) => {
        hsetArgs.push(key, value.toString());
      });

      if (hsetArgs.length > 0) {
        try {
          await redisClient.hSet(hashKey, hsetArgs);
        } catch (redisErr) {
          console.warn(`Redis HSET failed for poll ${pollId}:`, redisErr);
        }
      }
    }

    return res.json({ message: "Pool retrieved successfully", pool, totals });
  } catch (error) {
    console.error("Redis Cache Aside Error:", error);
    next(error);
  }
});

pollsRouter.post("/:id/vote", authIsNeeded, voteLimiter, async (req, res, next) => {
  try {
    const pollId = Number(req.params.id);
    
    // Validate optionId is a number
    const voteSchema = z.object({ optionId: z.number() });
    const validationResult = voteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return next(new AppError(validationResult.error.issues[0].message, 400));
    }
    const { optionId } = validationResult.data;
    const userId = req.user!.id;

    // 1. Check if poll exists and is open, and option belongs to poll
    const existingPool = await getPollById(pollId);
    if (!existingPool) {
      return next(new AppError("Poll not found", 404));
    }

    if (existingPool.closed) {
      return next(new AppError("Poll is closed", 400));
    }

    const optionExists = existingPool.options.find((opt: any) => opt.id === optionId);
    if (!optionExists) {
      return next(new AppError("Option does not belong to this poll", 400));
    }

    // 2. Check for duplicate vote
    const { eq, and } = await import("drizzle-orm");
    const db = (await import("../index.ts")).default;
    const { votesTable } = await import("../db/schemas/votes.schema.ts");

    const existingVote = await db.query.votesTable.findFirst({
      where: and(eq(votesTable.pollId, pollId), eq(votesTable.userId, userId)),
    });

    if (existingVote) {
      return next(new AppError("You have already voted on this poll", 409));
    }

    // 3. Generate voteId & Publish to RabbitMQ
    const { v4: uuidv4 } = await import("uuid");
    const voteId = uuidv4();
    
    const { publishVote } = await import("../utills/rabbitmq.ts");
    await publishVote({
      pollId,
      optionId,
      userId,
      voteId,
    });

    // 4. Return 202 Accepted
    return res.status(202).json({
      message: "Vote queued successfully",
      voteId,
    });
  } catch (error) {
    console.error("Vote error:", error);
    next(error);
  }
});

pollsRouter.get("/:id/myVote", authIsNeeded, async (req, res, next) => {
  try {
    const pollId = Number(req.params.id);
    const userId = req.user!.id;

    const { eq, and } = await import("drizzle-orm");
    const db = (await import("../index.ts")).default;
    const { votesTable } = await import("../db/schemas/votes.schema.ts");

    const existingVote = await db.query.votesTable.findFirst({
      where: and(eq(votesTable.pollId, pollId), eq(votesTable.userId, userId)),
    });

    if (!existingVote) {
      return res.status(200).json({
        voted: false,
        optionId: null,
      });
    }

    return res.status(200).json({
      voted: true,
      optionId: existingVote.optionId,
    });
  } catch (error) {
    console.error("myVote error:", error);
    next(error);
  }
});

export { pollsRouter };

