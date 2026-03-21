import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { pollsTable } from "./polls.schema.ts";
import { pollOptionsTable } from "./options.schema.ts";
import { usersTable } from "./user.schema.ts";
// import { unique } from "drizzle-orm/gel-core";

export const votesTable = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: integer()
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    optionId: integer()
      .notNull()
      .references(() => pollOptionsTable.id, { onDelete: "cascade" }),
    userId: integer()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

  },
  (table) => ({
    uniqueVotePerPoll: unique("unique_vote_per_poll_per_user").on(
      table.pollId,
      table.userId,
    ),
    pollIdIndex: index("idx_votes_poll_id").on(table.pollId), 
    optionIdIndex: index("idx_votes_option_id").on(table.optionId),
  }),
);
