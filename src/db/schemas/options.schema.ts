import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { pollsTable } from "./polls.schema.ts";

export const pollOptionsTable = pgTable("poll_options", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  pollId: integer()
    .notNull()
    .references(() => pollsTable.id, { onDelete: "cascade" }),
  option: varchar({ length: 255 }).notNull(),
  displayOrder: integer().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
