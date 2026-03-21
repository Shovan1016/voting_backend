import { relations } from "drizzle-orm";
import { usersTable } from "./user.schema.ts";
import { pollsTable } from "./polls.schema.ts";
import { pollOptionsTable } from "./options.schema.ts";
import { votesTable } from "./votes.schema.ts";

export const usersRelations = relations(usersTable, ({ many }) => ({
  polls: many(pollsTable),
  votes: many(votesTable),
}));

export const pollsRelations = relations(pollsTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [pollsTable.createdBy],
    references: [usersTable.id],
  }),
  options: many(pollOptionsTable),
  votes: many(votesTable),
}));

export const pollOptionsRelations = relations(pollOptionsTable, ({ one, many }) => ({
  poll: one(pollsTable, {
    fields: [pollOptionsTable.pollId],
    references: [pollsTable.id],
  }),
  votes: many(votesTable),
}));

export const votesRelations = relations(votesTable, ({ one }) => ({
  poll: one(pollsTable, {
    fields: [votesTable.pollId],
    references: [pollsTable.id],
  }),
  option: one(pollOptionsTable, {
    fields: [votesTable.optionId],
    references: [pollOptionsTable.id],
  }),
  user: one(usersTable, {
    fields: [votesTable.userId],
    references: [usersTable.id],
  }),
}));