import { eq } from "drizzle-orm";
import { pollsTable } from "../db/schemas/polls.schema.ts";
import db from "../index.ts";
import { usersTable } from "../db/schemas/user.schema.ts";
import { pollOptionsTable } from "../db/schemas/options.schema.ts";
import { relations } from 'drizzle-orm';

export const createPool = async (payload: {
  question: string;
  notes: string;
  createdBy: number;
  closedAt: Date | null;
}) => {
  const newPool = await db
    .insert(pollsTable)
    .values({
      question: payload.question,
      notes: payload.notes,
      createdBy: payload.createdBy,
      closedAt: payload.closedAt,
    })
    .returning({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
    });

  return newPool;
};
export const updatePool = async (payload: {
  question: string;
  notes: string;
  closedAt: Date | null;
  pollId: number;
}) => {
  const updatedPool = await db
    .update(pollsTable)
    .set({
      question: payload.question,
      notes: payload.notes,
      closedAt: payload.closedAt,
    })
    .where(eq(pollsTable.id, payload.pollId))
    .returning({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
    });

  return updatedPool;
};
export const deletePool = async (id: number) => {
  const deletedPool = await db
    .delete(pollsTable)
    .where(eq(pollsTable.id, id))
    .returning({});

  return deletedPool;
};
export const poolStatusUpdate = async (id: number, status: boolean) => {
  const updatedPool = await db
    .update(pollsTable)
    .set({
      closed: status,
    })
    .where(eq(pollsTable.id, id))
    .returning({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
      closed: pollsTable.closed,
    });

  return updatedPool;
};

export const myPolls = async (userId: number) => {
  const pools = await db
    .select({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
      closed: pollsTable.closed,
    })
    .from(pollsTable)
    .where(eq(pollsTable.createdBy, userId));
  return pools;
};

export const publicPolls = async () => {
  const pools = await db
    .select({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
      closed: pollsTable.closed,
      creator: {
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      },
    })
    .from(pollsTable)
    .innerJoin(usersTable, eq(pollsTable.createdBy, usersTable.id))
    .where(eq(pollsTable.createdBy, usersTable.id));
  return pools;
};

export const findPollById = async (id: number) => {
  const [pool] = await db
    .select({
      id: pollsTable.id,
      question: pollsTable.question,
      notes: pollsTable.notes,
      closedAt: pollsTable.closedAt,
      createdBy: pollsTable.createdBy,
    })
    .from(pollsTable)
    .where(eq(pollsTable.id, id));
  return pool;
};


// export const getPollById = async (id: number) => {
//   const [pool] = await db
//     .select({
//       id: pollsTable.id,
//       question: pollsTable.question,
//       notes: pollsTable.notes,
//       closedAt: pollsTable.closedAt,
//       createdBy: pollsTable.createdBy,
//       options: {
//         id: pollOptionsTable.id,
//         optionText: pollOptionsTable.option,
//       },
//     })
//     .from(pollsTable).rightJoin(pollOptionsTable, eq(pollsTable.id, pollOptionsTable.pollId)).orderBy(pollOptionsTable.displayOrder, "asc")
//     .where(eq(pollsTable.id, id));
//   return pool;
// };



// In your polls schema file
export const pollsRelations = relations(pollsTable, ({ many }) => ({
  options: many(pollOptionsTable),
}));

// In your options schema file
export const pollOptionsRelations = relations(pollOptionsTable, ({ one }) => ({
  poll: one(pollsTable, {
    fields: [pollOptionsTable.pollId],
    references: [pollsTable.id],
  }),
}));

export const getPollById = async (id: number) => {
  return await db.query.pollsTable.findFirst({
    where: eq(pollsTable.id, id),
    with: {
      options: {
        orderBy: (options, { asc }) => [asc(options.displayOrder)],
      },
    },

  });
};