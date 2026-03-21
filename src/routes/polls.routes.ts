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

const pollsRouter = express.Router();

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
  const pool = await getPollById(Number(req.params.id));
  return res.json({ message: "Pool retrieved successfully", pool });
});

export { pollsRouter };
