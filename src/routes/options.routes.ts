import express from "express";
import { authIsNeeded } from "../middlewares/auth.middleware.ts";
import { AppError } from "../utills/AppError.ts";
import {
  addOptionValidation,
  addMultipleOptionsValidation,
  updateOptionValidation,
} from "../validations/options.validation.ts";
import {
  addOption,
  addMultipleOptions,
  updateOption,
  deleteOption,
  getOptionsByPollId,
} from "../services/option.service.ts";
import { findPollById } from "../services/poll.service.ts";

const optionsRouter = express.Router();

optionsRouter.post(
  "/add-option/:pollId",
  authIsNeeded,
  async (req, res, next) => {
    const pollId = parseInt(req.params.pollId);
    if (isNaN(pollId)) return next(new AppError("Invalid poll ID", 400));

    const validationResult = await addOptionValidation.safeParseAsync(req.body);
    if (!validationResult.success) {
      return next(
        new AppError(
          validationResult.error?.issues[0].message ?? "Validation failed",
          400,
        ),
      );
    }

    const { id } = req.user!;
    const existingPoll = await findPollById(pollId);
    if (!existingPoll)
      return next(new AppError("Poll with this id does not exist", 404));
    if (existingPoll.createdBy !== id)
      return next(
        new AppError("You are not authorized to add options to this poll", 403),
      );

    const { option, displayOrder } = validationResult.data;
    const newOption = await addOption({ pollId, option, displayOrder });

    return res
      .status(201)
      .json({ message: "Option added successfully", option: newOption });
  },
);

optionsRouter.post(
  "/add-multiple-options/:pollId",
  authIsNeeded,
  async (req, res, next) => {
    const pollId = parseInt(req.params.pollId);
    if (isNaN(pollId)) return next(new AppError("Invalid poll ID", 400));

    const validationResult = await addMultipleOptionsValidation.safeParseAsync(
      req.body,
    );
    if (!validationResult.success) {
      return next(
        new AppError(
          validationResult.error?.issues[0].message ?? "Validation failed",
          400,
        ),
      );
    }

    const { id } = req.user!;
    const existingPoll = await findPollById(pollId);
    if (!existingPoll)
      return next(new AppError("Poll with this id does not exist", 404));
    if (existingPoll.createdBy !== id)
      return next(
        new AppError("You are not authorized to add options to this poll", 403),
      );

    const { options } = validationResult.data;
    const newOptions = await addMultipleOptions(pollId, options);

    return res
      .status(201)
      .json({ message: "Options added successfully", options: newOptions });
  },
);

optionsRouter.post(
  "/update-option/poll/:pollId/option/:optionId",
  authIsNeeded,
  async (req, res, next) => {
    const pollId = parseInt(req.params.pollId);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(pollId) || isNaN(optionId))
      return next(new AppError("Invalid poll ID or option ID", 400));

    const validationResult = await updateOptionValidation.safeParseAsync(
      req.body,
    );
    if (!validationResult.success) {
      return next(
        new AppError(
          validationResult.error?.issues[0].message ?? "Validation failed",
          400,
        ),
      );
    }

    const { id } = req.user!;
    const existingPoll = await findPollById(pollId);
    if (!existingPoll)
      return next(new AppError("Poll with this id does not exist", 404));
    if (existingPoll.createdBy !== id)
      return next(
        new AppError(
          "You are not authorized to update options in this poll",
          403,
        ),
      );

    const updatedOption = await updateOption(
      pollId,
      optionId,
      validationResult.data,
    );
    if (!updatedOption) return next(new AppError("Option not found", 404));

    return res
      .status(200)
      .json({ message: "Option updated successfully", option: updatedOption });
  },
);

optionsRouter.delete(
  "/poll/:pollId/option/:optionId",
  authIsNeeded,
  async (req, res, next) => {
    const pollId = parseInt(req.params.pollId);
    const optionId = parseInt(req.params.optionId);
    if (isNaN(pollId) || isNaN(optionId))
      return next(new AppError("Invalid poll ID or option ID", 400));

    const { id } = req.user!;
    const existingPoll = await findPollById(pollId);
    if (!existingPoll)
      return next(new AppError("Poll with this id does not exist", 404));
    if (existingPoll.createdBy !== id)
      return next(
        new AppError(
          "You are not authorized to delete options from this poll",
          403,
        ),
      );

    const deleted = await deleteOption(pollId, optionId);
    if (!deleted) return next(new AppError("Option not found", 404));

    return res
      .status(200)
      .json({ message: "Option deleted successfully", deletedId: deleted.id });
  },
);

optionsRouter.get(
  "/options/poll/:pollId",
  authIsNeeded,
  async (req, res, next) => {
    const pollId = parseInt(req.params.pollId);
    if (isNaN(pollId)) return next(new AppError("Invalid poll ID", 400));

    // Only checks existence here — any authenticated user can read a poll's options
    const existingPoll = await findPollById(pollId);
    if (!existingPoll)
      return next(new AppError("Poll with this id does not exist", 404));

    const options = await getOptionsByPollId(pollId);

    return res
      .status(200)
      .json({ message: "Options fetched successfully", options });
  },
);

export { optionsRouter };
