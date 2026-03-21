import { and, eq } from "drizzle-orm";
import { pollOptionsTable } from "../db/schemas/options.schema.ts";
import db from "../index.ts";

export const addOption = async (payload: {
  pollId: number;
  option: string;
  displayOrder: number;
}) => {
  const newOption = await db
    .insert(pollOptionsTable)
    .values({
      pollId: payload.pollId,
      option: payload.option,
      displayOrder: payload.displayOrder,
    })
    .returning({
      id: pollOptionsTable.id,
      pollId: pollOptionsTable.pollId,
      option: pollOptionsTable.option,
      displayOrder: pollOptionsTable.displayOrder,
      createdAt: pollOptionsTable.createdAt,
    });

  return newOption[0];
};

export const addMultipleOptions = async (
  pollId: number,
  options: { option: string; displayOrder: number }[],
) => {
  const payload = options.map((opt) => ({
    pollId,
    option: opt.option,
    displayOrder: opt.displayOrder,
  }));

  const newOptions = await db
    .insert(pollOptionsTable)
    .values(payload)
    .returning({
      id: pollOptionsTable.id,
      pollId: pollOptionsTable.pollId,
      option: pollOptionsTable.option,
      displayOrder: pollOptionsTable.displayOrder,
      createdAt: pollOptionsTable.createdAt,
    });

  return newOptions;
};

export const updateOption = async (
  pollId: number,
  optionId: number,
  payload: { option?: string; displayOrder?: number },
) => {
  const updated = await db
    .update(pollOptionsTable)
    .set({
      ...payload,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pollOptionsTable.id, optionId),
        eq(pollOptionsTable.pollId, pollId),
      ),
    )
    .returning({
      id: pollOptionsTable.id,
      pollId: pollOptionsTable.pollId,
      option: pollOptionsTable.option,
      displayOrder: pollOptionsTable.displayOrder,
      updatedAt: pollOptionsTable.updatedAt,
    });

  return updated[0] ?? null;
};

export const deleteOption = async (pollId: number, optionId: number) => {
  const deleted = await db
    .delete(pollOptionsTable)
    .where(
      and(
        eq(pollOptionsTable.id, optionId),
        eq(pollOptionsTable.pollId, pollId),
      ),
    )
    .returning({ id: pollOptionsTable.id });

  return deleted[0] ?? null;
};

export const getOptionsByPollId = async (pollId: number) => {
  const options = await db
    .select({
      id: pollOptionsTable.id,
      pollId: pollOptionsTable.pollId,
      option: pollOptionsTable.option,
      displayOrder: pollOptionsTable.displayOrder,
      createdAt: pollOptionsTable.createdAt,
    })
    .from(pollOptionsTable)
    .where(eq(pollOptionsTable.pollId, pollId));

  return options;
};